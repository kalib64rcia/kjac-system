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

    def send_staff_invite(self, to: str, link: str) -> bool:
        body = (
            "You have been invited to join KJAC office staff.\n\n"
            f"Complete your application here (one-time link, valid 7 days):\n{link}\n\n"
            "If you did not expect this invitation, please ignore it."
        )
        sent = self.send(to, "KJAC staff invitation", body)
        if not sent:
            logger.warning("staff invite not delivered to %s", to)
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

    def send_booking_scheduled(self, to: str, reference_id: str, proposed_date: str, proposed_start_time: str) -> bool:
        """Notify customer that admin has scheduled their booking.
        
        Args:
            to: Customer email address
            reference_id: Booking reference ID (e.g., KJAC-2026-ABC123)
            proposed_date: Date in ISO format (e.g., 2026-09-20)
            proposed_start_time: Start time in HH:MM format (e.g., 09:00)
        """
        # Format time to 12-hour format
        from datetime import datetime as dt
        time_obj = dt.strptime(proposed_start_time, "%H:%M").time()
        time_12h = time_obj.strftime("%I:%M %p").lstrip("0")  # Remove leading zero from hour
        
        # Format date in readable format
        date_obj = dt.strptime(proposed_date, "%Y-%m-%d").date()
        readable_date = date_obj.strftime("%B %d, %Y")
        
        body = (
            f"Good news! Your booking {reference_id} has been scheduled.\n\n"
            f"Proposed service date and time:\n"
            f"{readable_date} at {time_12h}\n\n"
            "Please make sure someone is home at that time. "
            "We will send you a confirmation request shortly. "
            "If you need to change the time, please reply to this email.\n\n"
            "Thank you for choosing KJAC!"
        )
        sent = self.send(to, f"KJAC: Your booking {reference_id} is scheduled", body)
        if not sent:
            logger.warning("booking scheduled email not delivered to %s", to)
        return sent


def get_email_service() -> EmailService:
    return EmailService()
