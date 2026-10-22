"""Centralized credential eligibility and lifecycle state machine."""

import math
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import CredentialTransitionException, EligibilityException, NotFoundException
from app.models.credential import CredentialEvent, DigitalCredential
from app.models.identity import Programme, ProgrammeEnrollment, Student
from app.models.institution import Institution
from app.models.operations import AuditEvent

DEFAULT_POLICY_REFERENCE = "enrollment-active-v1"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value: datetime) -> datetime:
    """Normalize dialect-returned timestamps; SQLite test storage drops tzinfo."""
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


@dataclass(frozen=True)
class EligibilityDecision:
    eligible: bool
    reason_code: str | None
    reason: str
    qualifying_enrollment_id: uuid.UUID | None
    policy_reference: str = DEFAULT_POLICY_REFERENCE


class CredentialEligibilityService:
    """Persisted demo policy: active institution + current active enrollment/programme."""

    @staticmethod
    def evaluate(
        db: Session,
        institution_id: uuid.UUID,
        student_id: uuid.UUID,
        now: datetime | None = None,
        require_photo: bool = False,
    ) -> EligibilityDecision:
        now = now or utc_now()
        institution = db.scalar(select(Institution).where(Institution.id == institution_id))
        if institution is None:
            return EligibilityDecision(False, "INSTITUTION_NOT_FOUND", "Institution context is unavailable.", None)
        if institution.status != "active":
            return EligibilityDecision(False, "INSTITUTION_INACTIVE", "Institution is not active for credential issuance.", None)

        student = db.scalar(select(Student).where(Student.id == student_id, Student.institution_id == institution_id))
        if student is None:
            return EligibilityDecision(False, "STUDENT_NOT_FOUND", "Student record is not available in this institution.", None)

        statement = (
            select(ProgrammeEnrollment)
            .join(Programme, Programme.id == ProgrammeEnrollment.programme_id)
            .where(
                ProgrammeEnrollment.institution_id == institution_id,
                ProgrammeEnrollment.student_id == student_id,
                ProgrammeEnrollment.status == "active",
                Programme.status == "active",
                Programme.institution_id == institution_id,
                (ProgrammeEnrollment.start_date.is_(None)) | (ProgrammeEnrollment.start_date <= now.date()),
                (ProgrammeEnrollment.end_date.is_(None)) | (ProgrammeEnrollment.end_date >= now.date()),
            )
            .order_by(ProgrammeEnrollment.start_date.desc().nullslast(), ProgrammeEnrollment.created_at.desc())
        )
        enrollment = db.scalar(statement)
        if enrollment is None:
            return EligibilityDecision(False, "NO_ACTIVE_ENROLLMENT", "No qualifying active programme enrollment was found.", None)
        if require_photo and not student.photo_url:
            return EligibilityDecision(
                False,
                "PHOTO_REQUIRED",
                "A verified student photograph is required before a digital student ID can be issued.",
                enrollment.id,
            )
        return EligibilityDecision(True, None, "Student has a qualifying active enrollment.", enrollment.id)


