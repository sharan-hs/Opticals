"""order payment method and fulfilment

Revision ID: d258808a1f1a
Revises: a3ca24be4018
Create Date: 2026-10-05 22:17:58.037857

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "d258808a1f1a"
down_revision: str | Sequence[str] | None = "a3ca24be4018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


PAYMENT_STATUSES_BEFORE = (
    "'UNPAID', 'PAID', 'REFUND_PENDING', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED'"
)
PAYMENT_STATUSES_AFTER = (
    "'UNPAID', 'VERIFYING', 'PAID', 'REFUND_PENDING', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED'"
)
PROVIDERS_BEFORE = "'RAZORPAY', 'FAKE'"
PROVIDERS_AFTER = "'RAZORPAY', 'MANUAL', 'FAKE'"


def _replace_check(table: str, column: str, values: str) -> None:
    op.drop_constraint(op.f(f"ck_{table}_{column}"), table, type_="check")
    op.create_check_constraint(op.f(f"ck_{table}_{column}"), table, f"{column} IN ({values})")


def upgrade() -> None:
    """How each order is paid for and handed over; order numbers."""
    # No orders exist before this revision; the defaults only satisfy NOT NULL.
    op.add_column(
        "orders",
        sa.Column(
            "payment_method",
            sa.Enum("UPI", "PAY_AT_STORE", name="paymentmethod", native_enum=False, length=20),
            nullable=False,
            server_default="UPI",
        ),
    )
    op.add_column(
        "orders",
        sa.Column(
            "fulfilment",
            sa.Enum("DELIVERY", "PICKUP", name="fulfilmentmethod", native_enum=False, length=20),
            nullable=False,
            server_default="DELIVERY",
        ),
    )
    op.alter_column("orders", "payment_method", server_default=None)
    op.alter_column("orders", "fulfilment", server_default=None)
    op.add_column(
        "orders", sa.Column("pickup_store", postgresql.JSONB(astext_type=sa.Text()), nullable=True)
    )
    op.alter_column(
        "orders",
        "shipping_address",
        existing_type=postgresql.JSONB(astext_type=sa.Text()),
        nullable=True,
    )
    op.create_check_constraint(
        op.f("ck_orders_payment_method"), "orders", "payment_method IN ('UPI', 'PAY_AT_STORE')"
    )
    op.create_check_constraint(
        op.f("ck_orders_fulfilment"), "orders", "fulfilment IN ('DELIVERY', 'PICKUP')"
    )
    op.create_check_constraint(
        op.f("ck_orders_destination_matches_fulfilment"),
        "orders",
        "(fulfilment = 'DELIVERY') = (shipping_address IS NOT NULL) "
        "AND (fulfilment = 'PICKUP') = (pickup_store IS NOT NULL)",
    )
    _replace_check("orders", "payment_status", PAYMENT_STATUSES_AFTER)
    _replace_check("payments", "provider", PROVIDERS_AFTER)
    # VO-YYMMDD-NNNN takes NNNN from here (never reused, even after a rollback).
    op.execute("CREATE SEQUENCE order_number_seq")


def downgrade() -> None:
    op.execute("DROP SEQUENCE order_number_seq")
    _replace_check("payments", "provider", PROVIDERS_BEFORE)
    _replace_check("orders", "payment_status", PAYMENT_STATUSES_BEFORE)
    op.drop_constraint(op.f("ck_orders_destination_matches_fulfilment"), "orders", type_="check")
    op.drop_constraint(op.f("ck_orders_fulfilment"), "orders", type_="check")
    op.drop_constraint(op.f("ck_orders_payment_method"), "orders", type_="check")
    op.alter_column(
        "orders",
        "shipping_address",
        existing_type=postgresql.JSONB(astext_type=sa.Text()),
        nullable=False,
    )
    op.drop_column("orders", "pickup_store")
    op.drop_column("orders", "fulfilment")
    op.drop_column("orders", "payment_method")
