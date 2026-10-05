"""Checkout and the customer's orders.

Placing an order is one transaction: lock the cart, price it from the
database, hold the stock, copy prices and the address onto the order, empty
the cart. The browser's total is only compared, never used.
"""

import logging
import uuid
from datetime import timedelta
from urllib.parse import quote as url_quote
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

from sqlalchemy import delete, func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.core.errors import AppError, BusinessRuleError, ConflictError, NotFoundError
from app.core.pagination import Page, PageParams
from app.models import Address, CartItem, Order, OrderItem, Payment, User
from app.models.enums import (
    FulfilmentMethod,
    OrderStatus,
    PaymentMethod,
    PaymentProviderName,
    PaymentStatus,
)
from app.modules.cart import service as cart_service
from app.modules.cart.schemas import CartOut
from app.modules.inventory import service as inventory
from app.modules.notifications.email import EmailMessage, EmailSender
from app.modules.orders import emails, workflow
from app.modules.orders.schemas import (
    CheckoutOptions,
    OrderDetail,
    OrderItemOut,
    OrderSummary,
    PayAtStoreOption,
    PlaceOrderRequest,
    Quote,
    TimelineEntry,
    UpiInstructions,
    UpiOption,
)
from app.modules.settings import service as shop_settings
from app.modules.settings.service import ShopSettings

logger = logging.getLogger(__name__)

IST = ZoneInfo("Asia/Kolkata")
MAX_UNPAID_ORDERS = 3


class CartEmptyError(BusinessRuleError):
    code = "CART_EMPTY"
    message = "Your cart is empty."


class CartHasIssuesError(ConflictError):
    code = "CART_HAS_ISSUES"
    message = "Some items in your cart need your attention. Please review your cart."


class PriceChangedError(ConflictError):
    code = "PRICE_CHANGED"
    message = "Prices changed since you opened checkout. Please check the new total."


class TooManyUnpaidError(ConflictError):
    code = "TOO_MANY_UNPAID"
    message = (
        f"You have {MAX_UNPAID_ORDERS} orders waiting for payment. "
        "Pay for or cancel one of them first."
    )


class PaymentMethodUnavailableError(BusinessRuleError):
    code = "PAYMENT_METHOD_UNAVAILABLE"
    message = "That way of paying isn't available right now."


# --- quote ------------------------------------------------------------------------


def options(settings: ShopSettings) -> CheckoutOptions:
    return CheckoutOptions(
        upi=UpiOption(
            enabled=settings.upi_enabled,
            payment_window_minutes=settings.upi_payment_window_minutes,
        ),
        pay_at_store=PayAtStoreOption(
            enabled=settings.pay_at_store_enabled, hold_days=settings.pickup_hold_days
        ),
        stores=settings.stores,
        delivery_fee_paise=settings.delivery_fee_paise,
    )


def _fulfilment(method: PaymentMethod) -> FulfilmentMethod:
    return (
        FulfilmentMethod.PICKUP
        if method == PaymentMethod.PAY_AT_STORE
        else (FulfilmentMethod.DELIVERY)
    )


def _delivery_fee(settings: ShopSettings, method: PaymentMethod) -> int:
    return settings.delivery_fee_paise if _fulfilment(method) == FulfilmentMethod.DELIVERY else 0


def _quote(cart: CartOut, settings: ShopSettings, method: PaymentMethod) -> Quote:
    fee = _delivery_fee(settings, method)
    return Quote(
        lines=cart.lines,
        item_count=cart.item_count,
        subtotal_paise=cart.subtotal_paise,
        delivery_fee_paise=fee,
        total_paise=cart.subtotal_paise + fee,
        savings_paise=cart.savings_paise,
        has_issues=cart.has_issues,
        options=options(settings),
    )


def quote(db: Session, user: User, method: PaymentMethod) -> Quote:
    return _quote(cart_service.get_cart(db, user), shop_settings.get(db), method)


# --- place --------------------------------------------------------------------------


