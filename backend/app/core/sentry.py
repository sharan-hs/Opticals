import sentry_sdk

from app import __version__
from app.core.config import Settings


def init_sentry(settings: Settings) -> None:
    """Error reporting; does nothing without SENTRY_DSN."""
    if not settings.sentry_dsn:
        return
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.app_env,
        release=f"opticals-api@{__version__}",
        send_default_pii=False,  # no emails, addresses or IPs in reports
        traces_sample_rate=0.0,
    )
