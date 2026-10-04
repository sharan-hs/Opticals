from typing import Literal

Availability = Literal["in_stock", "low", "out"]
RANK: dict[Availability, int] = {"out": 0, "low": 1, "in_stock": 2}


def bucket(available: int, threshold: int) -> Availability:
    """Customers see a bucket, never the exact count."""
    if available <= 0:
        return "out"
    if available <= threshold:
        return "low"
    return "in_stock"


def best(values: list[Availability]) -> Availability:
    return max(values, key=RANK.__getitem__) if values else "out"
