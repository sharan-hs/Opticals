from decimal import Decimal

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.core.money import format_inr, paise_to_rupees, rupees_to_paise
from app.core.pagination import Page, PageParams, page_params


@pytest.mark.parametrize(
    ("rupees", "paise"),
    [("12490", 1249000), ("12490.5", 1249050), ("0.01", 1), (Decimal("99.99"), 9999), (7, 700)],
)
def test_rupees_to_paise(rupees: str | Decimal | int, paise: int) -> None:
    assert rupees_to_paise(rupees) == paise


@pytest.mark.parametrize("bad", ["12.345", "-1", "abc", "NaN", "Infinity"])
def test_rupees_to_paise_rejects(bad: str) -> None:
    with pytest.raises(ValueError):
        rupees_to_paise(bad)


def test_paise_to_rupees() -> None:
    assert paise_to_rupees(1249050) == Decimal("12490.50")


@pytest.mark.parametrize(
    ("paise", "text"),
    [
        (0, "₹0"),
        (99900, "₹999"),
        (1249000, "₹12,490"),
        (1249050, "₹12,490.50"),
        (123456789, "₹12,34,567.89"),
        (10000000000, "₹10,00,00,000"),
        (-50000, "-₹500"),
    ],
)
def test_format_inr_indian_grouping(paise: int, text: str) -> None:
    assert format_inr(paise) == text


def test_page_metadata() -> None:
    params = PageParams(page=2, page_size=20)
    assert params.offset == 20
    page = Page[int].create(items=[1, 2], total=41, params=params)
    assert (page.total_pages, page.page, page.items) == (3, 2, [1, 2])
    assert Page[int].create(items=[], total=0, params=params).total_pages == 0


def test_page_params_bounds() -> None:
    app = FastAPI()

    @app.get("/items")
    def items(params: PageParams = Depends(page_params)) -> dict[str, int]:
        return {"page": params.page, "page_size": params.page_size}

    test_client = TestClient(app)
    assert test_client.get("/items").json() == {"page": 1, "page_size": 20}
    assert test_client.get("/items?page_size=101").status_code == 422
    assert test_client.get("/items?page=0").status_code == 422
