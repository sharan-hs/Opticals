from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import FulfilmentMethod, OrderStatus, PaymentMethod, PaymentStatus
from app.modules.cart.schemas import CartLine
from app.modules.settings.service import Store

Note = Annotated[str, Field(max_length=500)]
# A UPI transaction reference (UTR) is 12 digits; some apps show other ids,
# so anything reasonable is accepted and the shop checks it.
PaymentReference = Annotated[str, Field(min_length=6, max_length=40, pattern=r"^[A-Za-z0-9-]+$")]


# --- checkout -------------------------------------------------------------------


class UpiOption(BaseModel):
    enabled: bool
    payment_window_minutes: int


class PayAtStoreOption(BaseModel):
    enabled: bool
    hold_days: int


class CheckoutOptions(BaseModel):
    upi: UpiOption  # delivery, pay now by UPI
    pay_at_store: PayAtStoreOption  # pick up and pay at a store
    stores: list[Store]
    delivery_fee_paise: int


class QuoteRequest(BaseModel):
    payment_method: PaymentMethod = PaymentMethod.UPI


class Quote(BaseModel):
    lines: list[CartLine]
    item_count: int
    subtotal_paise: int
    delivery_fee_paise: int
    total_paise: int
    savings_paise: int
    has_issues: bool
    options: CheckoutOptions


class PlaceOrderRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    payment_method: PaymentMethod
    address_id: int | None = None  # UPI orders are delivered here
    store_id: str | None = None  # pay-at-store orders are collected here
    customer_note: Note | None = None
    # The total the customer saw; if prices changed since, the order is refused.
    expected_total_paise: Annotated[int, Field(ge=0)]


class SubmitPaymentRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    reference: PaymentReference


class CancelRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    reason: Note | None = None


# --- orders (customer) ---------------------------------------------------------


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    variant_id: int
    product_name: str
    variant_label: str
    sku: str
    image_public_id: str | None
    unit_mrp_paise: int
    unit_price_paise: int
    quantity: int
    line_total_paise: int


class TimelineEntry(BaseModel):
    status: OrderStatus
    at: datetime
    note: str | None = None


class UpiInstructions(BaseModel):
    upi_id: str
    payee_name: str
    amount_paise: int
    upi_uri: str  # upi://pay?... for the "Pay with a UPI app" button and the QR code
    pay_by: datetime
    reference_submitted: str | None


class OrderSummary(BaseModel):
    order_number: str
    status: OrderStatus
    payment_status: PaymentStatus
    payment_method: PaymentMethod
    fulfilment: FulfilmentMethod
    placed_at: datetime
    total_paise: int
    item_count: int
    first_item_name: str
    first_item_image: str | None


class OrderDetail(OrderSummary):
    items: list[OrderItemOut]
    subtotal_paise: int
    delivery_fee_paise: int
    tax_paise: int  # GST included in the total
    shipping_address: dict[str, Any] | None
    pickup_store: dict[str, Any] | None
    customer_note: str | None
    expires_at: datetime | None
    paid_at: datetime | None
    shipped_at: datetime | None
    delivered_at: datetime | None
    cancelled_at: datetime | None
    cancel_reason: str | None
    courier_name: str | None
    tracking_number: str | None
    tracking_url: str | None
    timeline: list[TimelineEntry]
    upi: UpiInstructions | None  # while a UPI payment is still expected
    can_cancel: bool


# --- admin -------------------------------------------------------------------------


class AdminOrderRow(BaseModel):
    order_number: str
    placed_at: datetime
    customer_name: str
    customer_email: str
    customer_phone: str | None
    status: OrderStatus
    payment_status: PaymentStatus
    payment_method: PaymentMethod
    fulfilment: FulfilmentMethod
    total_paise: int
    item_count: int
    payment_reference: str | None
    expires_at: datetime | None


class AdminHistoryEntry(BaseModel):
    from_status: OrderStatus | None
    to_status: OrderStatus
    note: str | None
    at: datetime
    by: str | None  # staff name; None when the customer or the system did it


class AdminPayment(BaseModel):
    id: int
    status: str
    amount_paise: int
    method: str | None
    reference: str | None  # confirmed reference, else what the customer reported
    reported_at: str | None
    created_at: datetime


class AdminOrderDetail(OrderDetail):
    customer_name: str
    customer_email: str
    customer_phone: str | None
    contact_phone: str | None
    history: list[AdminHistoryEntry]
    payments: list[AdminPayment]
    actions: list[str]  # what the admin can do now, e.g. ["confirm_payment", "cancel"]


class OrderCounts(BaseModel):
    to_verify: int  # UPI payments reported, waiting for the shop to check
    awaiting_pickup: int
    to_ship: int
    refunds_pending: int


class ConfirmPaymentRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    reference: PaymentReference | None = None
    note: Note | None = None


class RejectPaymentRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    note: Annotated[str, Field(min_length=3, max_length=500)]


class AdminCancelRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    reason: Annotated[str, Field(min_length=3, max_length=500)]


class StatusUpdateRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    status: Literal["PROCESSING", "SHIPPED", "DELIVERED"]
    courier_name: Annotated[str, Field(max_length=60)] | None = None
    tracking_number: Annotated[str, Field(max_length=60)] | None = None
    tracking_url: Annotated[str, Field(max_length=500, pattern=r"^https?://")] | None = None
    note: Note | None = None


class NoteRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    note: Note | None = None
