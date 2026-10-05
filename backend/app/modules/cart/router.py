from fastapi import APIRouter, Depends, Response, status

from app.core.deps import CurrentUser, DbSession
from app.modules.cart import service
from app.modules.cart.schemas import CartLineIn, CartMergeOut, CartOut, GuestCartIn, QuantityIn


def _no_store(response: Response) -> None:
    # Personal and priced live: never cached by the browser or the CDN.
    response.headers["Cache-Control"] = "no-store"


router = APIRouter(prefix="/cart", tags=["cart"], dependencies=[Depends(_no_store)])


@router.get("")
def get_cart(user: CurrentUser, db: DbSession) -> CartOut:
    return service.get_cart(db, user)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_cart(user: CurrentUser, db: DbSession) -> None:
    service.clear(db, user)


@router.post("/items")
def add_item(body: CartLineIn, user: CurrentUser, db: DbSession) -> CartOut:
    return service.add_item(db, user, body.variant_id, body.quantity)


@router.patch("/items/{variant_id}")
def set_quantity(variant_id: int, body: QuantityIn, user: CurrentUser, db: DbSession) -> CartOut:
    return service.set_quantity(db, user, variant_id, body.quantity)


@router.delete("/items/{variant_id}")
def remove_item(variant_id: int, user: CurrentUser, db: DbSession) -> CartOut:
    return service.remove_item(db, user, variant_id)


@router.post("/merge")
def merge_guest_cart(body: GuestCartIn, user: CurrentUser, db: DbSession) -> CartMergeOut:
    """Called once right after sign-in with the browser's guest cart."""
    return service.merge(db, user, body.items)


@router.post("/preview")
def preview(body: GuestCartIn, db: DbSession) -> CartOut:
    """Prices a guest cart (no sign-in needed, nothing stored)."""
    return service.preview(db, body.items)