class CredentialLifecycleService:
    """Owns every status update and atomically writes lifecycle/audit history."""

    @staticmethod
    def is_valid(credential: DigitalCredential, now: datetime | None = None) -> bool:
        now = now or utc_now()
        return credential.status == "active" and credential.expires_at is not None and as_utc(now) < as_utc(credential.expires_at)

    @staticmethod
    def _find_student_for_update(db: Session, institution_id: uuid.UUID, student_id: uuid.UUID) -> Student:
        student = db.scalar(
            select(Student).where(Student.id == student_id, Student.institution_id == institution_id).with_for_update()
        )
        if student is None:
            raise NotFoundException("Student record not found")
        return student

    @staticmethod
    def _find_credential_for_update(db: Session, institution_id: uuid.UUID, credential_id: uuid.UUID) -> DigitalCredential:
        credential = db.scalar(
            select(DigitalCredential)
            .where(DigitalCredential.id == credential_id, DigitalCredential.institution_id == institution_id)
            .with_for_update()
        )
        if credential is None:
            raise NotFoundException("Credential not found")
        return credential

    @staticmethod
    def _append_history(
        db: Session,
        credential: DigitalCredential,
        event_type: str,
        actor_user_id: uuid.UUID | None,
        reason: str | None,
        previous_status: str | None,
        action: str,
    ) -> None:
        metadata = {"previous_status": previous_status, "new_status": credential.status}
        db.add(CredentialEvent(
            institution_id=credential.institution_id,
            credential_id=credential.id,
            event_type=event_type,
            actor_user_id=actor_user_id,
            reason=reason,
            event_metadata=metadata,
        ))
        db.add(AuditEvent(
            institution_id=credential.institution_id,
            actor_user_id=actor_user_id,
            action=action,
            resource_type="digital_credential",
            resource_id=credential.id,
            event_metadata=metadata,
        ))

    @staticmethod
    def _new_public_reference() -> str:
        return f"cr_{secrets.token_urlsafe(24)}"

    @classmethod
    def issue(
        cls, db: Session, institution_id: uuid.UUID, student_id: uuid.UUID, actor_user_id: uuid.UUID, now: datetime | None = None
    ) -> DigitalCredential:
        now = now or utc_now()
        cls._find_student_for_update(db, institution_id, student_id)
        decision = CredentialEligibilityService.evaluate(db, institution_id, student_id, now)
        if not decision.eligible:
            raise EligibilityException(decision.reason, [{"reason_code": decision.reason_code}])

        existing = list(db.scalars(
            select(DigitalCredential)
            .where(
                DigitalCredential.institution_id == institution_id,
                DigitalCredential.student_id == student_id,
                DigitalCredential.status.in_(("active", "suspended")),
            )
            .with_for_update()
        ))
        # Materialize an overdue active record before enforcing the replacement policy.
        # Correctness never depends on this convenience path: is_valid() still checks UTC expiry.
        for current in existing:
            if current.status == "active" and not cls.is_valid(current, now):
                current.status = "expired"
                cls._append_history(
                    db, current, "credential.expired", None,
                    "Credential reached its expiry timestamp.", "active", "credential.expired",
                )
        if any(current.status in {"active", "suspended"} for current in existing):
            raise CredentialTransitionException(
                "A current credential already exists; suspend/reinstate or revoke it before issuing a replacement.",
                "ACTIVE_CREDENTIAL_EXISTS",
            )

        expires_at = now + timedelta(days=settings.CREDENTIAL_VALIDITY_DAYS)
        credential: DigitalCredential | None = None
        for _ in range(3):
            candidate = DigitalCredential(
                institution_id=institution_id,
                student_id=student_id,
                public_reference=cls._new_public_reference(),
                status="active",
                issued_at=now,
                expires_at=expires_at,
                issued_by_user_id=actor_user_id,
                policy_reference=decision.policy_reference,
            )
            try:
                with db.begin_nested():
                    db.add(candidate)
                    db.flush()
            except IntegrityError:
                continue
            credential = candidate
            break
        if credential is None:
            raise CredentialTransitionException("Unable to allocate a unique credential reference", "CREDENTIAL_REFERENCE_COLLISION")

        cls._append_history(db, credential, "credential.issued", actor_user_id, None, None, "credential.issued")
        try:
            db.commit()
        except IntegrityError as error:
            db.rollback()
            raise CredentialTransitionException("Another active credential was created concurrently", "ACTIVE_CREDENTIAL_EXISTS") from error
        db.refresh(credential)
        return credential

    @classmethod
    def suspend(
        cls, db: Session, institution_id: uuid.UUID, credential_id: uuid.UUID, actor_user_id: uuid.UUID, reason: str, now: datetime | None = None
    ) -> DigitalCredential:
        credential = cls._find_credential_for_update(db, institution_id, credential_id)
        if credential.status != "active" or not cls.is_valid(credential, now):
            raise CredentialTransitionException("Only a currently valid active credential can be suspended")
        previous = credential.status
        credential.status = "suspended"
        cls._append_history(db, credential, "credential.suspended", actor_user_id, reason, previous, "credential.suspended")
        db.commit()
        db.refresh(credential)
        return credential

    @classmethod
    def reinstate(
        cls, db: Session, institution_id: uuid.UUID, credential_id: uuid.UUID, actor_user_id: uuid.UUID, reason: str, now: datetime | None = None
    ) -> DigitalCredential:
        now = now or utc_now()
        credential = cls._find_credential_for_update(db, institution_id, credential_id)
        if credential.status != "suspended":
            raise CredentialTransitionException("Only a suspended credential can be reinstated")
        if credential.expires_at is None or as_utc(now) >= as_utc(credential.expires_at):
            raise CredentialTransitionException("An expired credential cannot be reinstated")
        decision = CredentialEligibilityService.evaluate(db, institution_id, credential.student_id, now)
        if not decision.eligible:
            raise EligibilityException(decision.reason, [{"reason_code": decision.reason_code}])
        previous = credential.status
        credential.status = "active"
        cls._append_history(db, credential, "credential.reinstated", actor_user_id, reason, previous, "credential.reinstated")
        try:
            db.commit()
        except IntegrityError as error:
            db.rollback()
            raise CredentialTransitionException("Another active credential was created concurrently", "ACTIVE_CREDENTIAL_EXISTS") from error
        db.refresh(credential)
        return credential

    @classmethod
    def revoke(
        cls, db: Session, institution_id: uuid.UUID, credential_id: uuid.UUID, actor_user_id: uuid.UUID, reason: str, now: datetime | None = None
    ) -> DigitalCredential:
        credential = cls._find_credential_for_update(db, institution_id, credential_id)
        if credential.status not in {"active", "suspended"}:
            raise CredentialTransitionException("Only active or suspended credentials can be revoked")
        previous = credential.status
        credential.status = "revoked"
        credential.revoked_at = now or utc_now()
        credential.revocation_reason = reason
        cls._append_history(db, credential, "credential.revoked", actor_user_id, reason, previous, "credential.revoked")
        db.commit()
        db.refresh(credential)
        return credential

    @classmethod
    def expire_overdue(cls, db: Session, now: datetime | None = None, institution_id: uuid.UUID | None = None) -> int:
        now = now or utc_now()
        filters = [DigitalCredential.status == "active", DigitalCredential.expires_at.is_not(None), DigitalCredential.expires_at <= now]
        if institution_id is not None:
            filters.append(DigitalCredential.institution_id == institution_id)
        statement = (
            select(DigitalCredential)
            .where(*filters)
            .with_for_update(skip_locked=True)
        )
        credentials = list(db.scalars(statement))
        for credential in credentials:
            credential.status = "expired"
            cls._append_history(db, credential, "credential.expired", None, "Credential reached its expiry timestamp.", "active", "credential.expired")
        db.commit()
        return len(credentials)

    @staticmethod
    def list_credentials(db: Session, institution_id: uuid.UUID, student_id: uuid.UUID, page: int, page_size: int) -> tuple[list[DigitalCredential], int]:
        filters = (DigitalCredential.institution_id == institution_id, DigitalCredential.student_id == student_id)
        total = db.scalar(select(func.count()).select_from(DigitalCredential).where(*filters)) or 0
        items = list(db.scalars(select(DigitalCredential).where(*filters).order_by(DigitalCredential.created_at.desc()).offset((page - 1) * page_size).limit(page_size)))
        return items, total

    @staticmethod
    def list_events(db: Session, institution_id: uuid.UUID, credential_id: uuid.UUID, page: int, page_size: int) -> tuple[list[CredentialEvent], int]:
        filters = (CredentialEvent.institution_id == institution_id, CredentialEvent.credential_id == credential_id)
        total = db.scalar(select(func.count()).select_from(CredentialEvent).where(*filters)) or 0
        items = list(db.scalars(select(CredentialEvent).where(*filters).order_by(CredentialEvent.created_at.desc()).offset((page - 1) * page_size).limit(page_size)))
        return items, total


def total_pages(total: int, page_size: int) -> int:
    return math.ceil(total / page_size)
