"""All models live in this package so Alembic sees one metadata.

Import every model module here as it is added.
"""

from app.models.base import Base

__all__ = ["Base"]
