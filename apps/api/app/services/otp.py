"""Email OTP Service for secure, hashed, single-use verification challenges."""

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
import hashlib
import hmac
import logging
import secrets
import smtplib
import ssl
import uuid

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.onboarding import EmailOtpChallenge

logger = logging.getLogger(__name__)

# Development / testing mailbox store (in-memory, stores latest dispatched code for demo/testing inspection)
# Mapping: email -> {"code": "123456", "created_at": datetime, "institution_id": str}
DEV_SIMULATED_MAILBOX: dict[str, dict] = {}


class OtpValidationError(Exception):
    """Raised when OTP validation fails with a user-safe message."""
    def __init__(self, message: str, code: str = "invalid_code", attempts_remaining: int | None = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.attempts_remaining = attempts_remaining


class OtpRateLimitError(Exception):
    """Raised when resend cooldown or max challenges limit is reached."""
    def __init__(self, message: str, retry_after_seconds: int = 60):
        super().__init__(message)
        self.message = message
        self.retry_after_seconds = retry_after_seconds


class OtpDeliveryError(Exception):
    """Raised when a verification code cannot be safely delivered."""

    def __init__(self, message: str = "We could not send the verification code. Please try again later."):
        super().__init__(message)
        self.message = message


def hash_otp_code(code: str) -> str:
    """Hash the OTP code with HMAC-SHA256 using SESSION_SECRET."""
    secret = settings.SESSION_SECRET.encode("utf-8")
    return hmac.new(secret, code.encode("utf-8"), hashlib.sha256).hexdigest()


def generate_secure_otp() -> str:
    """Generate a cryptographically secure 6-digit numeric OTP code."""
    # secrets.randbelow(900000) generates [0, 899999] -> + 100000 gives [100000, 999999]
    return f"{secrets.randbelow(900000) + 100000:06d}"


def dispatch_otp_email(*, recipient: str, code: str, institution_name: str) -> None:
    """Deliver a verification code without persisting or logging its plaintext value."""
    if settings.OTP_DELIVERY_MODE == "development":
        if settings.OTP_DEV_MAILBOX_ENABLED:
            DEV_SIMULATED_MAILBOX[recipient] = {
                "code": code,
                "dispatched_at": datetime.now(timezone.utc).isoformat(),
                "institution_id": "development",
                "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
            }
        logger.info("Development OTP challenge dispatched: [EMAIL_REDACTED]")
        return

    if not settings.SMTP_HOST or not settings.SMTP_FROM_EMAIL:
        raise OtpDeliveryError(
            "Email verification is not configured. Ask the administrator to configure SMTP delivery."
        )

    message = EmailMessage()
    message["Subject"] = f"Your {institution_name} verification code"
    message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    message["To"] = recipient
    message.set_content(
        f"Your AstraMind verification code is: {code}\n\n"
        "It expires in 10 minutes and can only be used once. If you did not request this, you can ignore this email."
    )

    try:
        context = ssl.create_default_context()
        if settings.SMTP_USE_SSL:
            with smtplib.SMTP_SSL(
                settings.SMTP_HOST, settings.SMTP_PORT, timeout=settings.SMTP_TIMEOUT_SECONDS, context=context
            ) as server:
                if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(message)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=settings.SMTP_TIMEOUT_SECONDS) as server:
                server.ehlo()
                if settings.SMTP_USE_STARTTLS:
                    server.starttls(context=context)
                    server.ehlo()
                if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        logger.warning("OTP email delivery failed: %s", type(exc).__name__)
        raise OtpDeliveryError() from exc

    logger.info("OTP email dispatched: [EMAIL_REDACTED]")