def _next_number(db: Session) -> str:
    n = db.scalar(text("SELECT nextval('order_number_seq')"))
    return f"VO-{workflow.now().astimezone(IST):%y%m%d}-{n:04d}"


def _address_snapshot(db: Session, user: User, address_id: int | None) -> dict[str, str | None]:
    if address_id is None:
        raise BusinessRuleError("Choose a delivery address.", code="ADDRESS_REQUIRED")
    address = db.scalar(
        select(Address).where(
            Address.id == address_id, Address.user_id == user.id, Address.deleted_at.is_(None)
        )
    )
    if address is None:
        raise NotFoundError("Address not found.")
    fields = ["full_name", "phone", "line1", "line2", "landmark", "city", "state", "pincode"]
    return {field: getattr(address, field) for field in fields} | {"country": address.country}


def _tax(total: int, rate_percent: int) -> int:
    """GST contained in a GST-inclusive amount."""
    return round(total * rate_percent / (100 + rate_percent))


def _existing(db: Session, user: User, key: uuid.UUID) -> Order | None:
    number = db.scalar(
        select(Order.order_number).where(Order.user_id == user.id, Order.idempotency_key == key)
    )
    return workflow.load(db, number) if number else None


def place(
    db: Session, user: User, body: PlaceOrderRequest, key: uuid.UUID, sender: EmailSender
) -> tuple[OrderDetail, bool]:
    """Returns (order, created). Sending the same Idempotency-Key again
    returns the first order instead of a second one."""
    settings = shop_settings.get(db)
    cart = cart_service.lock_cart(db, user)  # one checkout at a time per user
    if (existing := _existing(db, user, key)) is not None:
        db.commit()
        return to_detail(existing, settings), False

    if body.payment_method == PaymentMethod.UPI and not settings.upi_enabled:
        raise PaymentMethodUnavailableError()
    if body.payment_method == PaymentMethod.PAY_AT_STORE and not settings.pay_at_store_enabled:
        raise PaymentMethodUnavailableError()

    workflow.expire_due(db)  # frees stock held by orders that ran out of time
    unpaid = db.scalar(
        select(func.count())
        .select_from(Order)
        .where(
            Order.user_id == user.id,
            Order.status == OrderStatus.PENDING_PAYMENT,
            Order.payment_status == PaymentStatus.UNPAID,
        )
    )
    if (unpaid or 0) >= MAX_UNPAID_ORDERS:
        raise TooManyUnpaidError()

    fulfilment = _fulfilment(body.payment_method)
    shipping_address = None
    pickup_store = None
    if fulfilment == FulfilmentMethod.DELIVERY:
        shipping_address = _address_snapshot(db, user, body.address_id)
    else:
        store = settings.store(body.store_id or "")
        if store is None:
            raise BusinessRuleError("Choose the store you'll collect from.", code="STORE_REQUIRED")
        pickup_store = store.model_dump()

    priced = cart_service.get_cart(db, user)
    if not priced.lines:
        raise CartEmptyError()
    if priced.has_issues:
        raise CartHasIssuesError(details={"cart": priced.model_dump(mode="json")})
    fee = _delivery_fee(settings, body.payment_method)
    total = priced.subtotal_paise + fee
    if total != body.expected_total_paise:
        raise PriceChangedError(details={"total_paise": total})

    stock = [inventory.StockLine(line.variant_id, line.quantity) for line in priced.lines]
    inventory.reserve(db, stock)  # 409 OUT_OF_STOCK if someone else just bought it

    moment = workflow.now()
    window = (
        timedelta(minutes=settings.upi_payment_window_minutes)
        if body.payment_method == PaymentMethod.UPI
        else timedelta(days=settings.pickup_hold_days)
    )
    number = _next_number(db)
    order = Order(
        order_number=number,
        user_id=user.id,
        status=OrderStatus.PENDING_PAYMENT,
        payment_status=PaymentStatus.UNPAID,
        payment_method=body.payment_method,
        fulfilment=fulfilment,
        subtotal_paise=priced.subtotal_paise,
        shipping_paise=fee,
        tax_paise=_tax(total, settings.gst_rate_percent),
        total_paise=total,
        shipping_address=shipping_address,
        pickup_store=pickup_store,
        contact_email=user.email,
        contact_phone=(shipping_address or {}).get("phone") or user.phone,
        customer_note=body.customer_note or None,
        expires_at=moment + window,
        placed_at=moment,
        idempotency_key=key,
    )
    order.items = [
        OrderItem(
            variant_id=line.variant_id,
            product_name=line.product_name,
            variant_label=line.color_name,
            sku=line.sku,
            image_public_id=line.image.public_id if line.image else None,
            unit_mrp_paise=line.mrp_paise,
            unit_price_paise=line.unit_price_paise,
            quantity=line.quantity,
            line_total_paise=line.line_total_paise,
            gst_rate_bp=settings.gst_rate_percent * 100,
        )
        for line in priced.lines
    ]
    db.add(order)
    db.flush()
    db.add(
        Payment(
            order_id=order.id,
            provider=PaymentProviderName.MANUAL,
            provider_order_id=f"MANUAL-{number}",
            amount_paise=total,
            method="upi" if body.payment_method == PaymentMethod.UPI else "store",
        )
    )
    workflow.history(db, order, None, OrderStatus.PENDING_PAYMENT, actor=None, note="Order placed")
    db.execute(delete(CartItem).where(CartItem.cart_id == cart.id))
    try:
        db.commit()
    except IntegrityError:
        # Same key sent twice at the same moment: the other request won.
        db.rollback()
        existing = _existing(db, user, key)
        if existing is None:
            raise
        return to_detail(existing, settings), False

    placed = workflow.load(db, number)
    send(sender, _placed_emails(placed, user, settings))
    return to_detail(placed, settings), True


