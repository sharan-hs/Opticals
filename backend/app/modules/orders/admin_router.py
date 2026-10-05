"""/api/v1/admin/orders and /api/v1/admin/settings (ADMIN only)."""

from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query

from app.core.deps import AdminUser, DbSession, require_role
from app.core.pagination import Page, PageParams, page_params
from app.models import Order
from app.models.enums import OrderStatus, PaymentMethod, PaymentStatus, UserRole
from app.modules.notifications.email import EmailSender, get_email_sender
from app.modules.orders import admin_service, workflow
from app.modules.orders.schemas import (
    AdminCancelRequest,
    AdminOrderDetail,
    AdminOrderRow,
    ConfirmPaymentRequest,
    NoteRequest,
    OrderCounts,
    RejectPaymentRequest,
    StatusUpdateRequest,
)
from app.modules.settings import service as shop_settings
from app.modules.settings.service import ShopSettings, ShopSettingsUpdate

router = APIRouter(
    prefix="/admin", tags=["admin"], dependencies=[Depends(require_role(UserRole.ADMIN))]
)

Sender = Annotated[EmailSender, Depends(get_email_sender)]
Queue = Literal["to_verify", "awaiting_payment", "awaiting_pickup", "to_ship", "refunds_pending"]


@router.get("/orders")
def list_orders(
    db: DbSession,
    paging: Annotated[PageParams, Depends(page_params)],
    q: Annotated[str | None, Query(max_length=100)] = None,
    status: OrderStatus | None = None,
    payment_status: PaymentStatus | None = None,
    payment_method: PaymentMethod | None = None,
    queue: Queue | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> Page[AdminOrderRow]:
    return admin_service.list_orders(
        db,
        paging,
        q=q,
        status=status,
        payment_status=payment_status,
        payment_method=payment_method,
        queue=queue,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/orders/counts")
def order_counts(db: DbSession) -> OrderCounts:
    """What needs doing, for the sidebar badges."""
    return admin_service.counts(db)


@router.get("/orders/{order_number}")
def get_order(order_number: str, db: DbSession) -> AdminOrderDetail:
    return admin_service.detail(db, order_number)


@router.post("/orders/{order_number}/confirm-payment")
def confirm_payment(
    order_number: str, body: ConfirmPaymentRequest, admin: AdminUser, db: DbSession, sender: Sender
) -> AdminOrderDetail:
    """The money is in the shop's account (also accepts a late payment)."""

    def change(order: Order) -> None:
        workflow.confirm_payment(db, order, admin, reference=body.reference, note=body.note)

    return admin_service.act(db, admin, order_number, "confirm_payment", change, sender)


@router.post("/orders/{order_number}/reject-payment")
def reject_payment(
    order_number: str, body: RejectPaymentRequest, admin: AdminUser, db: DbSession, sender: Sender
) -> AdminOrderDetail:
    def change(order: Order) -> None:
        workflow.reject_payment(db, order, admin, note=body.note)

    return admin_service.act(db, admin, order_number, "reject_payment", change, sender)


@router.post("/orders/{order_number}/collected")
def mark_collected(
    order_number: str, body: NoteRequest, admin: AdminUser, db: DbSession, sender: Sender
) -> AdminOrderDetail:
    """Pay at store: paid at the counter and handed over."""

    def change(order: Order) -> None:
        workflow.mark_collected(db, order, admin, note=body.note)

    return admin_service.act(db, admin, order_number, "collected", change, sender)


@router.post("/orders/{order_number}/status")
def update_status(
    order_number: str, body: StatusUpdateRequest, admin: AdminUser, db: DbSession, sender: Sender
) -> AdminOrderDetail:
    def change(order: Order) -> None:
        workflow.advance(
            db,
            order,
            admin,
            OrderStatus(body.status),
            courier_name=body.courier_name,
            tracking_number=body.tracking_number,
            tracking_url=body.tracking_url,
            note=body.note,
        )

    return admin_service.act(db, admin, order_number, body.status.lower(), change, sender)


@router.post("/orders/{order_number}/cancel")
def cancel_order(
    order_number: str, body: AdminCancelRequest, admin: AdminUser, db: DbSession, sender: Sender
) -> AdminOrderDetail:
    def change(order: Order) -> None:
        workflow.cancel(db, order, admin, reason=body.reason)

    return admin_service.act(db, admin, order_number, "cancel", change, sender)


@router.post("/orders/{order_number}/refunded")
def mark_refunded(
    order_number: str, body: NoteRequest, admin: AdminUser, db: DbSession, sender: Sender
) -> AdminOrderDetail:
    """The shop has sent the money back (UPI or cash)."""

    def change(order: Order) -> None:
        workflow.mark_refunded(db, order, admin, note=body.note)

    return admin_service.act(db, admin, order_number, "refunded", change, sender)


# --- settings --------------------------------------------------------------------------


@router.get("/settings")
def get_settings(db: DbSession) -> ShopSettings:
    return shop_settings.get(db)


@router.patch("/settings")
def update_settings(body: ShopSettingsUpdate, admin: AdminUser, db: DbSession) -> ShopSettings:
    return shop_settings.update(db, admin, body)
