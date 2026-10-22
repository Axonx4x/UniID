"""Authoritative public verification service."""

import logging
import re
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.credential import DigitalCredential, VerificationEvent
from app.models.identity import Programme, ProgrammeEnrollment, Student, User
from app.models.institution import Institution
from app.schemas.verification import VerificationOutcome, VerificationPublicResponse
from app.services.credentials import CredentialLifecycleService, as_utc, utc_now

logger = logging.getLogger(__name__)

# References are opaque, e.g. cr_... with 128+ bits entropy
_REFERENCE_RE = re.compile(r"^[A-Za-z0-9_\-]{8,64}$")


class VerificationService:
    """Dedicated authoritative credential verification service."""

    @classmethod
    def verify(
        cls,
        db: Session,
        reference: str,
        now: datetime | None = None,
        verifier_user_id: uuid.UUID | None = None,
        client_ip: str | None = None,
    ) -> VerificationPublicResponse:
        now = now or utc_now()
        normalized_now = as_utc(now)
        ref = reference.strip() if reference else ""

        # Step 1: Strictly validate reference format
        if not ref or not _REFERENCE_RE.match(ref):
            cls._record_event(db, None, None, "invalid", verifier_user_id, client_ip)
            return cls._invalid_response(now)

        # Step 2: Query authoritative persisted data
        credential = db.scalar(
            select(DigitalCredential).where(DigitalCredential.public_reference == ref)
        )
        if credential is None:
            cls._record_event(db, None, None, "invalid", verifier_user_id, client_ip)
            return cls._invalid_response(now)

        institution = db.scalar(
            select(Institution).where(Institution.id == credential.institution_id)
        )

        # Step 3: Check institution status
        # If institution is inactive or not found, credential cannot be verified as valid.
        # Do not expose internal institutional records.
        if institution is None or institution.status != "active":
            cls._record_event(db, credential.institution_id, credential.id, "invalid", verifier_user_id, client_ip)
            return cls._invalid_response(now)

        # Step 4: Authoritative state precedence determination
        outcome, valid, message = cls._determine_outcome(credential, normalized_now)

        # Step 5: Resolve minimal approved disclosure fields
        institution_name = None
        student_display_name = None
        programme_name = None
        issued_at = None
        expires_at = None

        if outcome in {"valid", "suspended", "revoked", "expired"}:
            institution_name = institution.name
            issued_at = credential.issued_at
            expires_at = credential.expires_at

            # Query student and account name for visual identity confirmation
            student_row = db.execute(
                select(Student, User)
                .join(User, User.id == Student.user_id)
                .where(Student.id == credential.student_id, Student.institution_id == credential.institution_id)
            ).first()
            if student_row:
                _, user = student_row
                student_display_name = user.full_name

            # Query active programme enrollment name for faculty/library verification
            enrollment_row = db.execute(
                select(ProgrammeEnrollment, Programme)
                .join(Programme, Programme.id == ProgrammeEnrollment.programme_id)
                .where(
                    ProgrammeEnrollment.student_id == credential.student_id,
                    ProgrammeEnrollment.institution_id == credential.institution_id,
                )
                .order_by(ProgrammeEnrollment.created_at.desc())
            ).first()
            if enrollment_row:
                _, programme = enrollment_row
                programme_name = programme.name

        # Step 6: Atomically record minimal verification event without leaking raw references or full IPs
        cls._record_event(
            db,
            institution_id=credential.institution_id,
            credential_id=credential.id,
            outcome=outcome,
            verifier_user_id=verifier_user_id,
            client_ip=client_ip,
        )

        return VerificationPublicResponse(
            status=outcome,
            valid=valid,
            institution_name=institution_name,
            student_display_name=student_display_name,
            programme_name=programme_name,
            issued_at=issued_at,
            expires_at=expires_at,
            verified_at=now,
            message=message,
        )

    @staticmethod
    def _determine_outcome(credential: DigitalCredential, now: datetime) -> tuple[VerificationOutcome, bool, str]:
        """
        Applies authoritative lifecycle rules with strict precedence:
        1. Pending -> invalid (never issued for public verification)
        2. Revoked -> revoked (terminal institutional action)
        3. Expired -> expired (authoritative UTC clock check, even if background job has not run)
        4. Suspended -> suspended (temporarily blocked by registry)
        5. Active & unexpired -> valid
        6. Other -> invalid
        """
        if credential.status == "pending":
            return "invalid", False, "Verification reference is invalid or unknown."

        if credential.status == "revoked":
            return "revoked", False, "Credential has been revoked and is permanently invalid."

        # Check UTC expiry authoritatively regardless of whether stored status is yet updated
        is_overdue = credential.expires_at is not None and as_utc(credential.expires_at) <= now
        if credential.status == "expired" or is_overdue:
            return "expired", False, "Credential has expired and is no longer valid."

        if credential.status == "suspended":
            return "suspended", False, "Credential has been temporarily suspended by the institution."

        if credential.status == "active" and CredentialLifecycleService.is_valid(credential, now):
            return "valid", True, "Credential is valid and currently active."

        return "invalid", False, "Verification reference is invalid or unknown."

    @staticmethod
    def _invalid_response(now: datetime) -> VerificationPublicResponse:
        return VerificationPublicResponse(
            status="invalid",
            valid=False,
            institution_name=None,
            student_display_name=None,
            programme_name=None,
            issued_at=None,
            expires_at=None,
            verified_at=now,
            message="Verification reference is invalid or unknown.",
        )

    @staticmethod
    def _record_event(
        db: Session,
        institution_id: uuid.UUID | None,
        credential_id: uuid.UUID | None,
        outcome: str,
        verifier_user_id: uuid.UUID | None,
        client_ip: str | None,
    ) -> None:
        """
        Records a minimal VerificationEvent.
        Avoids retaining raw QR references, full IP addresses, or browser fingerprints.
        """
        sanitized_metadata = {
            "source": "public_web",
            "has_verifier_session": verifier_user_id is not None,
            "has_network_origin": bool(client_ip),
        }
        try:
            event = VerificationEvent(
                institution_id=institution_id,
                credential_id=credential_id,
                outcome=outcome,
                verifier_user_id=verifier_user_id,
                request_metadata=sanitized_metadata,
            )
            db.add(event)
            db.commit()
        except Exception as error:
            # Operational requirement: database logging failures must not cause incorrect verification responses
            logger.warning("Failed to record verification event: %s", error)
            db.rollback()
