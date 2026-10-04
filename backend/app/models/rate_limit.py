from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class RateLimitBucket(Base):
    """Fixed-window counter per key (e.g. "login:email:<hash>").

    Kept in Postgres because serverless instances don't share memory.
    """

    __tablename__ = "rate_limit_buckets"

    key: Mapped[str] = mapped_column(String(200), primary_key=True)
    window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    count: Mapped[int] = mapped_column(Integer)

    __table_args__ = (CheckConstraint("count > 0", name="count_positive"),)
