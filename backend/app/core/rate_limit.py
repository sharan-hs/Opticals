"""Fixed-window rate limits stored in Postgres.

Counts are written in their own short transaction so a failed login still
counts even though the request itself rolls back.
"""

import hashlib
import math
from collections.abc import Callable
from contextlib import AbstractContextManager
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.errors import RateLimitedError


@dataclass(frozen=True)
class Limit:
    name: str
    max_hits: int
    window_seconds: int


# Per IP and per email (see ARCHITECTURE_PLAN §N).
LOGIN = Limit("login", 5, 60)
REGISTER = Limit("register", 3, 60)
FORGOT_PASSWORD = Limit("forgot", 3, 3600)
RESET_PASSWORD = Limit("reset", 10, 3600)
REFRESH = Limit("refresh", 60, 60)
# Per signed-in user.
PLACE_ORDER = Limit("order", 10, 3600)
REPORT_PAYMENT = Limit("payment-report", 10, 3600)

_HIT_SQL = text(
    """
    INSERT INTO rate_limit_buckets (key, window_start, count)
    VALUES (:key, :window_start, 1)
    ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limit_buckets.window_start = EXCLUDED.window_start
                     THEN rate_limit_buckets.count + 1 ELSE 1 END,
        window_start = EXCLUDED.window_start
    RETURNING count
    """
)


def subject_key(value: str) -> str:
    """Emails and IPs are hashed so the table holds no personal data."""
    return hashlib.sha256(value.strip().lower().encode()).hexdigest()[:32]


class RateLimiter:
    def __init__(self, session_factory: Callable[[], AbstractContextManager[Session]]) -> None:
        self._session_factory = session_factory

    def hit(self, limit: Limit, *subjects: str | None, now: datetime | None = None) -> None:
        """Count one attempt for each subject; raise once any is over the limit."""
        moment = now or datetime.now(UTC)
        epoch = moment.timestamp()
        window = int(epoch // limit.window_seconds) * limit.window_seconds
        window_start = datetime.fromtimestamp(window, UTC)
        retry_after = max(1, math.ceil(window + limit.window_seconds - epoch))

        over = False
        with self._session_factory() as session:
            for subject in subjects:
                if not subject:
                    continue
                key = f"{limit.name}:{subject_key(subject)}"
                count = session.execute(
                    _HIT_SQL, {"key": key, "window_start": window_start}
                ).scalar_one()
                over = over or count > limit.max_hits
            session.commit()
        if over:
            raise RateLimitedError(retry_after)


_default = RateLimiter(SessionLocal)


def get_rate_limiter() -> RateLimiter:
    return _default
