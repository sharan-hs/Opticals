"""Order life cycle. Every status change goes through `_move`, which checks the
transition is allowed and writes the history row; stock moves happen in the
same transaction through the inventory service.

    UPI, delivered                         Pay at store, collected
    PENDING_PAYMENT (stock held)           PENDING_PAYMENT (stock held for N days)
      │ customer reports payment → VERIFYING   │
      │ shop confirms money arrived            │ shop: collected and paid
    CONFIRMED (stock sold)                 CONFIRMED → DELIVERED
    PROCESSING → SHIPPED → DELIVERED

Unpaid orders that run out of time are cancelled by `expire_due` and their
stock is released. Paid orders that are cancelled go back on the shelf and
wait for the shop to refund (REFUND_PENDING → REFUNDED).
"""

import logging
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.errors import AppError, ConflictError, NotFoundError
from app.models import Order, OrderStatusHistory, Payment, Refund, User
from app.models.enums import (
    FulfilmentMethod,
    OrderStatus,
    PaymentAttemptStatus,
    PaymentMethod,
    PaymentStatus,
    RefundStatus,
)
from app.modules.inventory import service as inventory
from app.modules.inventory.service import StockLine

logger = logging.getLogger(__name__)

S = OrderStatus

# to_status: statuses it may come from
ALLOWED: dict[OrderStatus, set[OrderStatus]] = {
    S.CONFIRMED: {S.PENDING_PAYMENT, S.CANCELLED},  # from CANCELLED: a late payment accepted
    S.PROCESSING: {S.CONFIRMED},
    S.SHIPPED: {S.PROCESSING},
    S.DELIVERED: {S.SHIPPED, S.CONFIRMED},  # from CONFIRMED: collected at the store
    S.CANCELLED: {S.PENDING_PAYMENT, S.CONFIRMED, S.PROCESSING},
}


class TransitionError(AppError):
    status_code = 409
    code = "INVALID_STATUS_CHANGE"


class DuplicateReferenceError(ConflictError):
    code = "DUPLICATE_REFERENCE"
    message = "This payment reference is already recorded for another order."


def now() -> datetime:
    return datetime.now(UTC)


def lines(order: Order) -> list[StockLine]:
    return [StockLine(item.variant_id, item.quantity) for item in order.items]


def load(db: Session, order_number: str, *, user: User | None = None, lock: bool = False) -> Order:
    """The order with items, history and payments. With `user`, someone
    else's order is reported as missing."""
    query = (
        select(Order)
        .where(Order.order_number == order_number)
        .options(
            selectinload(Order.items),
            selectinload(Order.status_history),
            selectinload(Order.payments),
        )
        .execution_options(populate_existing=True)
    )
    if user is not None:
        query = query.where(Order.user_id == user.id)
    if lock:
        query = query.with_for_update(of=Order)
    order = db.scalar(query)
    if order is None:
        raise NotFoundError("Order not found.")
    return order


def history(
    db: Session,
    order: Order,
    from_status: OrderStatus | None,
    to_status: OrderStatus,
    *,
    actor: User | None,
    note: str | None,
) -> None:
    db.add(
        OrderStatusHistory(
            order_id=order.id,
            from_status=from_status,
            to_status=to_status,
            note=note,
            changed_by=actor.id if actor else None,
        )
    )


def _check(order: Order, to: OrderStatus) -> None:
    if order.status not in ALLOWED.get(to, set()):
        raise TransitionError(
            f"An order that is {order.status.replace('_', ' ').lower()} can't become "
            f"{to.replace('_', ' ').lower()}."
        )


def _move(
    db: Session, order: Order, to: OrderStatus, *, actor: User | None, note: str | None
) -> None:
    _check(order, to)
    previous = order.status
    order.status = to
    moment = now()
    if to == S.SHIPPED:
        order.shipped_at = moment
    elif to == S.DELIVERED:
        order.delivered_at = moment
    elif to == S.CANCELLED:
        order.cancelled_at = moment
    elif to == S.CONFIRMED and previous == S.CANCELLED:
        order.cancelled_at = None
        order.cancel_reason = None
    history(db, order, previous, to, actor=actor, note=note)


def _payment(order: Order) -> Payment | None:
    return order.payments[-1] if order.payments else None


# --- payment ----------------------------------------------------------------------


def report_payment(db: Session, order: Order, reference: str) -> None:
    """The customer says they've paid by UPI. The order stops expiring and
    waits for the shop to check its bank account."""
    if order.payment_method != PaymentMethod.UPI or order.status != S.PENDING_PAYMENT:
        raise TransitionError("This order isn't waiting for a UPI payment.")
    if order.payment_status not in {PaymentStatus.UNPAID, PaymentStatus.VERIFYING}:
        raise TransitionError("This order's payment is already settled.")
    payment = _payment(order)
    assert payment is not None  # noqa: S101  (every order is created with one)
    payment.raw = {**(payment.raw or {}), "reference": reference, "reported_at": now().isoformat()}
    first_report = order.payment_status == PaymentStatus.UNPAID
    order.payment_status = PaymentStatus.VERIFYING
    if first_report:
        history(
            db, order, order.status, order.status, actor=None, note="Customer reported UPI payment"
        )


