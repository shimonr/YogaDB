import logging
import smtplib
from email.message import EmailMessage

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def email_enabled() -> bool:
    return bool(get_settings().smtp_host)


def send_email(to: str, subject: str, body: str) -> bool:
    """Send a plain-text email. Returns False when email is not configured or sending fails."""
    settings = get_settings()
    if not settings.smtp_host:
        return False
    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            if settings.smtp_tls:
                smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(message)
        return True
    except (OSError, smtplib.SMTPException):
        logger.exception("Sending email to %s failed", to)
        return False
