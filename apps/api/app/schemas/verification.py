"""Public verification schemas with explicit minimal disclosure policy."""

from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


VerificationOutcome = Literal["valid", "suspended", "revoked", "expired", "invalid"]


class VerificationPublicResponse(BaseModel):
    """
    Public ID Verification response.
    
    MINIMAL PUBLIC DISCLOSURE POLICY:
    - Disclosed:
      * status: Authoritative outcome ('valid', 'suspended', 'revoked', 'expired', 'invalid').
      * valid: Machine-readable boolean indicating whether the ID is currently valid.
      * institution_name: Name of the issuing institution (necessary for external verifiers).
      * student_display_name: Full name from user account for visual verifier identification.
      * programme_name: Academic programme name for faculty/library access verification.
      * issued_at: Timestamp credential became effective.
      * expires_at: UTC timestamp when credential reaches expiration.
      * verified_at: Authoritative UTC timestamp of this verification check.
      * message: Human-readable status explanation.
    
    - EXCLUDED / STRICTLY REDACTED:
      * Student numbers, database primary/foreign keys (UUIDs), internal IDs.
      * Dates of birth, email addresses, phone numbers, contact details.
      * Enrollment records, grades, academic standings, payment records.
      * Credential lifecycle events, actor IDs, audit logs, suspension/revocation reasons.
      * Any database lookup details for invalid/unknown references.
    """
    model_config = ConfigDict(from_attributes=True)

    status: VerificationOutcome = Field(
        description="Authoritative verification outcome ('valid', 'suspended', 'revoked', 'expired', or 'invalid')"
    )
    valid: bool = Field(description="True ONLY if the credential is currently active and unexpired")
    institution_name: str | None = Field(default=None, description="Issuing institution name, if resolvable and non-invalid")
    student_display_name: str | None = Field(default=None, description="Student full name for identity confirmation, if non-invalid")
    programme_name: str | None = Field(default=None, description="Enrolled programme name, if non-invalid")
    issued_at: datetime | None = Field(default=None, description="Credential issuance timestamp (UTC)")
    expires_at: datetime | None = Field(default=None, description="Credential expiry timestamp (UTC)")
    verified_at: datetime = Field(description="Authoritative verification timestamp (UTC)")
    message: str = Field(description="Accessible human-readable verification summary")


class CredentialQrRead(BaseModel):
    """Response containing canonical QR code data and verification URL for an issued credential."""
    public_reference: str
    verification_url: str
    qr_code_data_url: str
