import re
import unicodedata

from sqlalchemy import select
from sqlalchemy.orm import InstrumentedAttribute, Session


def slugify(text: str, max_length: int = 100) -> str:
    """ "Ray-Ban RB4349 Havana!" -> "ray-ban-rb4349-havana"."""
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")
    return slug[:max_length].rstrip("-") or "item"


def unique_slug(
    db: Session,
    column: InstrumentedAttribute[str],
    base: str,
    *,
    exclude_id: int | None = None,
    max_length: int = 100,
) -> str:
    """`base`, or `base-2`, `base-3`... whichever is free in `column`."""
    model = column.class_
    root = slugify(base, max_length - 4)
    candidate, n = root, 1
    while True:
        query = select(model.id).where(column == candidate)
        if exclude_id is not None:
            query = query.where(model.id != exclude_id)
        if db.scalar(query) is None:
            return candidate
        n += 1
        candidate = f"{root}-{n}"
