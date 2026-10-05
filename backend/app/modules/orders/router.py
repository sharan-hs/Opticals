import hmac
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Response, status

from app.core import rate_limit
from app.core.config import get_settings
from app.core.deps import CurrentUser, DbSession
from app.core.errors import NotFoundError, UnauthorizedError
from app.core.pagination import Page, PageParams, page_params
from app.core.rate_limit import RateLimiter, get_rate_limiter
from app.modules.notifications.email import EmailSender, get_email_sender
from app.modules.orders import service, workflow
from app.modules.orders.schemas import (
    CancelRequest,
    OrderDetail,
    OrderSummary,
    PlaceOrderRequest,
    Quote,
    QuoteRequest,
    SubmitPaymentRequest,
)

Limiter = Annotated[RateLimiter, Depends(get_rate_limiter)]
Sender = Annotated[EmailSender, Depends(get_email_sender)]


def _no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"


router = APIRouter(tags=["orders"], dependencies=[Depends(_no_store)])


@router.post("/checkout/quote")
def checkout_quote(body: QuoteRequest, user: CurrentUser, db: DbSession) -> Quote:
    """The cart priced for checkout, with the ways to pay and the stores."""
    return service.quote(db, user, body.payment_method)


@router.post("/orders", status_code=status.HTTP_201_CREATED)
def place_order(
    body: PlaceOrderRequest,
    response: Response,
    user: CurrentUser,
    db: DbSession,
    limiter: Limiter,
    sender: Sender,
    idempotency_key: Annotated[uuid.UUID, Header(alias="Idempotency-Key")],
) -> OrderDetail:
    """One key per checkout attempt: sending it again returns the same order (200)."""
    limiter.hit(rate_limit.PLACE_ORDER, f"user:{user.id}")
    order, created = service.place(db, user, body, idempotency_key, sender)
    if not created:
        response.status_code = status.HTTP_200_OK
    return order


@router.get("/orders")
def list_orders(
    user: CurrentUser, db: DbSession, paging: Annotated[PageParams, Depends(page_params)]
) -> Page[OrderSummary]:
    return service.list_orders(db, user, paging)


@router.get("/orders/{order_number}")
def get_order(order_number: str, user: CurrentUser, db: DbSession) -> OrderDetail:
    return service.get(db, user, order_number)


@router.post("/orders/{order_number}/payment")
def report_payment(
    order_number: str,
    body: SubmitPaymentRequest,
    user: CurrentUser,
    db: DbSession,
    limiter: Limiter,
) -> OrderDetail:
    """The customer's "I've paid", with the UPI reference from their app."""
    limiter.hit(rate_limit.REPORT_PAYMENT, f"user:{user.id}")
    return service.report_payment(db, user, order_number, body.reference)


@router.post("/orders/{order_number}/cancel")
def cancel_order(
    order_number: str, body: CancelRequest, user: CurrentUser, db: DbSession, sender: Sender
) -> OrderDetail:
    return service.cancel(db, user, order_number, body.reason, sender)


# --- scheduled jobs ---------------------------------------------------------------------

internal_router = APIRouter(prefix="/internal", tags=["internal"], include_in_schema=False)


@internal_router.post("/expire-orders")
def expire_orders(
    db: DbSession, authorization: Annotated[str | None, Header()] = None
) -> dict[str, int]:
    """Called by Vercel Cron. Checkout and the order pages also expire due
    orders as they go, so a missed run only delays the clean-up."""
    secret = get_settings().cron_secret
    if not secret:
        raise NotFoundError()
    if not authorization or not hmac.compare_digest(authorization, f"Bearer {secret}"):
        raise UnauthorizedError()
    expired = workflow.expire_due(db, limit=500)
    db.commit()
    return {"expired": len(expired)}
