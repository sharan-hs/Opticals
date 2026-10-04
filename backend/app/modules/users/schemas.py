from typing import Annotated

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    ValidationInfo,
    field_validator,
)

from app.core.validators import (
    check_password_policy,
    normalise_phone,
    normalise_pincode,
    normalise_state,
)
from app.modules.auth.schemas import FullName, PasswordInput, Phone

Pincode = Annotated[str, AfterValidator(normalise_pincode)]
State = Annotated[str, AfterValidator(normalise_state)]
Line = Annotated[str, Field(min_length=1, max_length=200)]
OptionalLine = Annotated[str, Field(max_length=200)]


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    full_name: FullName | None = None
    # Empty string clears the phone number.
    phone: str | None = None

    @field_validator("phone")
    @classmethod
    def _normalise_phone(cls, value: str | None) -> str | None:
        return normalise_phone(value) if value else value


class ChangePasswordRequest(BaseModel):
    current_password: PasswordInput
    new_password: PasswordInput

    @field_validator("new_password")
    @classmethod
    def _password_policy(cls, value: str, info: ValidationInfo) -> str:
        if value == info.data.get("current_password"):
            raise ValueError("Choose a password different from the current one")
        return check_password_policy(value)


class AddressBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    label: Annotated[str, Field(max_length=30)] | None = None
    full_name: FullName
    phone: Phone
    line1: Line
    line2: OptionalLine | None = None
    landmark: Annotated[str, Field(max_length=120)] | None = None
    city: Annotated[str, Field(min_length=1, max_length=80)]
    state: State
    pincode: Pincode


class AddressCreate(AddressBase):
    is_default: bool = False


class AddressUpdate(BaseModel):
    """Only the fields sent are changed."""

    model_config = ConfigDict(str_strip_whitespace=True)

    label: Annotated[str, Field(max_length=30)] | None = None
    full_name: FullName | None = None
    phone: Phone | None = None
    line1: Line | None = None
    line2: OptionalLine | None = None
    landmark: Annotated[str, Field(max_length=120)] | None = None
    city: Annotated[str, Field(min_length=1, max_length=80)] | None = None
    state: State | None = None
    pincode: Pincode | None = None


class AddressOut(AddressBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    country: str
    is_default: bool
