from typing import Annotated, Self

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, model_validator

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

    @model_validator(mode="after")
    def _normalise_phone(self) -> Self:
        if self.phone:
            self.phone = normalise_phone(self.phone)
        return self


class ChangePasswordRequest(BaseModel):
    current_password: PasswordInput
    new_password: PasswordInput

    @model_validator(mode="after")
    def _password_policy(self) -> Self:
        check_password_policy(self.new_password)
        if self.new_password == self.current_password:
            raise ValueError("Choose a password different from the current one")
        return self


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
