"""Orders. Everything a customer saw at checkout (prices, names, address) is
copied onto the order so later catalogue edits never change history."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedAtMixin, TimestampMixin, enum_column, id_column
from app.models.enums import OrderStatus, PaymentStatus

if TYPE_CHECKING:
    from app.models.payments import Payment


class Order(TimestampMixin, Base):
    __tablename__ = "orders"

    id: Mapped[int] = id_column()
    # Human-friendly and used in customer URLs, e.g. VO-261004-0042.
    order_number: Mapped[str] = mapped_column(String(20), unique=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="RESTRICT"))
    status: Mapped[OrderStatus] = enum_column(
        OrderStatus,
        default=OrderStatus.PENDING_PAYMENT,
        server_default=OrderStatus.PENDING_PAYMENT.value,
    )
    payment_status: Mapped[PaymentStatus] = enum_column(
        PaymentStatus,
        default=PaymentStatus.UNPAID,
        server_default=PaymentStatus.UNPAID.value,
    )
    currency: Mapped[str] = mapped_column(String(3), default="INR", server_default="INR")
    # Prices include GST; tax_paise is the GST contained in the total, for invoices.
    subtotal_paise: Mapped[int] = mapped_column(BigInteger)
    discount_paise: Mapped[int] = mapped_column(BigInteger, default=0, server_default="0")
    shipping_paise: Mapped[int] = mapped_column(BigInteger, default=0, server_default="0")
    tax_paise: Mapped[int] = mapped_column(BigInteger, default=0, server_default="0")
    total_paise: Mapped[int] = mapped_column(BigInteger)
    coupon_code: Mapped[str | None] = mapped_column(String(30))
    # {full_name, phone, line1, line2, landmark, city, state, pincode, country}
    shipping_address: Mapped[dict[str, Any]] = mapped_column(JSONB)
    contact_email: Mapped[str] = mapped_column(String(254))
    contact_phone: Mapped[str | None] = mapped_column(String(16))
    customer_note: Mapped[str | None] = mapped_column(Text)
    courier_name: Mapped[str | None] = mapped_column(String(60))
    tracking_number: Mapped[str | None] = mapped_column(String(60))
    tracking_url: Mapped[str | None] = mapped_column(String(500))
    # End of the payment window while PENDING_PAYMENT; reserved stock is released after it.
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    placed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    shipped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancel_reason: Mapped[str | None] = mapped_column(Text)
    # Sent by the checkout page once per attempt; a retry returns the same order.
    idempotency_key: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))

    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", order_by="OrderItem.id", lazy="raise"
    )
    status_history: Mapped[list["OrderStatusHistory"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
        order_by="OrderStatusHistory.created_at",
        lazy="raise",
    )
    payments: Mapped[list["Payment"]] = relationship(
        back_populates="order", order_by="Payment.id", lazy="raise"
    )

    __table_args__ = (
        UniqueConstraint("user_id", "idempotency_key"),
        CheckConstraint(
            "subtotal_paise >= 0 AND discount_paise >= 0 AND shipping_paise >= 0 "
            "AND tax_paise >= 0 AND total_paise >= 0",
            name="amounts_not_negative",
        ),
        CheckConstraint(
            "total_paise = subtotal_paise - discount_paise + shipping_paise",
            name="total_adds_up",
        ),
        CheckConstraint("tax_paise <= total_paise", name="tax_within_total"),
        CheckConstraint("discount_paise <= subtotal_paise", name="discount_within_subtotal"),
        CheckConstraint("currency = 'INR'", name="currency_inr"),
        CheckConstraint(
            "status <> 'PENDING_PAYMENT' OR expires_at IS NOT NULL",
            name="pending_has_expiry",
        ),
        Index("ix_orders_user_created", "user_id", text("created_at DESC")),
        Index("ix_orders_status_created", "status", text("created_at DESC")),
        Index("ix_orders_payment_status", "payment_status"),
        Index("ix_orders_created_at", "created_at"),
        # The expiry sweep only looks at unpaid orders.
        Index(
            "ix_orders_pending_expires_at",
            "expires_at",
            postgresql_where=text("status = 'PENDING_PAYMENT'"),
        ),
    )


class OrderItem(CreatedAtMixin, Base):
    """Immutable snapshot of one line as the customer bought it."""

    __tablename__ = "order_items"

    id: Mapped[int] = id_column()
    order_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("orders.id", ondelete="CASCADE"), index=True
    )
    variant_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("product_variants.id", ondelete="RESTRICT"), index=True
    )
    product_name: Mapped[str] = mapped_column(String(200))
    variant_label: Mapped[str] = mapped_column(String(100))
    sku: Mapped[str] = mapped_column(String(40))
    image_public_id: Mapped[str | None] = mapped_column(String(255))
    unit_mrp_paise: Mapped[int] = mapped_column(BigInteger)
    unit_price_paise: Mapped[int] = mapped_column(BigInteger)
    quantity: Mapped[int] = mapped_column(Integer)
    line_total_paise: Mapped[int] = mapped_column(BigInteger)
    # GST rate in basis points (1800 = 18%), recorded for the invoice.
    gst_rate_bp: Mapped[int | None] = mapped_column(SmallInteger)
    # Future: lens choice / prescription attached to a frame line.
    configuration: Mapped[dict[str, Any] | None] = mapped_column(JSONB)

    order: Mapped[Order] = relationship(back_populates="items", lazy="raise")

    __table_args__ = (
        CheckConstraint("quantity > 0", name="quantity_positive"),
        CheckConstraint(
            "unit_price_paise > 0 AND unit_price_paise <= unit_mrp_paise",
            name="price_within_mrp",
        ),
        CheckConstraint(
            "line_total_paise = unit_price_paise * quantity", name="line_total_adds_up"
        ),
        CheckConstraint("gst_rate_bp BETWEEN 0 AND 10000", name="gst_rate_range"),
    )


class OrderStatusHistory(CreatedAtMixin, Base):
    __tablename__ = "order_status_history"

    id: Mapped[int] = id_column()
    order_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("orders.id", ondelete="CASCADE"))
    # NULL for the first entry (order created).
    from_status: Mapped[OrderStatus | None] = enum_column(OrderStatus)
    to_status: Mapped[OrderStatus] = enum_column(OrderStatus)
    note: Mapped[str | None] = mapped_column(Text)
    # NULL when the system or a payment webhook made the change.
    changed_by: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL")
    )

    order: Mapped[Order] = relationship(back_populates="status_history", lazy="raise")

    __table_args__ = (Index("ix_order_status_history_order_created", "order_id", "created_at"),)
