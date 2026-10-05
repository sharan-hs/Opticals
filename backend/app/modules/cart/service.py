"""The shopper's cart. Prices are never stored: every response is priced from
the database at that moment, so a stale or tampered price can't reach
checkout. Stock is checked when quantities go up, but nothing is held until
an order is placed (Phase 8).

Lines are addressed by variant id, the same key the browser's guest cart
uses. Every change locks the user's cart row, so two tabs can't interleave.
"""

from collections.abc import Iterable
from dataclasses import dataclass

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session, selectinload

from app.core.errors import AppError, ConflictError, NotFoundError
from app.models import Cart, CartItem, Product, ProductVariant, User
from app.models.cart import MAX_CART_QUANTITY
from app.models.enums import ProductStatus
from app.modules.cart.schemas import (
    MAX_CART_LINES,
    CartLine,
    CartLineIn,
    CartMergeOut,
    CartOut,
    LineIssue,
)
from app.modules.catalog.queries import visible_products
from app.modules.catalog.schemas import ImageOut
from app.modules.catalog.service import primary_image


class StockLimitError(AppError):
    status_code = 409
    code = "INSUFFICIENT_STOCK"


class QuantityLimitError(ConflictError):
    code = "QUANTITY_LIMIT"
    message = f"You can order up to {MAX_CART_QUANTITY} of each item."


class CartFullError(ConflictError):
    code = "CART_FULL"
    message = f"Your cart can hold up to {MAX_CART_LINES} different items."


class UnavailableError(NotFoundError):
    message = "This item is no longer available."


@dataclass(frozen=True)
class _Line:
    variant_id: int
    quantity: int


# --- pricing ----------------------------------------------------------------


@dataclass(frozen=True)
class _Catalogue:
    variants: dict[int, ProductVariant]
    visible_product_ids: set[int]

    def purchasable(self, variant: ProductVariant) -> bool:
        return (
            variant.is_active
            and variant.deleted_at is None
            and variant.product_id in self.visible_product_ids
        )


def _load(db: Session, variant_ids: Iterable[int]) -> _Catalogue:
    ids = set(variant_ids)
    if not ids:
        return _Catalogue({}, set())
    variants = db.scalars(
        select(ProductVariant)
        .where(ProductVariant.id.in_(ids))
        .options(
            selectinload(ProductVariant.inventory),
            selectinload(ProductVariant.images),
            selectinload(ProductVariant.product).selectinload(Product.brand),
            selectinload(ProductVariant.product).selectinload(Product.images),
        )
    ).all()
    product_ids = {v.product_id for v in variants}
    visible = db.scalars(
        visible_products().with_only_columns(Product.id).where(Product.id.in_(product_ids))
    ).all()
    return _Catalogue({v.id: v for v in variants}, set(visible))


def _available(variant: ProductVariant) -> int:
    inventory = variant.inventory
    return max(0, inventory.on_hand - inventory.reserved) if inventory else 0


def _issue(catalogue: _Catalogue, variant: ProductVariant, quantity: int) -> LineIssue | None:
    if not catalogue.purchasable(variant):
        return "INACTIVE"
    available = _available(variant)
    if available == 0:
        return "OUT_OF_STOCK"
    if quantity > available:
        return "INSUFFICIENT_STOCK"
    return None


def _price(catalogue: _Catalogue, lines: Iterable[_Line], *, public: bool = False) -> CartOut:
    priced: list[CartLine] = []
    for line in lines:
        variant = catalogue.variants.get(line.variant_id)
        # A guest can send any id: never reveal a product that was never live.
        if variant is None or (public and variant.product.status == ProductStatus.DRAFT):
            continue
        product = variant.product
        issue = _issue(catalogue, variant, line.quantity)
        image = primary_image(product, [variant])
        priced.append(
            CartLine(
                variant_id=variant.id,
                sku=variant.sku,
                color_name=variant.color_name,
                product_slug=product.slug,
                product_name=f"{product.brand.name} {product.name}",
                image=ImageOut.model_validate(image) if image else None,
                quantity=line.quantity,
                unit_price_paise=variant.price_paise,
                mrp_paise=variant.mrp_paise,
                line_total_paise=variant.price_paise * line.quantity,
                max_quantity=(
                    0 if issue == "INACTIVE" else min(_available(variant), MAX_CART_QUANTITY)
                ),
                issue=issue,
            )
        )
    buyable = [p for p in priced if p.issue is None]
    return CartOut(
        lines=priced,
        item_count=sum(p.quantity for p in priced),
        subtotal_paise=sum(p.line_total_paise for p in buyable),
        savings_paise=sum((p.mrp_paise - p.unit_price_paise) * p.quantity for p in buyable),
        has_issues=len(buyable) < len(priced),
    )


def _combine(items: Iterable[CartLineIn], cap: int | None = MAX_CART_QUANTITY) -> list[_Line]:
    """One line per colour, quantities summed (and capped), first-seen order."""
    totals: dict[int, int] = {}
    for item in items:
        totals[item.variant_id] = totals.get(item.variant_id, 0) + item.quantity
    return [_Line(vid, min(qty, cap) if cap else qty) for vid, qty in totals.items()]


def preview(db: Session, items: Iterable[CartLineIn]) -> CartOut:
    """Prices a guest cart without storing anything."""
    lines = _combine(items)
    return _price(_load(db, (line.variant_id for line in lines)), lines, public=True)


# --- the signed-in user's cart ---------------------------------------------


