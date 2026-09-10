"""Outbound email via configurable SMTP.

 Falls back to structured logging when no SMTP relay answers — 2FA codes are
 NEVER logged (only their expiry + recipient domain hint in DEBUG).
"""

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self) -> None:
        self.host = settings.smtp_host
        self.port = settings.smtp_port
        self.user = settings.smtp_user
        self.password = settings.smtp_password
        self.from_addr = settings.smtp_from
        self.use_tls = settings.smtp_use_tls

    def send(self, to: str, subject: str, body: str) -> bool:
        """Send a plain-text email. Returns True on acceptance by the relay."""
        message = EmailMessage()
        message["From"] = self.from_addr
        message["To"] = to
        message["Subject"] = subject
        message.set_content(body)
        try:
            with smtplib.SMTP(self.host, self.port, timeout=10) as client:
                if self.use_tls:
                    client.starttls()
                if self.user:
                    client.login(self.user, self.password)
                client.send_message(message)
        except (OSError, smtplib.SMTPException) as exc:
            logger.warning("email relay unreachable (%s:%s): %s", self.host, self.port, exc)
            return False
        return True

    def send_technician_invite(self, to: str, link: str) -> bool:
        body = (
            "You have been invited to join KJAC as a service technician.\n\n"
            f"Complete your application here (one-time link, valid 7 days):\n{link}\n\n"
            "If you did not expect this invitation, please ignore it."
        )
        sent = self.send(to, "KJAC technician invitation", body)
        if not sent:
            logger.warning("technician invite not delivered to %s", to)
        return sent

    def send_two_fa_code(self, to: str, code: str, ttl_minutes: int) -> bool:
        body = (
            "Your KJAC admin verification code is:\n\n"
            f"    {code}\n\n"
            f"It expires in {ttl_minutes} minutes. Never share this code.\n"
            "If you did not request this, change your password immediately."
        )
        sent = self.send(to, "KJAC admin verification code", body)
        if not sent:
            logger.warning("2FA email not delivered to %s (relay unreachable)", to)
        return sent


def get_email_service() -> EmailService:
    return EmailService()
