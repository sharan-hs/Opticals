from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

# Small pool per instance; serverless instances are reused between requests.
# pre_ping drops connections the host closed while idle. Server-side prepared
# statements are off so the URL can point at a transaction-mode pooler
# (Neon's "-pooler" host / PgBouncer) without errors.
engine = create_engine(
    get_settings().sqlalchemy_url,
    pool_size=5,
    max_overflow=5,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args={"prepare_threshold": None},
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """One session per request. Services commit; anything that escapes rolls back."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
