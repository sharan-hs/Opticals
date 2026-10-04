from typing import Annotated, Literal, Self

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.core.validators import MAX_PASSWORD_LENGTH, check_password_policy, normalise_phone
from app.models.enums import UserRole


def _lower(value: str) -> str:
    return value.strip().lower()


Email = Annotated[EmailStr, AfterValidator(_lower), Field(max_length=254)]
FullName = Annotated[str, Field(min_length=1, max_length=120)]
# Length-limited before hashing; the policy itself is checked separately.
PasswordInput = Annotated[str, Field(min_length=1, max_length=MAX_PASSWORD_LENGTH)]
Phone = Annotated[str, AfterValidator(normalise_phone)]


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    phone: str | None
    role: UserRole


class RegisterRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: Email
    password: PasswordInput
    full_name: FullName
    phone: Phone | None = None

    @model_validator(mode="after")
    def _password_policy(self) -> Self:
        check_password_policy(self.password, email=self.email)
        return self


class LoginRequest(BaseModel):
    email: Email
    password: PasswordInput


class SessionResponse(BaseModel):
    """Access token for the Authorization header; the refresh token is set as a cookie."""

    user: UserOut
    access_token: str
    token_type: Literal["bearer"] = "bearer"  # noqa: S105 (OAuth token type, not a secret)
    expires_in: int


class ForgotPasswordRequest(BaseModel):
    email: Email


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    new_password: PasswordInput

    @model_validator(mode="after")
    def _password_policy(self) -> Self:
        check_password_policy(self.new_password)
        return self
