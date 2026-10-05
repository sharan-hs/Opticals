"""Allowed values for status-like columns. Adding a value needs a migration
that updates the column's CHECK constraint."""

from enum import StrEnum


class UserRole(StrEnum):
    CUSTOMER = "CUSTOMER"
    ADMIN = "ADMIN"


class ProductStatus(StrEnum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class Gender(StrEnum):
    MEN = "MEN"
    WOMEN = "WOMEN"
    UNISEX = "UNISEX"
    KIDS = "KIDS"


class FrameType(StrEnum):
    FULL_RIM = "FULL_RIM"
    HALF_RIM = "HALF_RIM"
    RIMLESS = "RIMLESS"


class FrameShape(StrEnum):
    WAYFARER = "WAYFARER"
    AVIATOR = "AVIATOR"
    ROUND = "ROUND"
    RECTANGLE = "RECTANGLE"
    SQUARE = "SQUARE"
    CAT_EYE = "CAT_EYE"
    OVAL = "OVAL"
    CLUBMASTER = "CLUBMASTER"
    GEOMETRIC = "GEOMETRIC"
    WRAP = "WRAP"


class FrameMaterial(StrEnum):
    METAL = "METAL"
    ACETATE = "ACETATE"
    TR90 = "TR90"
    TITANIUM = "TITANIUM"
    PLASTIC = "PLASTIC"
    MIXED = "MIXED"


class ColorFamily(StrEnum):
    """Normalised colour for filtering; the variant keeps its own colour name."""

    BLACK = "BLACK"
    BROWN = "BROWN"
    TORTOISE = "TORTOISE"
    GOLD = "GOLD"
    ROSE_GOLD = "ROSE_GOLD"
    SILVER = "SILVER"
    GUNMETAL = "GUNMETAL"
    GREY = "GREY"
    WHITE = "WHITE"
    BLUE = "BLUE"
    GREEN = "GREEN"
    PINK = "PINK"
    RED = "RED"
    PURPLE = "PURPLE"
    TRANSPARENT = "TRANSPARENT"
    MULTI = "MULTI"


class InventoryTransactionType(StrEnum):
    RESTOCK = "RESTOCK"
    ADJUSTMENT = "ADJUSTMENT"
    SALE = "SALE"
    RETURN = "RETURN"
    DAMAGE = "DAMAGE"
    CORRECTION = "CORRECTION"


class OrderStatus(StrEnum):
    PENDING_PAYMENT = "PENDING_PAYMENT"
    CONFIRMED = "CONFIRMED"
    PROCESSING = "PROCESSING"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


class PaymentStatus(StrEnum):
    """Order-level payment state, tracked separately from fulfilment."""

    UNPAID = "UNPAID"
    VERIFYING = "VERIFYING"  # the customer says they've paid; the shop is checking
    PAID = "PAID"
    REFUND_PENDING = "REFUND_PENDING"
    REFUNDED = "REFUNDED"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"
    FAILED = "FAILED"


class PaymentProviderName(StrEnum):
    RAZORPAY = "RAZORPAY"
    MANUAL = "MANUAL"  # UPI to the shop's own ID, or paid at the store; confirmed by staff
    FAKE = "FAKE"  # local development and tests


class PaymentMethod(StrEnum):
    """How the customer chose to pay at checkout."""

    UPI = "UPI"  # to the shop's UPI ID, checked by staff
    PAY_AT_STORE = "PAY_AT_STORE"


class FulfilmentMethod(StrEnum):
    DELIVERY = "DELIVERY"
    PICKUP = "PICKUP"


class PaymentAttemptStatus(StrEnum):
    CREATED = "CREATED"
    AUTHORIZED = "AUTHORIZED"
    CAPTURED = "CAPTURED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class RefundStatus(StrEnum):
    PENDING = "PENDING"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"
