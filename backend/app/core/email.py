"""Transactional email over SMTP (works with Resend, SendGrid, Mailgun, Gmail app passwords, etc.)."""

from __future__ import annotations

import smtplib
from email.message import EmailMessage

from app.core.config import settings
from app.core.logger import logger


def email_is_configured() -> bool:
    return bool(settings.SMTP_HOST.strip())


def send_email(to: str, subject: str, text: str, html: str | None = None) -> bool:
    """Send one email. Returns False instead of raising so auth flows never fail on email errors."""
    if not email_is_configured():
        if settings.is_production:
            logger.error("SMTP is not configured; could not send '%s' email", subject)
        else:
            # Dev convenience: the link is in the body, so print it to the API console.
            logger.info("SMTP not configured — email to %s\nSubject: %s\n\n%s", to, subject, text)
        return False

    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text)
    if html:
        message.add_alternative(html, subtype="html")

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
            if settings.SMTP_USE_TLS:
                smtp.starttls()
            if settings.SMTP_USERNAME:
                smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            smtp.send_message(message)
        return True
    except Exception as e:
        logger.error("Failed to send '%s' email: %s", subject, e)
        return False


def _frontend_link(path: str, token: str) -> str:
    return f"{settings.FRONTEND_URL.rstrip('/')}{path}?token={token}"


def send_password_reset_email(to: str, name: str, token: str) -> bool:
    link = _frontend_link("/reset-password", token)
    minutes = settings.PASSWORD_RESET_TOKEN_MINUTES
    text = (
        f"Hi {name},\n\n"
        f"Someone asked to reset your Reelysis password. Use this link within {minutes} minutes:\n\n"
        f"{link}\n\n"
        "If you didn't ask for this, you can ignore this email."
    )
    html = (
        f"<p>Hi {name},</p>"
        f"<p>Someone asked to reset your Reelysis password. This link works for {minutes} minutes:</p>"
        f'<p><a href="{link}">Reset your password</a></p>'
        "<p>If you didn't ask for this, you can ignore this email.</p>"
    )
    return send_email(to, "Reset your Reelysis password", text, html)


def send_verification_email(to: str, name: str, token: str) -> bool:
    link = _frontend_link("/verify-email", token)
    text = (
        f"Hi {name},\n\n"
        f"Confirm your email address for Reelysis:\n\n{link}\n\n"
        f"The link expires in {settings.EMAIL_VERIFY_TOKEN_HOURS} hours."
    )
    html = (
        f"<p>Hi {name},</p>"
        "<p>Confirm your email address for Reelysis:</p>"
        f'<p><a href="{link}">Verify email</a></p>'
        f"<p>The link expires in {settings.EMAIL_VERIFY_TOKEN_HOURS} hours.</p>"
    )
    return send_email(to, "Verify your Reelysis email", text, html)