# --- emails --------------------------------------------------------------------------


def order_url(number: str) -> str:
    return f"{get_settings().frontend_url.rstrip('/')}/orders/{number}"


def _placed_emails(order: Order, user: User, settings: ShopSettings) -> list[EmailMessage]:
    messages = [
        emails.order_placed(
            to=user.email,
            order=order,
            name=user.full_name,
            order_url=order_url(order.order_number),
            upi_id=settings.upi_id,
        )
    ]
    if settings.order_email:
        admin_url = f"{get_settings().frontend_url.rstrip('/')}/admin/orders/{order.order_number}"
        messages.append(
            emails.shop_new_order(
                to=settings.order_email,
                order=order,
                customer=f"{user.full_name} <{user.email}>",
                admin_url=admin_url,
            )
        )
    return messages


def status_email(order: Order, customer: User) -> list[EmailMessage]:
    message = emails.status_changed(
        to=customer.email,
        order=order,
        name=customer.full_name,
        order_url=order_url(order.order_number),
    )
    return [message] if message else []


def send(sender: EmailSender, messages: list[EmailMessage]) -> None:
    """After the commit; a failed email never undoes an order."""
    for message in messages:
        try:
            sender.send(message)
        except Exception:
            logger.exception("Order email not sent", extra={"subject": message.subject})


# --- views ---------------------------------------------------------------------------


def upi_uri(settings: ShopSettings, order: Order) -> str:
    params = {
        "pa": settings.upi_id,
        "pn": settings.upi_payee_name,
        "am": f"{order.total_paise / 100:.2f}",
        "cu": "INR",
        "tn": f"Order {order.order_number}",
    }
    return "upi://pay?" + urlencode(params, quote_via=url_quote)


def to_summary(order: Order) -> OrderSummary:
    first = order.items[0]
    return OrderSummary(
        order_number=order.order_number,
        status=order.status,
        payment_status=order.payment_status,
        payment_method=order.payment_method,
        fulfilment=order.fulfilment,
        placed_at=order.placed_at,
        total_paise=order.total_paise,
        item_count=sum(item.quantity for item in order.items),
        first_item_name=first.product_name,
        first_item_image=first.image_public_id,
    )


def customer_can_cancel(order: Order) -> bool:
    return order.status == OrderStatus.PENDING_PAYMENT and order.payment_status == (
        PaymentStatus.UNPAID
    )


