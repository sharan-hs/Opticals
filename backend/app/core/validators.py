"""Input normalisation shared by schemas: Indian phone numbers, pincodes,
states, passwords."""

import re

E164 = re.compile(r"^\+[1-9][0-9]{7,14}$")
PINCODE = re.compile(r"^[1-9][0-9]{5}$")

INDIAN_STATES = (
    # States
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    # Union territories
    "Andaman and Nicobar Islands",
    "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi",
    "Jammu and Kashmir",
    "Ladakh",
    "Lakshadweep",
    "Puducherry",
)
_STATES_BY_LOWER = {state.lower(): state for state in INDIAN_STATES}


def normalise_phone(value: str) -> str:
    """Accepts the ways people type Indian numbers and returns E.164.

    "97313 07237" / "097313-07237" / "+91 97313 07237" -> "+919731307237";
    landlines with STD code ("080 2340 7691") -> "+918023407691".
    """
    raw = value.strip()
    digits = re.sub(r"\D", "", raw)
    if raw.startswith("+"):
        candidate = "+" + digits
    elif len(digits) == 10:
        candidate = "+91" + digits
    elif len(digits) == 11 and digits.startswith("0"):
        candidate = "+91" + digits[1:]
    elif len(digits) == 12 and digits.startswith("91"):
        candidate = "+" + digits
    else:
        candidate = "+" + digits
    if not E164.fullmatch(candidate) or (candidate.startswith("+91") and len(candidate) != 13):
        raise ValueError("Enter a valid phone number, e.g. 97313 07237")
    return candidate


def normalise_pincode(value: str) -> str:
    pincode = re.sub(r"\s", "", value)
    if not PINCODE.fullmatch(pincode):
        raise ValueError("Enter a valid 6-digit pincode")
    return pincode


def normalise_state(value: str) -> str:
    state = _STATES_BY_LOWER.get(" ".join(value.split()).lower())
    if state is None:
        raise ValueError("Choose an Indian state or union territory")
    return state


MIN_PASSWORD_LENGTH = 8
# Argon2 cost grows with input; also stops absurd payloads.
MAX_PASSWORD_LENGTH = 128

# Rejected outright: the most common passwords that pass the length rule.
COMMON_PASSWORDS = frozenset(
    {
        "12345678",
        "123456789",
        "1234567890",
        "password",
        "password1",
        "password123",
        "passw0rd",
        "qwerty123",
        "qwertyuiop",
        "11111111",
        "00000000",
        "iloveyou",
        "abcd1234",
        "abc12345",
        "1q2w3e4r",
        "1qaz2wsx",
        "letmein1",
        "welcome1",
        "welcome123",
        "admin123",
        "india123",
        "sunshine",
        "princess",
        "football",
        "baseball",
        "superman",
        "trustno1",
        "zaq12wsx",
        "asdfghjkl",
        "87654321",
    }
)


def check_password_policy(password: str, *, email: str | None = None) -> str:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"Use at least {MIN_PASSWORD_LENGTH} characters")
    if len(password) > MAX_PASSWORD_LENGTH:
        raise ValueError(f"Use at most {MAX_PASSWORD_LENGTH} characters")
    lowered = password.lower()
    if lowered in COMMON_PASSWORDS or len(set(password)) < 4:
        raise ValueError("This password is too easy to guess")
    if email and lowered == email.lower():
        raise ValueError("Don't use your email address as your password")
    return password