def confirm_payment(
    db: Session, order: Order, actor: User, *, reference: str | None, note: str | None
) -> None:
    """The shop has the money. Held stock is sold. Also accepts a payment that
    arrived after the order was cancelled for not being paid, if the stock is
    still there."""
    if order.payment_status in {PaymentStatus.PAID, PaymentStatus.REFUND_PENDING}:
        raise TransitionError("This order is already paid.")
    if order.status == S.CANCELLED:
        if order.payment_status == PaymentStatus.REFUNDED:
            raise TransitionError("This order was refunded.")
        inventory.reserve(db, lines(order))  # 409 OUT_OF_STOCK if it has gone
    elif order.status != S.PENDING_PAYMENT:
        raise TransitionError("This order isn't waiting for payment.")

    inventory.commit_sale(db, lines(order), order_id=order.id)
    payment = _payment(order)
    assert payment is not None  # noqa: S101
    reported = (payment.raw or {}).get("reference")
    payment.provider_payment_id = reference or reported or None
    payment.status = PaymentAttemptStatus.CAPTURED
    order.payment_status = PaymentStatus.PAID
    order.paid_at = now()
    order.expires_at = None
    default_note = (
        "Paid at the store" if order.fulfilment == FulfilmentMethod.PICKUP else ("Payment received")
    )
    _move(db, order, S.CONFIRMED, actor=actor, note=note or default_note)
    try:
        db.flush()
    except IntegrityError as exc:
        raise DuplicateReferenceError() from exc


def reject_payment(db: Session, order: Order, actor: User, *, note: str) -> None:
    """The customer reported a payment the shop never received."""
    if order.status != S.PENDING_PAYMENT or order.payment_method != PaymentMethod.UPI:
        raise TransitionError("This order isn't waiting for a UPI payment.")
    payment = _payment(order)
    if payment is not None:
        payment.status = PaymentAttemptStatus.FAILED
        payment.error_description = note
    order.payment_status = PaymentStatus.FAILED
    cancel(db, order, actor, reason=f"Payment not received: {note}")


# --- cancel, fulfil, refund ---------------------------------------------------------


def cancel(db: Session, order: Order, actor: User | None, *, reason: str) -> None:
    """Unpaid: the held stock is released. Paid: the frames go back on the
    shelf and the order waits for a refund."""
    paid = order.payment_status == PaymentStatus.PAID
    _move(db, order, S.CANCELLED, actor=actor, note=reason)
    order.cancel_reason = reason
    if paid:
        inventory.restock_returned(
            db, lines(order), order_id=order.id, actor_id=actor.id if actor else None
        )
        order.payment_status = PaymentStatus.REFUND_PENDING
    else:
        inventory.release(db, lines(order))
        payment = _payment(order)
        if payment is not None and payment.status == PaymentAttemptStatus.CREATED:
            payment.status = PaymentAttemptStatus.FAILED
            payment.error_description = payment.error_description or "Order cancelled"


def mark_collected(db: Session, order: Order, actor: User, *, note: str | None) -> None:
    """Pay at store: the customer paid and took the frames."""
    if order.fulfilment != FulfilmentMethod.PICKUP:
        raise TransitionError("Only store pickup orders are collected.")
    if order.status in {S.PENDING_PAYMENT, S.CANCELLED}:
        confirm_payment(db, order, actor, reference=None, note=note)
    _move(db, order, S.DELIVERED, actor=actor, note="Collected from the store")


def advance(
    db: Session,
    order: Order,
    actor: User,
    to: OrderStatus,
    *,
    courier_name: str | None = None,
    tracking_number: str | None = None,
    tracking_url: str | None = None,
    note: str | None = None,
) -> None:
    """Packing, shipping and delivery of a paid delivery order."""
    if order.fulfilment == FulfilmentMethod.PICKUP and to != S.DELIVERED:
        raise TransitionError("Store pickup orders are marked collected, not shipped.")
    _check(order, to)
    if to == S.SHIPPED:
        if not tracking_number and not courier_name:
            raise TransitionError("Add the courier and tracking number.", code="TRACKING_REQUIRED")
        order.courier_name = courier_name
        order.tracking_number = tracking_number
        order.tracking_url = tracking_url
    _move(db, order, to, actor=actor, note=note)


def mark_refunded(db: Session, order: Order, actor: User, *, note: str | None) -> None:
    if order.payment_status != PaymentStatus.REFUND_PENDING:
        raise TransitionError("This order has no refund to make.")
    payment = next(
        (p for p in reversed(order.payments) if p.status == PaymentAttemptStatus.CAPTURED), None
    )
    if payment is not None:
        payment.status = PaymentAttemptStatus.REFUNDED
        db.add(
            Refund(
                payment_id=payment.id,
                amount_paise=payment.amount_paise,
                status=RefundStatus.PROCESSED,
                reason=note,
                created_by=actor.id,
            )
        )
    order.payment_status = PaymentStatus.REFUNDED
    history(db, order, order.status, order.status, actor=actor, note=note or "Refunded")


# --- expiry ---------------------------------------------------------------------------


def expire_due(db: Session, *, limit: int = 100) -> list[Order]:
    """Cancels unpaid orders past their time and releases their stock.
    Orders whose payment the customer reported are never expired; the shop
    decides. Rows another transaction holds are skipped (next sweep)."""
    due = db.scalars(
        select(Order)
        .where(
            Order.status == S.PENDING_PAYMENT,
            Order.payment_status == PaymentStatus.UNPAID,
            Order.expires_at < now(),
        )
        .order_by(Order.expires_at)
        .limit(limit)
        .with_for_update(skip_locked=True)
        .options(selectinload(Order.items), selectinload(Order.payments))
    ).all()
    for order in due:
        reason = (
            "Not collected in time"
            if order.fulfilment == FulfilmentMethod.PICKUP
            else "Not paid in time"
        )
        cancel(db, order, None, reason=reason)
    if due:
        db.flush()
        logger.info("Expired %d unpaid orders", len(due))
    return list(due)
