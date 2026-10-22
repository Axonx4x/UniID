"""Onboarding orchestration: registration, email OTP, Path A / Path B resolution, and staff review."""

import logging
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.integrations.university import SimulatedUniversityAdapter, StudentEligibilityRecord
from app.services.luanar_demo import lookup_current_record
from app.models.credential import DigitalCredential
from app.models.identity import Campus, Membership, Programme, ProgrammeEnrollment, Student, User
from app.models.institution import Institution
from app.models.onboarding import ImportedStudentRecord, StudentOnboardingRequest
from app.models.operations import AuditEvent
from app.services.otp import (
    OtpDeliveryError,
    OtpRateLimitError,
    OtpValidationError,
    create_otp_challenge,
    dispatch_otp_email,
    verify_otp_challenge,
)

logger = logging.getLogger(__name__)

ONBOARDING_STATUSES = (
    "contact_verification_required",
    "contact_verified",
    "verification_pending",
    "verification_review_required",
    "verified",
    "rejected",
    "verification_expired",
)


class OnboardingError(Exception):
    def __init__(self, message: str, code: str = "onboarding_error", status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


def _generate_reference() -> str:
    """Generate a human-friendly onboarding reference like ONB-A1B2C3D4."""
    return f"ONB-{uuid.uuid4().hex[:8].upper()}"


def _validate_email_domain(email: str, institution: Institution) -> None:
    """Validate the email domain against the institution's allowed domains list."""
    domain = email.split("@")[-1].lower()
    allowed = [d.lower() for d in (institution.allowed_email_domains or [])]
    if not allowed:
        raise OnboardingError(
            "This institution has not configured allowed email domains for student registration.",
            code="institution_not_configured",
        )
    if domain not in allowed:
        raise OnboardingError(
            f"The email domain '@{domain}' is not recognized by {institution.name}. "
            f"Please use your official institutional email.",
            code="invalid_email_domain",
        )


def register_student(
    db: Session,
    *,
    institution_slug: str | None = None,
    institution_id: uuid.UUID | str | None = None,
    email: str,
    full_name: str,
    password: str,
    student_number: str | None = None,
) -> dict:
    """
    Step 1: Register a new student account and send OTP challenge.
    Creates user + onboarding request in 'contact_verification_required' status.
    """
    email_clean = email.strip().lower()

    # Find institution by ID or slug
    inst = None
    if institution_id:
        try:
            uid = uuid.UUID(str(institution_id))
            inst = db.get(Institution, uid)
        except (ValueError, TypeError):
            pass
    if not inst and institution_slug:
        inst = db.scalars(
            select(Institution).where(Institution.slug == institution_slug, Institution.status == "active")
        ).first()

    if not inst or inst.status != "active":
        raise OnboardingError("Institution not found or is not active.", code="institution_not_found", status_code=404)

    _validate_email_domain(email_clean, inst)

    # Check for existing user with this email
    existing_user = db.scalars(select(User).where(User.email == email_clean)).first()
    if existing_user:
        # Check for existing active onboarding request for this institution
        existing_req = db.scalars(
            select(StudentOnboardingRequest).where(
                StudentOnboardingRequest.user_id == existing_user.id,
                StudentOnboardingRequest.institution_id == inst.id,
                StudentOnboardingRequest.status.not_in(["rejected", "verification_expired"]),
            )
        ).first()
        if existing_req:
            if existing_req.status == "verified":
                raise OnboardingError(
                    "This email is already verified for this institution.",
                    code="already_verified",
                    status_code=409,
                )
            # Resume existing onboarding - resend OTP
            try:
                challenge, code = create_otp_challenge(
                    db, institution_id=inst.id, email=email_clean, user_id=existing_user.id,
                )
            except OtpRateLimitError as e:
                raise OnboardingError(e.message, code="rate_limited", status_code=429)
            try:
                dispatch_otp_email(recipient=email_clean, code=code, institution_name=inst.name)
            except OtpDeliveryError as e:
                db.rollback()
                raise OnboardingError(e.message, code="otp_delivery_failed", status_code=503)
            db.commit()
            return {
                "reference": existing_req.reference,
                "status": existing_req.status,
                "email": email_clean,
                "institution_slug": inst.slug,
                "institution_name": inst.name,
                "resumed": True,
            }
        user = existing_user
    else:
        # Create new user
        user = User(
            id=uuid.uuid4(),
            email=email_clean,
            password_hash=hash_password(password),
            full_name=full_name.strip(),
            status="active",
        )
        db.add(user)
        db.flush()

    reference = _generate_reference()
    request = StudentOnboardingRequest(
        id=uuid.uuid4(),
        reference=reference,
        institution_id=inst.id,
        user_id=user.id,
        institutional_email=email_clean,
        student_number=student_number,
        full_name=full_name.strip(),
        verification_mode=inst.verification_mode,
        status="contact_verification_required",
    )
    db.add(request)
    db.flush()

    # Dispatch OTP
    try:
        challenge, code = create_otp_challenge(
            db, institution_id=inst.id, email=email_clean, user_id=user.id,
        )
    except OtpRateLimitError as e:
        raise OnboardingError(e.message, code="rate_limited", status_code=429)
    try:
        dispatch_otp_email(recipient=email_clean, code=code, institution_name=inst.name)
    except OtpDeliveryError as e:
        db.rollback()
        raise OnboardingError(e.message, code="otp_delivery_failed", status_code=503)

    # Audit
    db.add(AuditEvent(
        institution_id=inst.id,
        actor_user_id=user.id,
        action="onboarding.registration_started",
        resource_type="student_onboarding_request",
        resource_id=request.id,
        event_metadata={"verification_mode": inst.verification_mode, "email_domain": email_clean.split("@")[-1]},
    ))

    db.commit()
    return {
        "reference": reference,
        "status": "contact_verification_required",
        "email": email_clean,
        "institution_slug": inst.slug,
        "institution_name": inst.name,
        "resumed": False,
    }


def verify_email_code(
    db: Session,
    *,
    reference: str,
    code: str,
) -> dict:
    """
    Step 2: Verify the OTP code. On success, transition to the institution's verification pathway.
    Path A (api_verification): query SimulatedUniversityAdapter.
    Path B (file_and_review): check roster match, route to staff review.
    """
    req = db.scalars(
        select(StudentOnboardingRequest).where(StudentOnboardingRequest.reference == reference)
    ).first()
    if not req:
        raise OnboardingError("Onboarding request not found.", code="request_not_found", status_code=404)

    if req.status not in ("contact_verification_required",):
        raise OnboardingError(
            f"Email verification is not expected for current status: {req.status}",
            code="invalid_status",
        )

    inst = db.get(Institution, req.institution_id)
    if not inst:
        raise OnboardingError("Institution not found.", code="institution_not_found", status_code=404)

    # Verify OTP
    try:
        verify_otp_challenge(
            db,
            institution_id=inst.id,
            email=req.institutional_email,
            code=code,
        )
    except OtpValidationError as e:
        raise OnboardingError(e.message, code=e.code, status_code=422)

    req.status = "contact_verified"
    db.flush()

    # Now run the institution's verification pathway
    result = _run_verification_pathway(db, req, inst)

    db.add(AuditEvent(
        institution_id=inst.id,
        actor_user_id=req.user_id,
        action="onboarding.email_verified",
        resource_type="student_onboarding_request",
        resource_id=req.id,
        event_metadata={"pathway_result": result["pathway_outcome"]},
    ))

    db.commit()
    return result


def _run_verification_pathway(db: Session, req: StudentOnboardingRequest, inst: Institution) -> dict:
    """Execute Path A or Path B depending on institution verification_mode."""
    if inst.verification_mode == "api_verification":
        return _path_a_api_verification(db, req, inst)
    else:
        return _path_b_file_and_review(db, req, inst)


def _path_a_api_verification(db: Session, req: StudentOnboardingRequest, inst: Institution) -> dict:
    """
    Path A: Query SimulatedUniversityAdapter for student record.
    Auto-approve if confirmed + eligible. Otherwise route to staff review.
    On success, immediately issues a DigitalCredential so the student has
    an active ID card upon first login.
    """
    adapter = SimulatedUniversityAdapter()

    # The opt-in LUANAR presenter path is backed by the committed synthetic
    # roster, not by a permissive hard-coded adapter fixture.  This makes CSV
    # import, onboarding and reviewer screens tell one consistent story.
    demo_lookup_reason = "not_found"
    record = None
    if settings.UNIID_DEMO_MODE and inst.slug == "luanar":
        roster_record, demo_lookup_reason = lookup_current_record(
            db,
            institution_id=inst.id,
            student_number=req.student_number,
            email=req.institutional_email,
            full_name=req.full_name,
        )
        if roster_record:
            record = StudentEligibilityRecord(
                institution_code=inst.institution_code,
                student_id=roster_record.student_number,
                full_name=roster_record.full_name or req.full_name,
                photo_reference=None,
                programme=(roster_record.raw_data or {}).get("programme_name", roster_record.programme_code),
                academic_year=roster_record.academic_year,
                enrollment_status=roster_record.enrollment_status,
                is_eligible_for_credential=roster_record.enrollment_status.lower() == "active",
                is_simulation=True,
            )
    elif req.student_number:
        record = adapter.fetch_student_eligibility(inst.institution_code, req.student_number)

    if record and record.enrollment_status.lower() == "active" and record.is_eligible_for_credential:
        # Auto-verified via API
        req.status = "verified"
        req.api_check_status = "confirmed"
        student = _link_student_account(db, req, inst, sis_record=record)
        # Auto-issue the initial digital credential so the student has an active ID on first login
        credential_issued = False
        if student:
            try:
                credential_issued = _auto_issue_credential(db, inst, student, req.user_id)
            except Exception as exc:
                # Non-fatal: credential issuance failures should not block onboarding completion
                logger.warning("Auto-credential issuance failed for student %s: %s", student.id, exc)
        return {
            "reference": req.reference,
            "status": "verified",
            "pathway_outcome": "api_auto_verified",
            "credential_issued": credential_issued,
            "message": "Your student status has been automatically verified.",
        }
    elif record:
        # Found but not eligible (suspended, not eligible, etc.) - route to review
        req.status = "verification_review_required"
        req.api_check_status = "found_ineligible"
        req.discrepancy_details = {
            "reason": f"API returned enrollment_status={record.enrollment_status}, eligible={record.is_eligible_for_credential}",
        }
        return {
            "reference": req.reference,
            "status": "verification_review_required",
            "pathway_outcome": "api_found_ineligible",
            "message": "Your record was found but requires staff review before verification can be completed.",
        }
    else:
        # Not found or service unavailable - route to review
        req.status = "verification_review_required"
        req.api_check_status = demo_lookup_reason if settings.UNIID_DEMO_MODE and inst.slug == "luanar" else "not_found"
        if settings.UNIID_DEMO_MODE and inst.slug == "luanar":
            req.discrepancy_details = {"reason": f"LUANAR demo roster lookup: {demo_lookup_reason}"}
        return {
            "reference": req.reference,
            "status": "verification_review_required",
            "pathway_outcome": "api_not_found",
            "message": "Your student record could not be found in the automated system. Your request has been forwarded for staff review.",
        }


def _path_b_file_and_review(db: Session, req: StudentOnboardingRequest, inst: Institution) -> dict:
    """
    Path B: Check imported CSV roster for a match. Route to staff review regardless.
    If matched -> verification_pending.
    If no match -> verification_review_required with discrepancy reason.
    """
    # Try to match by email in current roster
    roster_match = db.scalars(
        select(ImportedStudentRecord).where(
            ImportedStudentRecord.institution_id == inst.id,
            ImportedStudentRecord.institutional_email == req.institutional_email,
            ImportedStudentRecord.is_current == True,  # noqa: E712
        )
    ).first()

    if roster_match:
        req.roster_match_status = "matched"
        req.roster_import_id = roster_match.roster_import_id
        req.student_number = req.student_number or roster_match.student_number
        req.status = "verification_pending"
        pathway_outcome = "roster_matched_pending_review"
        message = "Your email has been verified and your student record was located. Your request is pending final staff review."
    else:
        # Try by student number if provided
        roster_match_by_no = None
        if req.student_number:
            roster_match_by_no = db.scalars(
                select(ImportedStudentRecord).where(
                    ImportedStudentRecord.institution_id == inst.id,
                    ImportedStudentRecord.student_number == req.student_number,
                    ImportedStudentRecord.is_current == True,  # noqa: E712
                )
            ).first()

        if roster_match_by_no:
            req.roster_match_status = "matched_by_student_number"
            req.roster_import_id = roster_match_by_no.roster_import_id
            req.status = "verification_pending"
            pathway_outcome = "roster_matched_pending_review"
            message = "Your email has been verified and your student record was located. Your request is pending final staff review."
        else:
            req.roster_match_status = "no_match"
            req.status = "verification_review_required"
            req.discrepancy_details = {"reason": "Student record was not found in the current institutional roster."}
            pathway_outcome = "file_review_no_match"
            message = "Your email has been verified. Your student record was not found in the current roster and requires staff review."

    return {
        "reference": req.reference,
        "status": req.status,
        "pathway_outcome": pathway_outcome,
        "roster_match": req.roster_match_status,
        "message": message,
    }


def _link_student_account(
    db: Session,
    req: StudentOnboardingRequest,
    inst: Institution,
    sis_record: "StudentEligibilityRecord | None" = None,
) -> "Student | None":
    """After verification, create student membership and student record if not already linked.

    If a SIS record is provided, also ensures a Programme and ProgrammeEnrollment exist so the
    CredentialEligibilityService can approve credential issuance immediately.
    Returns the Student record (new or existing) so callers can issue credentials.
    """
    existing_membership = db.scalars(
        select(Membership).where(
            Membership.user_id == req.user_id,
            Membership.institution_id == inst.id,
        )
    ).first()
    if not existing_membership:
        db.add(Membership(
            id=uuid.uuid4(),
            user_id=req.user_id,
            institution_id=inst.id,
            role="student",
            status="active",
        ))
        db.flush()

    # A roster-approved student should retain the programme and academic-year
    # evidence that justified approval. This lets the normal credential
    # eligibility policy run after a staff decision instead of creating a
    # membership with an unusable, empty dashboard.
    roster_record: ImportedStudentRecord | None = None
    if sis_record is None:
        roster_record = db.scalars(
            select(ImportedStudentRecord).where(
                ImportedStudentRecord.institution_id == inst.id,
                ImportedStudentRecord.institutional_email == req.institutional_email,
                ImportedStudentRecord.is_current == True,  # noqa: E712
            )
        ).first()
        if roster_record is None and req.student_number:
            roster_record = db.scalars(
                select(ImportedStudentRecord).where(
                    ImportedStudentRecord.institution_id == inst.id,
                    ImportedStudentRecord.student_number == req.student_number,
                    ImportedStudentRecord.is_current == True,  # noqa: E712
                )
            ).first()

    student: Student | None = None
    if req.student_number and req.user_id:
        student = db.scalars(
            select(Student).where(
                Student.institution_id == inst.id,
                Student.student_number == req.student_number,
            )
        ).first()
        if student and not student.user_id:
            student.user_id = req.user_id
            db.flush()
        elif not student:
            campus_query = select(Campus).where(Campus.institution_id == inst.id)
            if roster_record and roster_record.campus_code:
                campus_query = campus_query.where(Campus.code == roster_record.campus_code)
            campus = db.scalars(campus_query).first()
            if campus is None:
                campus = db.scalars(select(Campus).where(Campus.institution_id == inst.id)).first()
            if campus:
                photo_ref = sis_record.photo_reference if sis_record and sis_record.photo_reference else None
                student = Student(
                    id=uuid.uuid4(),
                    institution_id=inst.id,
                    campus_id=campus.id,
                    student_number=req.student_number,
                    user_id=req.user_id,
                    photo_url=photo_ref,
                )
                db.add(student)
                db.flush()
        elif student and not student.photo_url and sis_record and sis_record.photo_reference:
            student.photo_url = sis_record.photo_reference
            db.flush()

    # If we have a SIS record, ensure a programme + active enrollment exists so the student
    # satisfies CredentialEligibilityService requirements (active enrollment -> active programme).
    if student and sis_record:
        _ensure_programme_enrollment(db, inst, student, sis_record)
    elif student and roster_record and roster_record.enrollment_status.lower() == "active":
        roster_programme = db.scalars(
            select(Programme).where(
                Programme.institution_id == inst.id,
                Programme.code == roster_record.programme_code,
            )
        ).first()
        _ensure_programme_enrollment(
            db,
            inst,
            student,
            StudentEligibilityRecord(
                institution_code=inst.institution_code,
                student_id=student.student_number,
                full_name=roster_record.full_name or req.full_name,
                photo_reference=None,
                programme=roster_programme.name if roster_programme else roster_record.programme_code,
                academic_year=roster_record.academic_year,
                enrollment_status=roster_record.enrollment_status,
                is_eligible_for_credential=True,
                is_simulation=True,
            ),
        )

    return student


def _ensure_programme_enrollment(
    db: Session,
    inst: Institution,
    student: "Student",
    sis_record: "StudentEligibilityRecord",
) -> None:
    """Ensure a Programme and active ProgrammeEnrollment exist for the given student."""
    # Check if an active enrollment already exists
    existing_enrollment = db.scalars(
        select(ProgrammeEnrollment).where(
            ProgrammeEnrollment.institution_id == inst.id,
            ProgrammeEnrollment.student_id == student.id,
            ProgrammeEnrollment.status == "active",
        )
    ).first()
    if existing_enrollment:
        return  # Nothing to do

    # Find or create the programme by name
    prog_name = sis_record.programme.strip()
    # Generate a code from the name
    prog_code = "".join(w[0].upper() for w in prog_name.split() if w)[:20] or "PROG"
    programme = db.scalars(
        select(Programme).where(
            Programme.institution_id == inst.id,
            Programme.name == prog_name,
        )
    ).first()
    if not programme:
        # Try by code
        programme = db.scalars(
            select(Programme).where(
                Programme.institution_id == inst.id,
                Programme.code == prog_code,
            )
        ).first()
    if not programme:
        programme = Programme(
            id=uuid.uuid4(),
            institution_id=inst.id,
            code=prog_code,
            name=prog_name,
            status="active",
        )
        db.add(programme)
        db.flush()
    elif programme.status != "active":
        programme.status = "active"
        db.flush()

    # Create the active enrollment
    today = datetime.now(timezone.utc).date()
    db.add(ProgrammeEnrollment(
        id=uuid.uuid4(),
        institution_id=inst.id,
        student_id=student.id,
        programme_id=programme.id,
        academic_year=sis_record.academic_year or str(today.year),
        study_year=None,
        status="active",
        start_date=today,
        end_date=None,
    ))
    db.flush()


def _auto_issue_credential(
    db: Session,
    inst: Institution,
    student: "Student",
    actor_user_id: uuid.UUID,
) -> bool:
    """Issue an initial DigitalCredential for a newly-verified student, if none exists.
    Returns True if a new credential was created, False if one already existed.
    """
    import secrets
    from datetime import timedelta
    from sqlalchemy.exc import IntegrityError
    from app.services.credentials import CredentialEligibilityService

    now = datetime.now(timezone.utc)
    decision = CredentialEligibilityService.evaluate(
        db, inst.id, student.id, now, require_photo=settings.UNIID_DEMO_MODE and inst.slug == "luanar"
    )
    if not decision.eligible:
        logger.info("Student %s not yet eligible for credential: %s", student.id, decision.reason)
        return False

    # Check if an active credential already exists
    existing = db.scalars(
        select(DigitalCredential).where(
            DigitalCredential.institution_id == inst.id,
            DigitalCredential.student_id == student.id,
            DigitalCredential.status.in_(("active", "suspended")),
        )
    ).first()
    if existing:
        return False  # Already has a credential

    expires_at = now + timedelta(days=getattr(settings, "CREDENTIAL_VALIDITY_DAYS", 365))
    for _ in range(3):
        public_ref = f"cr_{secrets.token_urlsafe(24)}"
        credential = DigitalCredential(
            institution_id=inst.id,
            student_id=student.id,
            public_reference=public_ref,
            status="active",
            issued_at=now,
            expires_at=expires_at,
            issued_by_user_id=actor_user_id,
            policy_reference=decision.policy_reference,
        )
        try:
            with db.begin_nested():
                db.add(credential)
                db.flush()
            logger.info("Auto-issued credential %s for student %s", public_ref, student.id)
            return True
        except IntegrityError:
            continue

    return False


def resend_otp(db: Session, *, reference: str) -> dict:
    """Resend OTP for an onboarding request that is still in contact_verification_required."""
    req = db.scalars(
        select(StudentOnboardingRequest).where(StudentOnboardingRequest.reference == reference)
    ).first()
    if not req:
        raise OnboardingError("Onboarding request not found.", code="request_not_found", status_code=404)

    if req.status != "contact_verification_required":
        raise OnboardingError(
            "OTP resend is only available during email verification stage.",
            code="invalid_status",
        )

    try:
        challenge, code = create_otp_challenge(
            db, institution_id=req.institution_id, email=req.institutional_email, user_id=req.user_id,
        )
    except OtpRateLimitError as e:
        raise OnboardingError(e.message, code="rate_limited", status_code=429)
    inst = db.get(Institution, req.institution_id)
    try:
        dispatch_otp_email(
            recipient=req.institutional_email,
            code=code,
            institution_name=inst.name if inst else "your institution",
        )
    except OtpDeliveryError as e:
        db.rollback()
        raise OnboardingError(e.message, code="otp_delivery_failed", status_code=503)

    db.commit()
    return {
        "reference": req.reference,
        "email": req.institutional_email,
        "message": "A new verification code has been sent.",
    }


def get_onboarding_status(db: Session, *, reference: str) -> dict:
    """Retrieve current onboarding request status (public-facing, minimal disclosure)."""
    req = db.scalars(
        select(StudentOnboardingRequest).where(StudentOnboardingRequest.reference == reference)
    ).first()
    if not req:
        raise OnboardingError("Onboarding request not found.", code="request_not_found", status_code=404)

    inst = db.get(Institution, req.institution_id)

    result = {
        "reference": req.reference,
        "status": req.status,
        "institution_name": inst.name if inst else "Unknown",
        "institution_slug": inst.slug if inst else "unknown",
        "full_name": req.full_name,
        "email": req.institutional_email,
        "verification_mode": req.verification_mode,
        "submitted_at": req.submitted_at.isoformat() if req.submitted_at else None,
    }

    if req.status in ("verification_pending", "verification_review_required"):
        result["roster_match_status"] = req.roster_match_status
        result["follow_up_instructions"] = req.follow_up_instructions

    if req.status == "rejected":
        result["review_notes"] = req.review_notes

    return result


def submit_follow_up(db: Session, *, reference: str, message: str) -> dict:
    """Student submits a follow-up response to a staff follow-up request."""
    req = db.scalars(
        select(StudentOnboardingRequest).where(StudentOnboardingRequest.reference == reference)
    ).first()
    if not req:
        raise OnboardingError("Onboarding request not found.", code="request_not_found", status_code=404)

    if req.status != "verification_review_required":
        raise OnboardingError(
            "Follow-up responses are only accepted during staff review.",
            code="invalid_status",
        )

    # Store in discrepancy_details as follow-up responses
    details = req.discrepancy_details or {}
    follow_ups = details.get("follow_up_responses", [])
    follow_ups.append({
        "message": message,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    })
    details["follow_up_responses"] = follow_ups
    req.discrepancy_details = details

    db.commit()
    return {"reference": req.reference, "message": "Follow-up response submitted successfully."}


# ── Staff Review Actions ────────────────────────────────────────────────

def list_pending_reviews(
    db: Session,
    *,
    institution_id: uuid.UUID,
    status_filter: str | None = None,
) -> list[dict]:
    """List all onboarding requests pending staff review for an institution."""
    conditions = [StudentOnboardingRequest.institution_id == institution_id]
    if status_filter:
        conditions.append(StudentOnboardingRequest.status == status_filter)
    else:
        # Both a roster match and a discrepancy require a staff decision.
        conditions.append(StudentOnboardingRequest.status.in_(("verification_pending", "verification_review_required")))
    stmt = select(StudentOnboardingRequest).where(*conditions).order_by(StudentOnboardingRequest.submitted_at.asc())
    requests = db.scalars(stmt).all()
    results = []
    for r in requests:
        results.append({
            "id": str(r.id),
            "reference": r.reference,
            "full_name": r.full_name,
            "institutional_email": r.institutional_email,
            "student_number": r.student_number,
            "verification_mode": r.verification_mode,
            "status": r.status,
            "roster_match_status": r.roster_match_status,
            "api_check_status": r.api_check_status,
            "discrepancy_details": r.discrepancy_details,
            "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None,
            "follow_up_instructions": r.follow_up_instructions,
        })
    return results


def review_onboarding_request(
    db: Session,
    *,
    request_id: uuid.UUID,
    institution_id: uuid.UUID,
    reviewer_user_id: uuid.UUID,
    decision: str,
    notes: str | None = None,
    follow_up_instructions: str | None = None,
) -> dict:
    """
    Staff reviews an onboarding request.
    decision: 'approve', 'reject', 'follow_up'
    """
    if decision not in ("approve", "reject", "follow_up"):
        raise OnboardingError("Invalid review decision.", code="invalid_decision")

    req = db.scalars(
        select(StudentOnboardingRequest).where(
            StudentOnboardingRequest.id == request_id,
            StudentOnboardingRequest.institution_id == institution_id,
        )
    ).first()
    if not req:
        raise OnboardingError("Onboarding request not found.", code="request_not_found", status_code=404)

    if req.status not in ("verification_pending", "verification_review_required"):
        raise OnboardingError(
            f"Cannot review a request with status '{req.status}'.",
            code="invalid_status",
        )

    now = datetime.now(timezone.utc)
    req.reviewer_user_id = reviewer_user_id
    req.reviewed_at = now
    req.review_decision = decision
    req.review_notes = notes

    inst = db.get(Institution, institution_id)

    if decision == "approve":
        req.status = "verified"
        if inst:
            student = _link_student_account(db, req, inst)
            if student:
                try:
                    _auto_issue_credential(db, inst, student, reviewer_user_id)
                except Exception as exc:
                    logger.warning("Auto-credential after staff approval failed: %s", exc)
        message = "Student verification approved."
    elif decision == "reject":
        req.status = "rejected"
        message = "Student verification rejected."
    else:  # follow_up
        req.follow_up_instructions = follow_up_instructions
        message = "Follow-up instructions sent to student."

    db.add(AuditEvent(
        institution_id=institution_id,
        actor_user_id=reviewer_user_id,
        action=f"onboarding.staff_review_{decision}",
        resource_type="student_onboarding_request",
        resource_id=req.id,
        event_metadata={"decision": decision, "notes": notes},
    ))

    db.commit()
    return {
        "reference": req.reference,
        "status": req.status,
        "decision": decision,
        "message": message,
    }
