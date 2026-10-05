"""Email content. Every email has a plain-text and an HTML version."""

from html import escape

from app.modules.notifications.email import EmailMessage

STORE_NAME = "Vijai Opticians"


def html_page(body: str) -> str:
    return (
        '<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1b1b1b;'
        'line-height:1.6;max-width:560px;margin:0 auto;padding:24px">'
        f"{body}"
        f'<p style="color:#767676;font-size:13px;margin-top:32px">{STORE_NAME}, Bengaluru</p>'
        "</body></html>"
    )


def password_reset_email(*, to: str, name: str, reset_url: str, minutes: int) -> EmailMessage:
    text = (
        f"Hi {name},\n\n"
        f"We received a request to reset your {STORE_NAME} password. "
        f"Open this link within {minutes} minutes to choose a new one:\n\n"
        f"{reset_url}\n\n"
        "If you didn't ask for this, ignore this email; your password won't change.\n\n"
        f"{STORE_NAME}"
    )
    html = html_page(
        f"<p>Hi {escape(name)},</p>"
        f"<p>We received a request to reset your {STORE_NAME} password. "
        f"Use the button below within {minutes} minutes to choose a new one.</p>"
        f'<p><a href="{escape(reset_url)}" style="display:inline-block;background:#000;'
        'color:#fff;padding:12px 24px;text-decoration:none">Reset password</a></p>'
        "<p>If you didn't ask for this, ignore this email; your password won't change.</p>"
    )
    return EmailMessage(to=to, subject="Reset your password", text=text, html=html)


def password_changed_email(*, to: str, name: str) -> EmailMessage:
    text = (
        f"Hi {name},\n\n"
        f"Your {STORE_NAME} password was just changed and you've been signed out "
        "everywhere else.\n\n"
        "If this wasn't you, reset your password straight away and contact us.\n\n"
        f"{STORE_NAME}"
    )
    html = html_page(
        f"<p>Hi {escape(name)},</p>"
        f"<p>Your {STORE_NAME} password was just changed and you've been signed out "
        "everywhere else.</p>"
        "<p>If this wasn't you, reset your password straight away and contact us.</p>"
    )
    return EmailMessage(to=to, subject="Your password was changed", text=text, html=html)
