from functools import lru_cache

from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import Connection

from app.core.config import BACKEND_DIR


@lru_cache
def expected_heads() -> frozenset[str]:
    """Revision(s) this code expects, read once from alembic/versions."""
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    return frozenset(ScriptDirectory.from_config(config).get_heads())


def current_heads(connection: Connection) -> frozenset[str]:
    return frozenset(MigrationContext.configure(connection).get_current_heads())


def is_up_to_date(connection: Connection) -> bool:
    return current_heads(connection) == expected_heads()