def to_detail(order: Order, settings: ShopSettings) -> OrderDetail:
    upi = None
    waiting_for_upi = (
        order.payment_method == PaymentMethod.UPI
        and order.status == OrderStatus.PENDING_PAYMENT
        and order.payment_status in {PaymentStatus.UNPAID, PaymentStatus.VERIFYING}
    )
    if waiting_for_upi and order.expires_at is not None:
        payment = order.payments[-1] if order.payments else None
        upi = UpiInstructions(
            upi_id=settings.upi_id,
            payee_name=settings.upi_payee_name,
            amount_paise=order.total_paise,
            upi_uri=upi_uri(settings, order),
            pay_by=order.expires_at,
            reference_submitted=(payment.raw or {}).get("reference") if payment else None,
        )
    return OrderDetail(
        **to_summary(order).model_dump(),
        items=[OrderItemOut.model_validate(item) for item in order.items],
        subtotal_paise=order.subtotal_paise,
        delivery_fee_paise=order.shipping_paise,
        tax_paise=order.tax_paise,
        shipping_address=order.shipping_address,
        pickup_store=order.pickup_store,
        customer_note=order.customer_note,
        expires_at=order.expires_at,
        paid_at=order.paid_at,
        shipped_at=order.shipped_at,
        delivered_at=order.delivered_at,
        cancelled_at=order.cancelled_at,
        cancel_reason=order.cancel_reason,
        courier_name=order.courier_name,
        tracking_number=order.tracking_number,
        tracking_url=order.tracking_url,
        timeline=[
            TimelineEntry(status=entry.to_status, at=entry.created_at)
            for entry in order.status_history
            if entry.from_status != entry.to_status
        ],
        upi=upi,
        can_cancel=customer_can_cancel(order),
    )


# --- the customer's orders -------------------------------------------------------------


def _sweep(db: Session) -> None:
    if workflow.expire_due(db):
        db.commit()


def list_orders(db: Session, user: User, params: PageParams) -> Page[OrderSummary]:
    _sweep(db)
    total = db.scalar(select(func.count()).select_from(Order).where(Order.user_id == user.id))
    rows = db.scalars(
        select(Order)
        .where(Order.user_id == user.id)
        .order_by(Order.placed_at.desc(), Order.id.desc())
        .offset(params.offset)
        .limit(params.limit)
        .options(selectinload(Order.items))
    ).all()
    return Page[OrderSummary].create([to_summary(o) for o in rows], total or 0, params)


def get(db: Session, user: User, number: str) -> OrderDetail:
    _sweep(db)
    return to_detail(workflow.load(db, number, user=user), shop_settings.get(db))


def report_payment(db: Session, user: User, number: str, reference: str) -> OrderDetail:
    _sweep(db)
    order = workflow.load(db, number, user=user, lock=True)
    if order.status == OrderStatus.CANCELLED and order.payment_status == PaymentStatus.UNPAID:
        raise AppError(
            "The time to pay for this order has ended and it was cancelled. If you've already "
            "paid, call the store with your payment reference.",
            code="ORDER_EXPIRED",
        )
    workflow.report_payment(db, order, reference)
    db.commit()
    return get(db, user, number)


def cancel(
    db: Session, user: User, number: str, reason: str | None, sender: EmailSender
) -> OrderDetail:
    order = workflow.load(db, number, user=user, lock=True)
    if order.payment_status == PaymentStatus.VERIFYING:
        raise ConflictError(
            "We're checking your payment for this order. Please call the store to cancel it.",
            code="PAYMENT_BEING_CHECKED",
        )
    if not customer_can_cancel(order):
        raise ConflictError(
            "This order can't be cancelled online any more. Please call the store.",
            code="CANNOT_CANCEL",
        )
    workflow.cancel(
        db, order, None, reason=f"Cancelled by the customer{': ' + reason if reason else ''}"
    )
    db.commit()
    send(sender, status_email(order, user))
    return get(db, user, number)
