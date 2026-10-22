"""SQLAlchemy models package."""
from app.models.base import TimestampMixin
from app.models.auth import AuthSession
from app.models.credential import CredentialEvent, DigitalCredential, VerificationEvent
from app.models.identity import Campus, Membership, Programme, ProgrammeEnrollment, Student, User
from app.models.institution import Institution
from app.models.onboarding import (
    EmailOtpChallenge,
    ImportedStudentRecord,
    RosterImport,
    StudentOnboardingRequest,
)
from app.models.operations import AuditEvent, FeePolicy, IntegrationConfig, Payment, RenewalRequest, SyncRun
from app.models.student_portal import StudentNotification, StudentRequest

__all__ = [
    "AuditEvent", "AuthSession", "Campus", "CredentialEvent", "DigitalCredential",
    "EmailOtpChallenge", "FeePolicy", "ImportedStudentRecord", "Institution",
    "IntegrationConfig", "Membership", "Payment", "Programme", "ProgrammeEnrollment",
    "RenewalRequest", "RosterImport", "Student", "StudentNotification", "StudentOnboardingRequest",
    "StudentRequest", "SyncRun", "TimestampMixin", "User", "VerificationEvent",
]
