"""All models live in this package so Alembic sees one metadata.

Import every model module here as it is added.
"""

from app.models.admin import AuditLog, StoreSetting
from app.models.base import Base
from app.models.cart import Cart, CartItem
from app.models.catalog import Brand, Category, Product, ProductImage, ProductVariant
from app.models.identity import Address, PasswordResetToken, RefreshToken, User
from app.models.inventory import Inventory, InventoryTransaction
from app.models.orders import Order, OrderItem, OrderStatusHistory
from app.models.payments import Payment, PaymentEvent, Refund
from app.models.rate_limit import RateLimitBucket

__all__ = [
    "Address",
    "AuditLog",
    "Base",
    "Brand",
    "Cart",
    "CartItem",
    "Category",
    "Inventory",
    "InventoryTransaction",
    "Order",
    "OrderItem",
    "OrderStatusHistory",
    "PasswordResetToken",
    "Payment",
    "PaymentEvent",
    "Product",
    "ProductImage",
    "ProductVariant",
    "RateLimitBucket",
    "RefreshToken",
    "Refund",
    "StoreSetting",
    "User",
]
