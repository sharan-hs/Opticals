"""Order emails. Each has a plain-text and an HTML version."""

from datetime import datetime
from html import escape
from zoneinfo import ZoneInfo

from app.core.money import format_inr
from app.models import Order
from app.models.enums import FulfilmentMethod, PaymentStatus
from app.modules.notifications.email import EmailMessage
from app.modules.notifications.templates import STORE_NAME, html_page

IST = ZoneInfo("Asia/Kolkata")


def _when(moment: datetime | None) -> str:
    return moment.astimezone(IST).strftime("%-d %b, %-I:%M %p") if moment else ""


def _day(moment: datetime | None) -> str:
    return moment.astimezone(IST).strftime("%A %-d %B") if moment else ""


def _items_text(order: Order) -> str:
    return "\n".join(
        f"  {item.quantity} x {item.product_name} ({item.variant_label}) "
        f"{format_inr(item.line_total_paise)}"
        for item in order.items
    )


def _items_html(order: Order) -> str:
    rows = "".join(
        f"<tr><td>{item.quantity} x {escape(item.product_name)} ({escape(item.variant_label)})"
        f'</td><td style="text-align:right">{format_inr(item.line_total_paise)}</td></tr>'
        for item in order.items
    )
    return (
        f'<table style="width:100%;border-collapse:collapse">{rows}'
        f'<tr><td style="padding-top:8px"><strong>Total</strong></td>'
        f'<td style="text-align:right;padding-top:8px"><strong>{format_inr(order.total_paise)}'
        "</strong></td></tr></table>"
    )


def _button(url: str, label: str) -> str:
    return (
        f'<p><a href="{escape(url)}" style="display:inline-block;background:#000;color:#fff;'
        f'padding:12px 24px;text-decoration:none">{escape(label)}</a></p>'
    )


def order_placed(*, to: str, order: Order, name: str, order_url: str, upi_id: str) -> EmailMessage:
    number = order.order_number
    if order.fulfilment == FulfilmentMethod.PICKUP:
        store = order.pickup_store or {}
        next_steps_text = (
            f"Collect it from our {store.get('name')} store by {_day(order.expires_at)} and pay "
            f"at the counter.\n{store.get('address')}\nPhone: {store.get('phone')}"
        )
        next_steps_html = (
            f"<p>Collect it from our <strong>{escape(store.get('name', ''))}</strong> store by "
            f"<strong>{_day(order.expires_at)}</strong> and pay at the counter.<br>"
            f"{escape(store.get('address', ''))}<br>Phone: {escape(store.get('phone', ''))}</p>"
        )
    else:
        amount = format_inr(order.total_paise)
        next_steps_text = (
            f"Please pay {amount} by UPI to {upi_id} before {_when(order.expires_at)}, then open "
            f'your order and tap "I\'ve paid":\n{order_url}\n'
            "We hold your frames until then."
        )
        next_steps_html = (
            f"<p>Please pay <strong>{amount}</strong> by UPI to <strong>{escape(upi_id)}</strong> "
            f"before <strong>{_when(order.expires_at)}</strong>, then open your order and tap "
            "<em>I've paid</em>. We hold your frames until then.</p>"
            + _button(order_url, "Pay and track your order")
        )
    text = (
        f"Hi {name},\n\nThank you for your order {number}.\n\n{_items_text(order)}\n"
        f"  Total {format_inr(order.total_paise)} (includes GST)\n\n{next_steps_text}\n\n"
        f"{STORE_NAME}"
    )
    html = html_page(
        f"<p>Hi {escape(name)},</p><p>Thank you for your order <strong>{number}</strong>.</p>"
        f"{_items_html(order)}{next_steps_html}"
    )
    return EmailMessage(to=to, subject=f"Order {number} received", text=text, html=html)


def shop_new_order(*, to: str, order: Order, customer: str, admin_url: str) -> EmailMessage:
    how = (
        f"Pay at store, collect from {(order.pickup_store or {}).get('name')}"
        if order.fulfilment == FulfilmentMethod.PICKUP
        else "UPI, home delivery"
    )
    text = (
        f"New order {order.order_number} from {customer}\n{how}\n\n{_items_text(order)}\n"
        f"  Total {format_inr(order.total_paise)}\n\n{admin_url}"
    )
    html = html_page(
        f"<p>New order <strong>{order.order_number}</strong> from {escape(customer)}<br>"
        f"{escape(how)}</p>{_items_html(order)}" + _button(admin_url, "Open in admin")
    )
    return EmailMessage(to=to, subject=f"New order {order.order_number}", text=text, html=html)


def status_changed(*, to: str, order: Order, name: str, order_url: str) -> EmailMessage | None:
    """Payment received, shipped, collected or cancelled; None for other changes."""
    number = order.order_number
    status = order.status
    if status == "CONFIRMED":
        subject = f"Payment received for {number}"
        body = "We've received your payment. We'll pack your order and let you know when it ships."
    elif status == "SHIPPED":
        subject = f"Order {number} is on its way"
        tracking = " ".join(filter(None, [order.courier_name, order.tracking_number]))
        body = f"Your order has been shipped. Tracking: {tracking}."
        if order.tracking_url:
            body += f" Track it here: {order.tracking_url}"
    elif status == "DELIVERED":
        subject = f"Order {number} delivered"
        body = (
            "Thank you for collecting your order."
            if order.fulfilment == FulfilmentMethod.PICKUP
            else "Your order has been delivered. We hope you enjoy your new frames."
        )
    elif status == "CANCELLED":
        subject = f"Order {number} cancelled"
        body = f"Your order was cancelled: {order.cancel_reason}."
        if order.payment_status == PaymentStatus.REFUND_PENDING:
            body += " We'll refund your payment to the account it came from."
    else:
        return None
    text = f"Hi {name},\n\n{body}\n\nYour order: {order_url}\n\n{STORE_NAME}"
    html = html_page(
        f"<p>Hi {escape(name)},</p><p>{escape(body)}</p>" + _button(order_url, "View your order")
    )
    return EmailMessage(to=to, subject=subject, text=text, html=html)


def refunded(*, to: str, order: Order, name: str, order_url: str) -> EmailMessage:
    body = f"We've refunded {format_inr(order.total_paise)} for order {order.order_number}."
    text = f"Hi {name},\n\n{body}\n\nYour order: {order_url}\n\n{STORE_NAME}"
    html = html_page(f"<p>Hi {escape(name)},</p><p>{escape(body)}</p>")
    return EmailMessage(to=to, subject=f"Refund for {order.order_number}", text=text, html=html)
