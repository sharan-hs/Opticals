"""Orders in the admin: the list, what needs doing, and every staff action.
Each action locks the order, applies the workflow, records an audit row,
commits, then emails the customer."""

from collections.abc import Callable
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import ColumnElement, String, cast, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core import audit
from app.core.pagination import Page, PageParams
from app.models import Order, User
from app.models.enums import (
    FulfilmentMethod,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
)
from app.modules.notifications.email import EmailSender
from app.modules.orders import emails, service, workflow
from app.modules.orders.schemas import (
    AdminHistoryEntry,
    AdminOrderDetail,
    AdminOrderRow,
    AdminPayment,
    OrderCounts,
)
from app.modules.settings import service as shop_settings

S = OrderStatus
P = PaymentStatus
IST = ZoneInfo("Asia/Kolkata")


def _sweep(db: Session) -> None:
    if workflow.expire_due(db):
        db.commit()


def _reference(order: Order) -> str | None:
    payment = order.payments[-1] if order.payments else None
    if payment is None:
        return None
    reported = (payment.raw or {}).get("reference")
    return payment.provider_payment_id or (str(reported) if reported else None)


def counts(db: Session) -> OrderCounts:
    _sweep(db)

    def count(*where: ColumnElement[bool]) -> int:
        return db.scalar(select(func.count()).select_from(Order).where(*where)) or 0

    return OrderCounts(
        to_verify=count(Order.status == S.PENDING_PAYMENT, Order.payment_status == P.VERIFYING),
        awaiting_pickup=count(
            Order.status == S.PENDING_PAYMENT, Order.fulfilment == FulfilmentMethod.PICKUP
        ),
        to_ship=count(
            Order.status.in_([S.CONFIRMED, S.PROCESSING]),
            Order.fulfilment == FulfilmentMethod.DELIVERY,
        ),
        refunds_pending=count(Order.payment_status == P.REFUND_PENDING),
    )


# Quick filters on the orders page.
QUEUES: dict[str, list[ColumnElement[bool]]] = {
    "to_verify": [Order.status == S.PENDING_PAYMENT, Order.payment_status == P.VERIFYING],
    "awaiting_payment": [Order.status == S.PENDING_PAYMENT, Order.payment_status == P.UNPAID],
    "awaiting_pickup": [
        Order.status == S.PENDING_PAYMENT,
        Order.fulfilment == FulfilmentMethod.PICKUP,
    ],
    "to_ship": [
        Order.status.in_([S.CONFIRMED, S.PROCESSING]),
        Order.fulfilment == FulfilmentMethod.DELIVERY,
    ],
    "refunds_pending": [Order.payment_status == P.REFUND_PENDING],
}


def list_orders(
    db: Session,
    params: PageParams,
    *,
    q: str | None,
    status: OrderStatus | None,
    payment_status: PaymentStatus | None,
    payment_method: PaymentMethod | None,
    queue: str | None,
    date_from: date | None,
    date_to: date | None,
) -> Page[AdminOrderRow]:
    _sweep(db)
    where: list[ColumnElement[bool]] = list(QUEUES.get(queue or "", []))
    if status:
        where.append(Order.status == status)
    if payment_status:
        where.append(Order.payment_status == payment_status)
    if payment_method:
        where.append(Order.payment_method == payment_method)
    if date_from:
        where.append(Order.placed_at >= datetime.combine(date_from, time.min, IST))
    if date_to:
        end = datetime.combine(date_to + timedelta(days=1), time.min, IST)
        where.append(Order.placed_at < end)
    if q and q.strip():
        term = f"%{q.strip()}%"
        where.append(
            or_(
                Order.order_number.ilike(term),
                User.email.ilike(term),
                User.full_name.ilike(term),
                Order.contact_phone.ilike(term),
                cast(Order.shipping_address["pincode"], String).ilike(term),
            )
        )
    base = select(Order).join(User, User.id == Order.user_id).where(*where)
    total = db.scalar(select(func.count()).select_from(base.subquery()))
    rows = db.execute(
        base.add_columns(User)
        .order_by(Order.placed_at.desc(), Order.id.desc())
        .offset(params.offset)
        .limit(params.limit)
        .options(selectinload(Order.items), selectinload(Order.payments))
    ).all()
    return Page[AdminOrderRow].create(
        [
            AdminOrderRow(
                order_number=order.order_number,
                placed_at=order.placed_at,
                customer_name=user.full_name,
                customer_email=user.email,
                customer_phone=order.contact_phone or user.phone,
                status=order.status,
                payment_status=order.payment_status,
                payment_method=order.payment_method,
                fulfilment=order.fulfilment,
                total_paise=order.total_paise,
                item_count=sum(item.quantity for item in order.items),
                payment_reference=_reference(order),
                expires_at=order.expires_at,
            )
            for order, user in rows
        ],
        total or 0,
        params,
    )