def _items(db: Session, user: User) -> list[CartItem]:
    return list(
        db.scalars(
            select(CartItem)
            .join(Cart, Cart.id == CartItem.cart_id)
            .where(Cart.user_id == user.id)
            .order_by(CartItem.id)
        )
    )


def get_cart(db: Session, user: User) -> CartOut:
    lines = [_Line(item.variant_id, item.quantity) for item in _items(db, user)]
    return _price(_load(db, (line.variant_id for line in lines)), lines)


def _locked_cart(db: Session, user: User) -> Cart:
    """The user's cart, created on first use, locked until the caller commits."""
    db.execute(insert(Cart).values(user_id=user.id).on_conflict_do_nothing())
    return db.scalars(
        select(Cart)
        .where(Cart.user_id == user.id)
        .options(selectinload(Cart.items))
        .with_for_update()
        .execution_options(populate_existing=True)
    ).one()


def _save(db: Session, cart: Cart) -> None:
    cart.updated_at = func.now()  # for abandoned-cart reports
    db.commit()


def _require_purchasable(db: Session, variant_id: int) -> tuple[_Catalogue, ProductVariant]:
    catalogue = _load(db, [variant_id])
    variant = catalogue.variants.get(variant_id)
    if variant is None or not catalogue.purchasable(variant):
        raise UnavailableError()
    return catalogue, variant


def _check_stock(variant: ProductVariant, quantity: int, in_cart: int = 0) -> None:
    available = _available(variant)
    if quantity <= available:
        return
    if available == 0:
        message, code = "This item is out of stock.", "OUT_OF_STOCK"
    else:
        message, code = f"Only {available} left in stock.", "INSUFFICIENT_STOCK"
    if in_cart:
        message += f" You already have {in_cart} in your cart."
    raise StockLimitError(
        message,
        code=code,
        details={"variant_id": variant.id, "max_quantity": min(available, MAX_CART_QUANTITY)},
    )


def _find(cart: Cart, variant_id: int) -> CartItem | None:
    return next((item for item in cart.items if item.variant_id == variant_id), None)


def add_item(db: Session, user: User, variant_id: int, quantity: int) -> CartOut:
    """Adds to the line for this colour (quantities merge)."""
    cart = _locked_cart(db, user)
    _, variant = _require_purchasable(db, variant_id)
    item = _find(cart, variant_id)
    in_cart = item.quantity if item else 0
    wanted = in_cart + quantity
    if wanted > MAX_CART_QUANTITY:
        raise QuantityLimitError(details={"max_quantity": MAX_CART_QUANTITY, "in_cart": in_cart})
    _check_stock(variant, wanted, in_cart)
    if item is not None:
        item.quantity = wanted
    elif len(cart.items) >= MAX_CART_LINES:
        raise CartFullError()
    else:
        cart.items.append(CartItem(variant_id=variant_id, quantity=wanted))
    _save(db, cart)
    return get_cart(db, user)


def set_quantity(db: Session, user: User, variant_id: int, quantity: int) -> CartOut:
    """Lowering a quantity always works (it's how a stock issue gets fixed);
    raising it needs the stock."""
    cart = _locked_cart(db, user)
    item = _find(cart, variant_id)
    if item is None:
        raise NotFoundError("This item isn't in your cart.")
    if quantity > item.quantity:
        _, variant = _require_purchasable(db, variant_id)
        _check_stock(variant, quantity)
    item.quantity = quantity
    _save(db, cart)
    return get_cart(db, user)


def remove_item(db: Session, user: User, variant_id: int) -> CartOut:
    """Idempotent: removing a line that isn't there just returns the cart."""
    cart = _locked_cart(db, user)
    item = _find(cart, variant_id)
    if item is not None:
        cart.items.remove(item)
        _save(db, cart)
    else:
        db.commit()
    return get_cart(db, user)


def clear(db: Session, user: User) -> None:
    db.execute(
        delete(CartItem).where(CartItem.cart_id.in_(select(Cart.id).where(Cart.user_id == user.id)))
    )
    db.commit()


def merge(db: Session, user: User, items: Iterable[CartLineIn]) -> CartMergeOut:
    """Adds a guest cart to the user's cart after sign-in. Quantities are
    summed, then lowered to the per-item limit and to what's in stock; colours
    no longer sold are dropped. Out-of-stock colours are kept (shown as such),
    so nothing the shopper chose silently disappears."""
    guest = _combine(items, cap=None)  # capped below, so the cut is reported
    cart = _locked_cart(db, user)
    catalogue = _load(db, (line.variant_id for line in guest))
    adjusted: list[int] = []
    for line in guest:
        variant = catalogue.variants.get(line.variant_id)
        if variant is None or not catalogue.purchasable(variant):
            adjusted.append(line.variant_id)
            continue
        item = _find(cart, line.variant_id)
        wanted = (item.quantity if item else 0) + line.quantity
        allowed = min(wanted, MAX_CART_QUANTITY)
        if available := _available(variant):
            allowed = min(allowed, available)
        if allowed < wanted:
            adjusted.append(line.variant_id)
        if item is not None:
            item.quantity = allowed
        elif len(cart.items) < MAX_CART_LINES:
            cart.items.append(CartItem(variant_id=line.variant_id, quantity=allowed))
        else:
            adjusted.append(line.variant_id)
    _save(db, cart)
    priced = get_cart(db, user)
    return CartMergeOut(**priced.model_dump(), adjusted_variant_ids=sorted(set(adjusted)))
