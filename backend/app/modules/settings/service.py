"""Shop settings the owner edits in Admin → Settings.

Stored one key per row in store_settings; a key that was never saved falls
back to its default, so a fresh database works without any setup.
"""

import re
from typing import Annotated, Any

from pydantic import AfterValidator, BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core import audit
from app.core.errors import BusinessRuleError
from app.models import StoreSetting, User
from app.modules.auth.schemas import Email

# Structurally valid but routed nowhere: no money can reach a stranger
# while the shop's real UPI ID hasn't been entered yet.
PLACEHOLDER_UPI_ID = "vijaiopticians@example"

_UPI_ID = re.compile(r"^[A-Za-z0-9.\-_]{2,256}@[A-Za-z][A-Za-z0-9]{1,64}$")


def _check_upi_id(value: str) -> str:
    value = value.strip()
    if not _UPI_ID.match(value):
        raise ValueError("Enter a UPI ID like 9731307237@ybl or shopname@okhdfcbank")
    return value


UpiId = Annotated[str, AfterValidator(_check_upi_id)]


class Store(BaseModel):
    """A shop customers can collect from."""

    model_config = ConfigDict(str_strip_whitespace=True)

    id: Annotated[str, Field(pattern=r"^[a-z0-9-]{2,40}$")]
    name: Annotated[str, Field(min_length=2, max_length=80)]
    address: Annotated[str, Field(min_length=5, max_length=300)]
    phone: Annotated[str, Field(min_length=5, max_length=20)]


DEFAULT_STORES = [
    Store(
        id="basaveshwar-nagar",
        name="Basaveshwar Nagar",
        address=(
            "476A, Siddhaiah Puranik Road, 3rd Block, Sharada Colony, West of Chord Road, "
            "3rd Stage, Basaveshwar Nagar, Bengaluru, Karnataka 560079"
        ),
        phone="97313 07237",
    ),
    Store(
        id="vijayanagar",
        name="Vijayanagar",
        address=(
            "No.161/1, Dhanalaxmi Complex, 8th Main Rd, Govindaraja Nagar Ward, MC Layout, "
            "Vijayanagar, Bengaluru, Karnataka 560040"
        ),
        phone="080 2340 7691",
    ),
]


class ShopSettings(BaseModel):
    upi_enabled: bool = True
    upi_id: UpiId = PLACEHOLDER_UPI_ID
    upi_payee_name: Annotated[str, Field(min_length=2, max_length=50)] = "Vijai Opticians"
    # Time to pay and press "I've paid" before the held stock is released.
    upi_payment_window_minutes: Annotated[int, Field(ge=10, le=1440)] = 30
    pay_at_store_enabled: bool = True
    # How long a pay-at-store order is held for collection.
    pickup_hold_days: Annotated[int, Field(ge=1, le=14)] = 3
    delivery_fee_paise: Annotated[int, Field(ge=0, le=1_000_000)] = 0  # free delivery
    # Only used to show how much GST an order total contains (prices include GST).
    gst_rate_percent: Annotated[int, Field(ge=0, le=28)] = 18
    # New orders are announced here.
    order_email: Email | None = "vachanvijai@gmail.com"
    stores: Annotated[list[Store], Field(min_length=1, max_length=10)] = DEFAULT_STORES

    @property
    def upi_is_placeholder(self) -> bool:
        return self.upi_id == PLACEHOLDER_UPI_ID

    def store(self, store_id: str) -> Store | None:
        return next((s for s in self.stores if s.id == store_id), None)


class ShopSettingsUpdate(BaseModel):
    """Only the fields sent are changed."""

    model_config = ConfigDict(str_strip_whitespace=True)

    upi_enabled: bool | None = None
    upi_id: UpiId | None = None
    upi_payee_name: Annotated[str, Field(min_length=2, max_length=50)] | None = None
    upi_payment_window_minutes: Annotated[int, Field(ge=10, le=1440)] | None = None
    pay_at_store_enabled: bool | None = None
    pickup_hold_days: Annotated[int, Field(ge=1, le=14)] | None = None
    delivery_fee_paise: Annotated[int, Field(ge=0, le=1_000_000)] | None = None
    gst_rate_percent: Annotated[int, Field(ge=0, le=28)] | None = None
    order_email: Email | None = None
    stores: Annotated[list[Store], Field(min_length=1, max_length=10)] | None = None


def get(db: Session) -> ShopSettings:
    saved = {row.key: row.value for row in db.scalars(select(StoreSetting))}
    known = {key: value for key, value in saved.items() if key in ShopSettings.model_fields}
    return ShopSettings.model_validate(known)


def update(db: Session, actor: User, data: ShopSettingsUpdate) -> ShopSettings:
    before = get(db)
    changes = data.model_dump(mode="json", exclude_unset=True)
    after = ShopSettings.model_validate({**before.model_dump(mode="json"), **changes})
    if not after.upi_enabled and not after.pay_at_store_enabled:
        raise BusinessRuleError(
            "Keep at least one way to pay switched on.", code="NO_PAYMENT_METHOD"
        )
    for key, value in changes.items():
        db.execute(
            insert(StoreSetting)
            .values(key=key, value=value, updated_by=actor.id)
            .on_conflict_do_update(
                index_elements=[StoreSetting.key],
                set_={"value": value, "updated_by": actor.id, "updated_at": func.now()},
            )
        )
    diff: dict[str, Any] = audit.diff(before.model_dump(mode="json"), changes)
    if diff:
        audit.record(db, actor, "settings.update", "settings", "shop", diff)
    db.commit()
    return after