def actions(order: Order) -> list[str]:
    """What staff can do with the order right now (the admin shows these buttons)."""
    found: list[str] = []
    pickup = order.fulfilment == FulfilmentMethod.PICKUP
    if order.status == S.PENDING_PAYMENT:
        if pickup:
            found.append("collected")
        else:
            found += ["confirm_payment", "reject_payment"]
        found.append("cancel")
    elif order.status == S.CONFIRMED:
        found += ["collected"] if pickup else ["processing"]
        found.append("cancel")
    elif order.status == S.PROCESSING:
        found += ["shipped", "cancel"]
    elif order.status == S.SHIPPED:
        found.append("delivered")
    elif order.status == S.CANCELLED and order.payment_status in {P.UNPAID, P.FAILED}:
        found.append("confirm_payment")  # money arrived after all
    if order.payment_status == P.REFUND_PENDING:
        found.append("refunded")
    return found


def detail(db: Session, number: str) -> AdminOrderDetail:
    _sweep(db)
    order = workflow.load(db, number)
    customer = db.get(User, order.user_id)
    assert customer is not None  # noqa: S101
    staff_ids = {h.changed_by for h in order.status_history if h.changed_by}
    names: dict[int, str] = {}
    if staff_ids:
        for user_id, name in db.execute(
            select(User.id, User.full_name).where(User.id.in_(staff_ids))
        ):
            names[user_id] = name
    base = service.to_detail(order, shop_settings.get(db))
    return AdminOrderDetail(
        **base.model_dump(),
        customer_name=customer.full_name,
        customer_email=customer.email,
        customer_phone=customer.phone,
        contact_phone=order.contact_phone,
        history=[
            AdminHistoryEntry(
                from_status=h.from_status,
                to_status=h.to_status,
                note=h.note,
                at=h.created_at,
                by=names.get(h.changed_by) if h.changed_by else None,
            )
            for h in order.status_history
        ],
        payments=[
            AdminPayment(
                id=p.id,
                status=p.status,
                amount_paise=p.amount_paise,
                method=p.method,
                reference=p.provider_payment_id or (p.raw or {}).get("reference"),
                reported_at=(p.raw or {}).get("reported_at"),
                created_at=p.created_at,
            )
            for p in order.payments
        ],
        actions=actions(order),
    )


def act(
    db: Session,
    actor: User,
    number: str,
    action: str,
    change: Callable[[Order], None],
    sender: EmailSender,
) -> AdminOrderDetail:
    """Runs one staff action on a locked order, then emails the customer."""
    order = workflow.load(db, number, lock=True)
    before = audit.snapshot(order, ["status", "payment_status"])
    change(order)
    audit.record(
        db,
        actor,
        f"order.{action}",
        "order",
        order.order_number,
        audit.diff(before, audit.snapshot(order, ["status", "payment_status"])),
    )
    db.commit()
    customer = db.get(User, order.user_id)
    assert customer is not None  # noqa: S101
    messages = service.status_email(order, customer)
    if action == "refunded":
        messages = [
            emails.refunded(
                to=customer.email,
                order=order,
                name=customer.full_name,
                order_url=service.order_url(order.order_number),
            )
        ]
    service.send(sender, messages)
    return detail(db, number)
