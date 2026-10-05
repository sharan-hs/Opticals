from typing import Annotated, Literal

from pydantic import BaseModel, Field

from app.models.cart import MAX_CART_QUANTITY
from app.modules.catalog.schemas import ImageOut

MAX_CART_LINES = 30

Quantity = Annotated[int, Field(ge=1, le=MAX_CART_QUANTITY)]

# Why a line can't be bought as it stands. Checkout is blocked until it's fixed.
#   INACTIVE            the product or colour is no longer sold
#   OUT_OF_STOCK        none available
#   INSUFFICIENT_STOCK  fewer available than the quantity in the cart
LineIssue = Literal["INACTIVE", "OUT_OF_STOCK", "INSUFFICIENT_STOCK"]


class CartLineIn(BaseModel):
    variant_id: int
    quantity: Quantity


class QuantityIn(BaseModel):
    quantity: Quantity


class GuestCartIn(BaseModel):
    """A guest cart from the browser: priced (/cart/preview) or merged at login."""

    items: list[CartLineIn] = Field(max_length=50)


class CartLine(BaseModel):
    variant_id: int
    sku: str
    color_name: str
    product_slug: str
    product_name: str  # brand and name, e.g. "Ray-Ban RB4349"
    image: ImageOut | None
    quantity: int
    unit_price_paise: int  # today's price, always from the database
    mrp_paise: int
    line_total_paise: int
    max_quantity: int  # how many can be ordered right now (stock and per-item limit)
    issue: LineIssue | None


class CartOut(BaseModel):
    lines: list[CartLine]
    item_count: int  # every unit in the cart, for the header badge
    subtotal_paise: int  # lines without an issue
    savings_paise: int  # MRP minus price, same lines
    has_issues: bool


class CartMergeOut(CartOut):
    # Colours whose quantity was lowered to the stock or limit, or dropped
    # because they're no longer sold.
    adjusted_variant_ids: list[int]
