"""Signed-in shoppers' carts. Prices are never stored here; carts are priced live."""

from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, id_column
from app.models.catalog import ProductVariant

MAX_CART_QUANTITY = 10


class Cart(TimestampMixin, Base):
    __tablename__ = "carts"

    id: Mapped[int] = id_column()
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), unique=True
    )

    items: Mapped[list["CartItem"]] = relationship(
        back_populates="cart", cascade="all, delete-orphan", order_by="CartItem.id", lazy="raise"
    )


class CartItem(TimestampMixin, Base):
    __tablename__ = "cart_items"

    id: Mapped[int] = id_column()
    cart_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("carts.id", ondelete="CASCADE"))
    variant_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("product_variants.id", ondelete="CASCADE"), index=True
    )
    quantity: Mapped[int] = mapped_column(Integer)

    cart: Mapped[Cart] = relationship(back_populates="items", lazy="raise")
    variant: Mapped[ProductVariant] = relationship(lazy="raise")

    __table_args__ = (
        UniqueConstraint("cart_id", "variant_id"),
        CheckConstraint(f"quantity BETWEEN 1 AND {MAX_CART_QUANTITY}", name="quantity_range"),
    )
