"""Outgoing email. Development logs messages; staging/production send through Resend.

Sending happens inside the request (serverless: nothing runs after the
response), with a short timeout so a slow provider can't hang the request.
"""

import json
import logging
import urllib.request
from dataclasses import dataclass
from functools import lru_cache
from typing import Protocol

from app.core.config import get_settings

logger = logging.getLogger(__name__)

RESEND_URL = "https://api.resend.com/emails"
SEND_TIMEOUT_SECONDS = 8


@dataclass(frozen=True)
class EmailMessage:
    to: str
    subject: str
    text: str
    html: str


class EmailSender(Protocol):
    def send(self, message: EmailMessage) -> None: ...


class ConsoleEmailSender:
    """Development: print the email (including links) to the server log."""

    def send(self, message: EmailMessage) -> None:
        logger.info("Email to %s: %s\n%s", message.to, message.subject, message.text)


class ResendEmailSender:
    def __init__(self, api_key: str, sender: str) -> None:
        self._api_key = api_key
        self._sender = sender

    def send(self, message: EmailMessage) -> None:
        body = json.dumps(
            {
                "from": self._sender,
                "to": [message.to],
                "subject": message.subject,
                "text": message.text,
                "html": message.html,
            }
        ).encode()
        request = urllib.request.Request(
            RESEND_URL,
            data=body,
            method="POST",
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=SEND_TIMEOUT_SECONDS):  # noqa: S310
                pass
        except Exception:
            # Callers decide whether a failed email matters; log without the address.
            logger.exception("Email send failed", extra={"subject": message.subject})
            raise


@lru_cache
def get_email_sender() -> EmailSender:
    settings = get_settings()
    if settings.email_provider == "resend" and settings.resend_api_key:
        return ResendEmailSender(settings.resend_api_key, settings.email_from)
    return ConsoleEmailSender()
