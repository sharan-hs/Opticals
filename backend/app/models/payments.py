"""Payment attempts, the webhook inbox, and refunds. No card data is ever received."""

from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedAtMixin, TimestampMixin, enum_column, id_column
from app.models.enums import PaymentAttemptStatus, PaymentProviderName, RefundStatus
from app.models.orders import Order


class Payment(TimestampMixin, Base):
    """One attempt to pay for an order (an order may need several)."""

    __tablename__ = "payments"

    id: Mapped[int] = id_column()
    order_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("orders.id", ondelete="RESTRICT"), index=True
    )
    provider: Mapped[PaymentProviderName] = enum_column(PaymentProviderName)
    provider_order_id: Mapped[str] = mapped_column(String(64), unique=True)
    provider_payment_id: Mapped[str | None] = mapped_column(String(64), unique=True)
    amount_paise: Mapped[int] = mapped_column(BigInteger)
    currency: Mapped[str] = mapped_column(String(3), default="INR", server_default="INR")
    status: Mapped[PaymentAttemptStatus] = enum_column(
        PaymentAttemptStatus,
        default=PaymentAttemptStatus.CREATED,
        server_default=PaymentAttemptStatus.CREATED.value,
    )
    method: Mapped[str | None] = mapped_column(String(20))  # upi, card, netbanking, wallet
    error_code: Mapped[str | None] = mapped_column(String(60))
    error_description: Mapped[str | None] = mapped_column(Text)
    raw: Mapped[dict[str, Any] | None] = mapped_column(JSONB)

    order: Mapped[Order] = relationship(back_populates="payments", lazy="raise")
    refunds: Mapped[list["Refund"]] = relationship(back_populates="payment", lazy="raise")

    __table_args__ = (CheckConstraint("amount_paise > 0", name="amount_positive"),)


class PaymentEvent(CreatedAtMixin, Base):
    """Webhook inbox. The unique event id makes redelivered webhooks harmless."""

    __tablename__ = "payment_events"

    id: Mapped[int] = id_column()
    provider: Mapped[PaymentProviderName] = enum_column(PaymentProviderName)
    event_id: Mapped[str] = mapped_column(String(100), unique=True)
    event_type: Mapped[str] = mapped_column(String(60))
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB)
    signature_valid: Mapped[bool] = mapped_column(Boolean)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error: Mapped[str | None] = mapped_column(Text)


class Refund(TimestampMixin, Base):
    __tablename__ = "refunds"

    id: Mapped[int] = id_column()
    payment_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("payments.id", ondelete="RESTRICT"), index=True
    )
    provider_refund_id: Mapped[str | None] = mapped_column(String(64), unique=True)
    amount_paise: Mapped[int] = mapped_column(BigInteger)
    status: Mapped[RefundStatus] = enum_column(
        RefundStatus,
        default=RefundStatus.PENDING,
        server_default=RefundStatus.PENDING.value,
    )
    reason: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL")
    )

    payment: Mapped[Payment] = relationship(back_populates="refunds", lazy="raise")

    __table_args__ = (CheckConstraint("amount_paise > 0", name="amount_positive"),)