def _ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def create_otp_challenge(
    db: Session,
    *,
    institution_id: uuid.UUID,
    email: str,
    purpose: str = "student_onboarding",
    user_id: uuid.UUID | None = None,
    expiry_minutes: int = 10,
    resend_cooldown_seconds: int = 60,
    max_attempts: int = 5,
) -> tuple[EmailOtpChallenge, str]:
    """
    Create a new OTP challenge, invalidate previous active challenges for this email/purpose,
    and record the challenge. Returns (challenge_record, plaintext_code).
    Note: plaintext_code is returned ONLY to caller for delivery/dispatching, never stored in DB.
    """
    now = datetime.now(timezone.utc)
    email_clean = email.strip().lower()

    # Check for active challenges with resend cooldown
    existing_stmt = (
        select(EmailOtpChallenge)
        .where(
            EmailOtpChallenge.institution_id == institution_id,
            EmailOtpChallenge.email == email_clean,
            EmailOtpChallenge.purpose == purpose,
            EmailOtpChallenge.is_used == False,  # noqa: E712
            EmailOtpChallenge.expires_at > now,
        )
        .order_by(EmailOtpChallenge.created_at.desc())
    )
    existing_active = db.scalars(existing_stmt).first()

    if existing_active and _ensure_utc(existing_active.resend_available_at) > now:
        wait_seconds = int((_ensure_utc(existing_active.resend_available_at) - now).total_seconds())
        raise OtpRateLimitError(
            f"Please wait {wait_seconds} seconds before requesting another verification code.",
            retry_after_seconds=wait_seconds,
        )

    # Invalidate any previous challenges for this email and purpose to prevent replay
    all_prev_stmt = (
        select(EmailOtpChallenge)
        .where(
            EmailOtpChallenge.institution_id == institution_id,
            EmailOtpChallenge.email == email_clean,
            EmailOtpChallenge.purpose == purpose,
            EmailOtpChallenge.is_used == False,  # noqa: E712
        )
    )
    for prev in db.scalars(all_prev_stmt).all():
        prev.is_used = True
        prev.used_at = now

    code = generate_secure_otp()
    code_hash = hash_otp_code(code)

    challenge = EmailOtpChallenge(
        id=uuid.uuid4(),
        institution_id=institution_id,
        user_id=user_id,
        email=email_clean,
        code_hash=code_hash,
        purpose=purpose,
        attempts_count=0,
        max_attempts=max_attempts,
        resend_available_at=now + timedelta(seconds=resend_cooldown_seconds),
        expires_at=now + timedelta(minutes=expiry_minutes),
        is_used=False,
    )
    db.add(challenge)
    db.flush()

    return challenge, code


def verify_otp_challenge(
    db: Session,
    *,
    institution_id: uuid.UUID,
    email: str,
    code: str,
    purpose: str = "student_onboarding",
) -> EmailOtpChallenge:
    """
    Verify an OTP challenge.
    Enforces expiry, attempts count, single-use, and constant-time HMAC comparison.
    """
    now = datetime.now(timezone.utc)
    email_clean = email.strip().lower()
    code_clean = code.strip()

    stmt = (
        select(EmailOtpChallenge)
        .where(
            EmailOtpChallenge.institution_id == institution_id,
            EmailOtpChallenge.email == email_clean,
            EmailOtpChallenge.purpose == purpose,
            EmailOtpChallenge.is_used == False,  # noqa: E712
        )
        .order_by(EmailOtpChallenge.created_at.desc())
    )
    challenge = db.scalars(stmt).first()

    if not challenge:
        raise OtpValidationError(
            "No active verification challenge found for this email. Please request a new code.",
            code="challenge_not_found",
        )

    # Check expiry
    if _ensure_utc(challenge.expires_at) <= now:
        challenge.is_used = True
        challenge.used_at = now
        db.flush()
        raise OtpValidationError(
            "Verification code has expired. Please request a new code.",
            code="code_expired",
        )

    # Check maximum attempts
    if challenge.attempts_count >= challenge.max_attempts:
        challenge.is_used = True
        challenge.used_at = now
        db.flush()
        raise OtpValidationError(
            "Maximum verification attempts exceeded. Please request a new code.",
            code="max_attempts_exceeded",
        )

    expected_hash = hash_otp_code(code_clean)
    if not hmac.compare_digest(challenge.code_hash, expected_hash):
        challenge.attempts_count += 1
        db.flush()
        remaining = max(0, challenge.max_attempts - challenge.attempts_count)
        if remaining == 0:
            challenge.is_used = True
            challenge.used_at = now
            db.flush()
            raise OtpValidationError(
                "Incorrect verification code. Maximum attempts exceeded. Please request a new code.",
                code="max_attempts_exceeded",
                attempts_remaining=0,
            )
        raise OtpValidationError(
            f"Incorrect verification code. {remaining} attempt{'s' if remaining != 1 else ''} remaining.",
            code="code_mismatch",
            attempts_remaining=remaining,
        )

    # Successfully verified! Invalidate challenge to prevent replay
    challenge.is_used = True
    challenge.used_at = now
    db.flush()

    # Clear from dev simulated mailbox
    DEV_SIMULATED_MAILBOX.pop(email_clean, None)

    return challenge


def get_dev_mailbox_code(email: str) -> dict | None:
    """Retrieve simulated dev mailbox message for testing / demo inspection."""
    return DEV_SIMULATED_MAILBOX.get(email.strip().lower())
