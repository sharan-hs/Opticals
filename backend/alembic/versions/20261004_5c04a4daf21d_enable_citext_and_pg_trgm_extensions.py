"""enable citext and pg_trgm extensions

Revision ID: 5c04a4daf21d
Revises:
Create Date: 2026-10-04 19:00:12.096736

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "5c04a4daf21d"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # citext: case-insensitive emails. pg_trgm: fuzzy product search.
    # Both are "trusted" extensions, so the database owner can create them.
    op.execute("CREATE EXTENSION IF NOT EXISTS citext")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")


def downgrade() -> None:
    op.execute("DROP EXTENSION IF EXISTS pg_trgm")
    op.execute("DROP EXTENSION IF EXISTS citext")
