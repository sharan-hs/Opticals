from fastapi import APIRouter, status

from app.core.deps import CurrentUser, DbSession
from app.modules.auth.schemas import UserOut
from app.modules.users import service
from app.modules.users.schemas import AddressCreate, AddressOut, AddressUpdate, ProfileUpdate

router = APIRouter(prefix="/me", tags=["account"])


@router.get("")
def get_me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)


@router.patch("")
def update_me(body: ProfileUpdate, user: CurrentUser, db: DbSession) -> UserOut:
    return UserOut.model_validate(service.update_profile(db, user, body))


@router.get("/addresses")
def list_addresses(user: CurrentUser, db: DbSession) -> list[AddressOut]:
    return [AddressOut.model_validate(a) for a in service.list_addresses(db, user)]


@router.post("/addresses", status_code=status.HTTP_201_CREATED)
def create_address(body: AddressCreate, user: CurrentUser, db: DbSession) -> AddressOut:
    return AddressOut.model_validate(service.create_address(db, user, body))


@router.patch("/addresses/{address_id}")
def update_address(
    address_id: int, body: AddressUpdate, user: CurrentUser, db: DbSession
) -> AddressOut:
    return AddressOut.model_validate(service.update_address(db, user, address_id, body))


@router.delete("/addresses/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_address(address_id: int, user: CurrentUser, db: DbSession) -> None:
    service.delete_address(db, user, address_id)


@router.post("/addresses/{address_id}/default", status_code=status.HTTP_204_NO_CONTENT)
def set_default_address(address_id: int, user: CurrentUser, db: DbSession) -> None:
    service.set_default_address(db, user, address_id)
