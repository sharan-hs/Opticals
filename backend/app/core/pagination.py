import math
from collections.abc import Sequence
from dataclasses import dataclass

from fastapi import Query
from pydantic import BaseModel

MAX_PAGE_SIZE = 100


@dataclass(frozen=True)
class PageParams:
    page: int
    page_size: int

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


def page_params(
    page: int = Query(1, ge=1, description="1-based page number"),
    page_size: int = Query(20, ge=1, le=MAX_PAGE_SIZE),
) -> PageParams:
    """Dependency for list endpoints: `params: PageParams = Depends(page_params)`."""
    return PageParams(page=page, page_size=page_size)


class Page[T](BaseModel):
    items: list[T]
    page: int
    page_size: int
    total: int
    total_pages: int

    @classmethod
    def create(cls, items: Sequence[T], total: int, params: PageParams) -> "Page[T]":
        return cls(
            items=list(items),
            page=params.page,
            page_size=params.page_size,
            total=total,
            total_pages=math.ceil(total / params.page_size) if total else 0,
        )
