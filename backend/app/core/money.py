"""Money is stored and computed as integer paise; rupees appear only at the edges."""

from decimal import Decimal, InvalidOperation

PAISE_PER_RUPEE = 100


def rupees_to_paise(amount: Decimal | int | str) -> int:
    """Convert a rupee amount such as "12490" or "12490.50" to paise.

    Raises ValueError for negative values, more than two decimal places, or
    non-numbers, rather than silently rounding a price.
    """
    try:
        value = Decimal(str(amount))
    except InvalidOperation as exc:
        raise ValueError(f"Not a valid amount: {amount!r}") from exc
    if not value.is_finite():
        raise ValueError(f"Not a valid amount: {amount!r}")
    if value < 0:
        raise ValueError("Amount can't be negative")
    paise = value * PAISE_PER_RUPEE
    if paise != paise.to_integral_value():
        raise ValueError("Amount can't have more than two decimal places")
    return int(paise)


def paise_to_rupees(paise: int) -> Decimal:
    return Decimal(paise).scaleb(-2)


def format_inr(paise: int) -> str:
    """Indian digit grouping: 1234567 paise -> "₹12,345.67"; whole rupees drop ".00"."""
    sign = "-" if paise < 0 else ""
    rupees, rem = divmod(abs(paise), PAISE_PER_RUPEE)
    digits = str(rupees)
    if len(digits) > 3:
        head, tail = digits[:-3], digits[-3:]
        groups: list[str] = []
        while len(head) > 2:
            groups.insert(0, head[-2:])
            head = head[:-2]
        if head:
            groups.insert(0, head)
        digits = ",".join([*groups, tail])
    return f"{sign}₹{digits}" + (f".{rem:02d}" if rem else "")
