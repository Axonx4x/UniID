"""Student Self-Service Portal and Digital Identity Wallet endpoints."""

import os
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    File,
    Header,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.dependencies import AuthenticatedUser, get_current_user
from app.core.config import settings
from app.core.errors import (
    AstraMindException,
    AuthenticationException,
    AuthorizationException,
    NotFoundException,
)
from app.core.security import hash_password, verify_password
from app.db.session import get_db
from app.models.credential import CredentialEvent, DigitalCredential
from app.models.identity import Campus, Membership, Programme, ProgrammeEnrollment, Student, User
from app.models.institution import Institution
from app.models.onboarding import StudentOnboardingRequest
from app.models.operations import AuditEvent
from app.models.student_portal import StudentNotification, StudentRequest
from app.schemas.student import (
    PasswordChangeRequest,
    StudentAccountSummary,
    StudentActivityItem,
    StudentCredentialSummary,
    StudentCredentialEventRead,
    StudentCredentialHistoryResponse,
    StudentCredentialItem,
    StudentDashboardResponse,
    StudentEligibilitySummary,
    StudentInstitutionSummary,
    StudentNotificationPage,
    StudentNotificationRead,
    StudentPhotoUploadResponse,
    StudentProfileRead,
    StudentProfileUpdate,
    StudentRecordSummary,
    StudentRequestCreate,
    StudentRequestPage,
    StudentRequestRead,
    StudentVerificationSummary,
)
from app.services.credentials import CredentialEligibilityService, CredentialLifecycleService
from app.services.qr import build_verification_url, generate_qr_data_url

router = APIRouter(prefix="/student", tags=["student-portal"])

# Photo upload directory
UPLOAD_DIR = Path("/home/axontesla/Digital_ID/apps/api/uploads/student_photos")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_PHOTO_BYTES = 5 * 1024 * 1024  # 5 MB


@dataclass
class StudentContext:
    user: User
    institution: Institution
    membership: Membership
    student: Student | None
    onboarding_request: StudentOnboardingRequest | None


async def get_student_context(
    auth: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    institution_context: Annotated[uuid.UUID | None, Header(alias="X-Institution-Context")] = None,
) -> StudentContext:
    """Resolve the authenticated student context and enforce tenant ownership."""
    user = auth.user

    # Find the applicable institution membership
    membership_stmt = select(Membership, Institution).join(
        Institution, Institution.id == Membership.institution_id
    ).where(
        Membership.user_id == user.id,
        Membership.status == "active",
        Institution.status == "active",
    )
    if institution_context:
        membership_stmt = membership_stmt.where(Membership.institution_id == institution_context)

    # Prefer 'student' role
    results = db.execute(membership_stmt).all()
    if not results:
        # Fall back to any active membership
        fallback_stmt = select(Membership, Institution).join(
            Institution, Institution.id == Membership.institution_id
        ).where(Membership.user_id == user.id, Membership.status == "active")
        results = db.execute(fallback_stmt).all()

    if not results:
        # If user has no membership yet, match institution by email domain or first active institution
        domain = user.email.split("@")[-1] if "@" in user.email else ""
        inst = None
        if domain:
            active_institutions = db.execute(select(Institution).where(Institution.status == "active")).scalars().all()
            for cand in active_institutions:
                if cand.allowed_email_domains and domain in cand.allowed_email_domains:
                    inst = cand
                    break
        if not inst:
            inst = db.scalar(select(Institution).where(Institution.status == "active").order_by(Institution.created_at.asc()))
        if inst:
            new_membership = Membership(
                id=uuid.uuid4(),
                institution_id=inst.id,
                user_id=user.id,
                role="student",
                status="active",
            )
            db.add(new_membership)
            db.flush()
            results = [(new_membership, inst)]
        else:
            raise AuthorizationException("No active institutional affiliation found for this user account.")

    # Match role 'student' if multiple
    selected = next((row for row in results if row[0].role == "student"), results[0])
    membership, institution = selected

    # Find Student record if one has been linked
    student = db.scalar(
        select(Student).where(
            Student.institution_id == institution.id,
            Student.user_id == user.id,
        )
    )

    # Find recent onboarding request
    onboarding_request = db.scalar(
        select(StudentOnboardingRequest).where(
            StudentOnboardingRequest.institution_id == institution.id,
            StudentOnboardingRequest.user_id == user.id,
        ).order_by(StudentOnboardingRequest.created_at.desc())
    )

    # Auto-provision or link Student record if not yet linked
    if not student:
        # Check campus
        campus = db.scalar(
            select(Campus).where(Campus.institution_id == institution.id).order_by(Campus.created_at.asc())
        )
        if not campus:
            campus = Campus(
                id=uuid.uuid4(),
                institution_id=institution.id,
                name="Main Campus",
                code="MAIN",
            )
            db.add(campus)
            db.flush()

        # Determine student number from onboarding request or user
        onb_num = onboarding_request.student_number if onboarding_request else None
        student_num = onb_num or f"STU-{user.id.hex[:6].upper()}"

        existing_student = db.scalar(
            select(Student).where(
                Student.institution_id == institution.id,
                Student.student_number == student_num,
            )
        )
        if existing_student:
            if existing_student.user_id is None:
                existing_student.user_id = user.id
                student = existing_student
                db.flush()
            else:
                student = existing_student
        else:
            student = Student(
                id=uuid.uuid4(),
                institution_id=institution.id,
                campus_id=campus.id,
                student_number=student_num,
                user_id=user.id,
                status="active",
                photo_url=None,
                phone_number=None,
            )
            db.add(student)
            db.flush()

            # Link default programme enrollment if none exists
            prog = db.scalar(
                select(Programme).where(Programme.institution_id == institution.id).order_by(Programme.created_at.asc())
            )
            if prog:
                enr = ProgrammeEnrollment(
                    id=uuid.uuid4(),
                    institution_id=institution.id,
                    student_id=student.id,
                    programme_id=prog.id,
                    academic_year="2025/2026",
                    study_year=1,
                    status="active",
                )
                db.add(enr)
                db.flush()
        db.commit()

    return StudentContext(
        user=user,
        institution=institution,
        membership=membership,
        student=student,
        onboarding_request=onboarding_request,
    )


# ── 1. Consolidated Dashboard Endpoint ──────────────────────────────────────────

@router.get("/dashboard", response_model=StudentDashboardResponse)
async def get_student_dashboard(
    ctx: Annotated[StudentContext, Depends(get_student_context)],
    db: Annotated[Session, Depends(get_db)],
) -> StudentDashboardResponse:
    """Return consolidated student overview matching the design specification."""
    now = datetime.now(timezone.utc)
    user = ctx.user
    inst = ctx.institution
    student = ctx.student
    onb = ctx.onboarding_request

    # Account
    account = StudentAccountSummary(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        display_name=user.full_name,
        status=user.status,
        email_verified=True,
    )

    # Institution
    institution = StudentInstitutionSummary(
        id=inst.id,
        name=inst.name,
        slug=inst.slug,
        institution_code=inst.institution_code,
        logo_url=f"/assets/logos/{inst.slug}.jpg",
    )

    # Academic & Student details
    campus_name = None
    campus_code = None
    programme_name = None
    programme_code = None
    academic_year = None
    study_year = None
    enrollment_status = None
    student_number = None
    photo_url = None
    phone_number = None

    if student:
        student_number = student.student_number
        photo_url = student.photo_url
        phone_number = student.phone_number

        # Campus
        campus = db.scalar(select(Campus).where(Campus.id == student.campus_id))
        if campus:
            campus_name = campus.name
            campus_code = campus.code

        # Enrollment
        enrollment_row = db.execute(
            select(ProgrammeEnrollment, Programme)
            .join(Programme, Programme.id == ProgrammeEnrollment.programme_id)
            .where(
                ProgrammeEnrollment.student_id == student.id,
                ProgrammeEnrollment.institution_id == inst.id,
            )
            .order_by(ProgrammeEnrollment.created_at.desc())
        ).first()

        if enrollment_row:
            enr, prog = enrollment_row
            programme_name = prog.name
            programme_code = prog.code
            academic_year = enr.academic_year
            study_year = enr.study_year
            enrollment_status = enr.status
    elif onb:
        student_number = onb.student_number
        enrollment_status = "pending_verification"

    student_summary = StudentRecordSummary(
        id=student.id if student else None,
        student_number=student_number,
        campus_name=campus_name,
        campus_code=campus_code,
        programme_name=programme_name,
        programme_code=programme_code,
        academic_year=academic_year,
        study_year=study_year,
        enrollment_status=enrollment_status,
        photo_url=photo_url,
        phone_number=phone_number,
    )

    # Verification summary
    ver_status = "verified" if student else (onb.status if onb else "verification_pending")
    ver_mode = onb.verification_mode if onb else inst.verification_mode
    ver_ref = onb.reference if onb else f"STU-{user.id.hex[:8].upper()}"

    verification = StudentVerificationSummary(
        status=ver_status,
        verification_mode=ver_mode,
        reference=ver_ref,
        submitted_at=onb.created_at if onb else None,
        reviewed_at=onb.reviewed_at if onb else None,
        review_decision=onb.review_decision if onb else None,
        follow_up_instructions=onb.follow_up_instructions if onb else None,
        discrepancy_count=len(onb.discrepancy_details) if onb and onb.discrepancy_details else 0,
        has_active_membership=ctx.membership.status == "active",
    )

    # Credential summary
    cred: DigitalCredential | None = None
    if student:
        cred = db.scalar(
            select(DigitalCredential)
            .where(
                DigitalCredential.institution_id == inst.id,
                DigitalCredential.student_id == student.id,
            )
            .order_by(DigitalCredential.created_at.desc())
        )

    cred_status = None
    cred_ref = None
    cred_issued_at = None
    cred_expires_at = None
    ver_url = None
    qr_data = None
    is_cred_valid = False

    if cred:
        cred_status = cred.status
        cred_ref = cred.public_reference
        cred_issued_at = cred.issued_at
        cred_expires_at = cred.expires_at

        # Check validity: must be active and not expired
        if cred.status == "active" and CredentialLifecycleService.is_valid(cred, now):
            # Only consider valid if student has required photograph
            if photo_url:
                is_cred_valid = True
                ver_url = build_verification_url(cred.public_reference)
                qr_data = generate_qr_data_url(cred.public_reference)
            else:
                cred_status = "photo_required"
        elif cred.status == "active" and not CredentialLifecycleService.is_valid(cred, now):
            cred_status = "expired"

    credential = StudentCredentialSummary(
        id=cred.id if cred else None,
        status=cred_status,
        public_reference=cred_ref,
        issued_at=cred_issued_at,
        expires_at=cred_expires_at,
        verification_url=ver_url,
        qr_code_data_url=qr_data,
        has_photo=bool(photo_url),
        is_valid=is_cred_valid,
    )

    # Eligibility evaluation
    if student:
        elig_decision = CredentialEligibilityService.evaluate(
            db, inst.id, student.id, now=now, require_photo=True
        )
        eligibility = StudentEligibilitySummary(
            eligible=elig_decision.eligible,
            reason_code=elig_decision.reason_code,
            reason=elig_decision.reason,
            photo_required=not bool(photo_url),
        )
    else:
        eligibility = StudentEligibilitySummary(
            eligible=False,
            reason_code="VERIFICATION_PENDING",
            reason="Institutional identity verification must be completed before credential issuance.",
            photo_required=True,
        )

    # Notification & request counts
    unread_notifications = db.scalar(
        select(StudentNotification)
        .where(StudentNotification.user_id == user.id, StudentNotification.is_read == False)  # noqa: E712
    )
    unread_count = db.query(StudentNotification).filter(
        StudentNotification.user_id == user.id,
        StudentNotification.is_read == False,  # noqa: E712
    ).count()

    pending_requests_count = db.query(StudentRequest).filter(
        StudentRequest.user_id == user.id,
        StudentRequest.status.in_(("pending", "in_review")),
    ).count()

    # Recent student activity
    recent_activity: list[StudentActivityItem] = []

    # 1. Credential events
    if cred:
        cred_events = db.scalars(
            select(CredentialEvent)
            .where(CredentialEvent.credential_id == cred.id)
            .order_by(CredentialEvent.created_at.desc())
            .limit(5)
        ).all()
        for ce in cred_events:
            recent_activity.append(
                StudentActivityItem(
                    id=ce.id,
                    action=ce.event_type,
                    title=f"Credential {ce.event_type.replace('credential.', '').title()}",
                    description=ce.reason or f"Digital ID credential status updated to {ce.event_type}.",
                    timestamp=ce.created_at,
                    category="credential",
                )
            )

    # 2. Audited student actions
    audit_events = db.scalars(
        select(AuditEvent)
        .where(
            AuditEvent.actor_user_id == user.id,
        )
        .order_by(AuditEvent.created_at.desc())
        .limit(5)
    ).all()
    for ae in audit_events:
        recent_activity.append(
            StudentActivityItem(
                id=ae.id,
                action=ae.action,
                title=ae.action.replace("_", " ").title(),
                description=f"Action '{ae.action}' recorded for {ae.resource_type}.",
                timestamp=ae.created_at,
                category="profile",
            )
        )

    # Sort combined activity chronologically descending
    recent_activity.sort(key=lambda x: x.timestamp, reverse=True)
    recent_activity = recent_activity[:10]

    return StudentDashboardResponse(
        account=account,
        institution=institution,
        student=student_summary,
        verification=verification,
        credential=credential,
        eligibility=eligibility,
        unread_notifications_count=unread_count,
        pending_requests_count=pending_requests_count,
        recent_activity=recent_activity,
    )


# ── 2. Profile & Field Editing ──────────────────────────────────────────────────

@router.get("/profile", response_model=StudentProfileRead)
async def get_student_profile(
    ctx: Annotated[StudentContext, Depends(get_student_context)],
    db: Annotated[Session, Depends(get_db)],
) -> StudentProfileRead:
    """Retrieve full student profile distinguishing personal vs institutional fields."""
    dashboard = await get_student_dashboard(ctx, db)
    return StudentProfileRead(
        account=dashboard.account,
        student=dashboard.student,
        institution=dashboard.institution,
    )


@router.patch("/profile", response_model=StudentProfileRead)
async def update_student_profile(
    payload: StudentProfileUpdate,
    ctx: Annotated[StudentContext, Depends(get_student_context)],
    db: Annotated[Session, Depends(get_db)],
) -> StudentProfileRead:
    """Update permitted personal fields only. Institutional fields cannot be modified directly."""
    user = ctx.user
    student = ctx.student

    updated = False
    if payload.full_name is not None and payload.full_name.strip() != user.full_name:
        user.full_name = payload.full_name.strip()
        updated = True

    if payload.phone_number is not None and student:
        student.phone_number = payload.phone_number.strip()
        updated = True

    if updated:
        # Audit update
        db.add(
            AuditEvent(
                institution_id=ctx.institution.id,
                actor_user_id=user.id,
                action="student_profile_updated",
                resource_type="student",
                resource_id=student.id if student else user.id,
                event_metadata={"fields": list(payload.model_dump(exclude_unset=True).keys())},
            )
        )
        db.commit()

    return await get_student_profile(ctx, db)


# ── 3. Photograph Upload & Storage ──────────────────────────────────────────────

@router.post("/profile/photo", response_model=StudentPhotoUploadResponse)
async def upload_student_photo(
    ctx: Annotated[StudentContext, Depends(get_student_context)],
    db: Annotated[Session, Depends(get_db)],
    file: Annotated[UploadFile | None, File()] = None,
    photo: Annotated[UploadFile | None, File()] = None,
) -> StudentPhotoUploadResponse:
    """
    Validate and store student identity photograph.
    Enforces format, size limits, and magic byte validation.
    """
    uploaded_file = file or photo
    if not uploaded_file:
        raise AstraMindException(
            message="No photograph file was provided. Please attach an image file.",
            code="FILE_REQUIRED",
            status_code=400,
        )

    if not ctx.student:
        raise AstraMindException(
            message="No institutional student record is linked to this account yet.",
            code="STUDENT_RECORD_REQUIRED",
            status_code=400,
        )

    # 1. Read content
    contents = await uploaded_file.read()
    if len(contents) > MAX_PHOTO_BYTES:
        raise AstraMindException(
            message="Photograph file size exceeds the 5 MB limit.",
            code="FILE_TOO_LARGE",
            status_code=400,
        )
    if len(contents) < 100:
        raise AstraMindException(
            message="Uploaded file is empty or too small to be a valid image.",
            code="INVALID_FILE",
            status_code=400,
        )

    # 2. Validate magic bytes / image header
    is_jpeg = contents.startswith(b"\xff\xd8\xff")
    is_png = contents.startswith(b"\x89PNG\r\n\x1a\n")
    is_webp = contents.startswith(b"RIFF") and len(contents) > 12 and contents[8:12] == b"WEBP"

    if not (is_jpeg or is_png or is_webp):
        raise AstraMindException(
            message="Unsupported image format. Please upload a JPEG, PNG, or WebP photograph.",
            code="UNSUPPORTED_IMAGE_FORMAT",
            status_code=400,
        )

    # Extension
    ext = ".jpg" if is_jpeg else (".png" if is_png else ".webp")
    filename = f"stu_{ctx.student.id}_{secrets.token_hex(8)}{ext}"
    destination = UPLOAD_DIR / filename

    # Write file safely
    with open(destination, "wb") as f:
        f.write(contents)

    photo_url = f"/api/v1/student/photo/{filename}"
    ctx.student.photo_url = photo_url

    # Check if this now qualifies the student for credential issuance
    now = datetime.now(timezone.utc)
    decision = CredentialEligibilityService.evaluate(
        db, ctx.institution.id, ctx.student.id, now=now, require_photo=True
    )
    if decision.eligible:
        # Issue credential if none exists
        existing_cred = db.scalar(
            select(DigitalCredential).where(
                DigitalCredential.institution_id == ctx.institution.id,
                DigitalCredential.student_id == ctx.student.id,
                DigitalCredential.status == "active",
            )
        )
        if not existing_cred:
            CredentialLifecycleService.issue(
                db, ctx.institution.id, ctx.student.id, ctx.user.id, now=now
            )

    # Record Audit Event
    db.add(
        AuditEvent(
            institution_id=ctx.institution.id,
            actor_user_id=ctx.user.id,
            action="student_photo_uploaded",
            resource_type="student",
            resource_id=ctx.student.id,
            event_metadata={"filename": filename, "size_bytes": len(contents)},
        )
    )

    # Create Notification
    db.add(
        StudentNotification(
            institution_id=ctx.institution.id,
            user_id=ctx.user.id,
            title="Identity Photograph Verified",
            message="Your official student photograph was successfully uploaded and linked to your digital student ID.",
            category="credential",
            action_url="/student/id",
        )
    )

    db.commit()

    return StudentPhotoUploadResponse(
        success=True,
        photo_url=photo_url,
        message="Photograph successfully verified and updated.",
    )


@router.get("/photo/{filename}")
async def get_student_photo(filename: str):
    """Serve student photograph with proper content-type."""
    safe_filename = Path(filename).name
    file_path = UPLOAD_DIR / safe_filename
    if not file_path.exists() or not file_path.is_file():
        raise NotFoundException("Photograph file not found.")

    ext = file_path.suffix.lower()
    media_type = "image/jpeg" if ext in (".jpg", ".jpeg") else ("image/png" if ext == ".png" else "image/webp")
    return FileResponse(file_path, media_type=media_type)


# ── 4. Verification Details ─────────────────────────────────────────────────────

@router.get("/verification", response_model=StudentVerificationSummary)
async def get_student_verification(
    ctx: Annotated[StudentContext, Depends(get_student_context)],
    db: Annotated[Session, Depends(get_db)],
) -> StudentVerificationSummary:
    """Return detailed student verification status and timeline."""
    dashboard = await get_student_dashboard(ctx, db)
    return dashboard.verification


# ── 5. Credential & QR Presentation ─────────────────────────────────────────────

@router.get("/credential", response_model=StudentCredentialSummary)
async def get_student_credential(
    ctx: Annotated[StudentContext, Depends(get_student_context)],
    db: Annotated[Session, Depends(get_db)],
) -> StudentCredentialSummary:
    """Retrieve student's active digital credential and verified QR reference."""
    dashboard = await get_student_dashboard(ctx, db)
    return dashboard.credential


@router.get("/credentials", response_model=StudentCredentialHistoryResponse)
async def get_student_credentials_history(
    ctx: Annotated[StudentContext, Depends(get_student_context)],
    db: Annotated[Session, Depends(get_db)],
) -> StudentCredentialHistoryResponse:
    """Retrieve full credential history and append-only lifecycle events for the student."""
    dashboard = await get_student_dashboard(ctx, db)
    if not ctx.student:
        return StudentCredentialHistoryResponse(current_credential=dashboard.credential, credentials=[])

    credentials = db.scalars(
        select(DigitalCredential)
        .where(
            DigitalCredential.institution_id == ctx.institution.id,
            DigitalCredential.student_id == ctx.student.id,
        )
        .order_by(DigitalCredential.created_at.desc())
    ).all()

    items: list[StudentCredentialItem] = []
    for c in credentials:
        events = db.scalars(
            select(CredentialEvent)
            .where(CredentialEvent.credential_id == c.id)
            .order_by(CredentialEvent.created_at.desc())
        ).all()
        is_current = bool(dashboard.credential.id and dashboard.credential.id == c.id)
        items.append(
            StudentCredentialItem(
                id=c.id,
                status=c.status,
                public_reference=c.public_reference,
                policy_reference=c.policy_reference,
                issued_at=c.issued_at,
                expires_at=c.expires_at,
                revoked_at=c.revoked_at,
                revocation_reason=c.revocation_reason,
                is_current=is_current,
                events=[StudentCredentialEventRead.model_validate(e) for e in events],
            )
        )

    return StudentCredentialHistoryResponse(
        current_credential=dashboard.credential,
        credentials=items,
    )



# ── 6. Correction & Support Requests ────────────────────────────────────────────

@router.get("/requests", response_model=StudentRequestPage)
async def list_student_requests(
    ctx: Annotated[StudentContext, Depends(get_student_context)],
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> StudentRequestPage:
    """List requests submitted by the authenticated student."""
    stmt = (
        select(StudentRequest)
        .where(StudentRequest.user_id == ctx.user.id)
        .order_by(StudentRequest.created_at.desc())
    )
    total = db.query(StudentRequest).filter(StudentRequest.user_id == ctx.user.id).count()
    items = db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).all()
    return StudentRequestPage(
        items=[StudentRequestRead.model_validate(item) for item in items],
        total=total,
    )


@router.post("/requests", response_model=StudentRequestRead, status_code=status.HTTP_201_CREATED)
async def create_student_request(
    payload: StudentRequestCreate,
    ctx: Annotated[StudentContext, Depends(get_student_context)],
    db: Annotated[Session, Depends(get_db)],
) -> StudentRequestRead:
    """Submit a record correction request or support enquiry to the institution."""
    ref = f"REQ-{datetime.now(timezone.utc).strftime('%Y%m')}-{secrets.token_hex(3).upper()}"
    req = StudentRequest(
        id=uuid.uuid4(),
        reference=ref,
        institution_id=ctx.institution.id,
        user_id=ctx.user.id,
        student_id=ctx.student.id if ctx.student else None,
        category=payload.category,
        subject=payload.subject.strip(),
        description=payload.description.strip(),
        field_name=payload.field_name,
        current_value=payload.current_value,
        requested_value=payload.requested_value,
        status="pending",
    )
    db.add(req)

    # Audit event
    db.add(
        AuditEvent(
            institution_id=ctx.institution.id,
            actor_user_id=ctx.user.id,
            action="student_request_submitted",
            resource_type="student_request",
            resource_id=req.id,
            event_metadata={"category": payload.category, "reference": ref},
        )
    )

    # In-app notification confirming receipt
    db.add(
        StudentNotification(
            institution_id=ctx.institution.id,
            user_id=ctx.user.id,
            title=f"Request {ref} Submitted",
            message=f"Your {payload.category} request '{payload.subject}' has been received and routed to institutional staff.",
            category="general",
            action_url=f"/student/requests",
        )
    )

    db.commit()
    db.refresh(req)
    return StudentRequestRead.model_validate(req)


@router.get("/requests/{request_id}", response_model=StudentRequestRead)
async def get_student_request(
    request_id: uuid.UUID,
    ctx: Annotated[StudentContext, Depends(get_student_context)],
    db: Annotated[Session, Depends(get_db)],
) -> StudentRequestRead:
    """Retrieve details of a student-submitted request."""
    req = db.scalar(
        select(StudentRequest).where(
            StudentRequest.id == request_id,
            StudentRequest.user_id == ctx.user.id,
        )
    )
    if not req:
        raise NotFoundException("Request not found or access unauthorized.")
    return StudentRequestRead.model_validate(req)


# ── 7. Notification Centre ──────────────────────────────────────────────────────

@router.get("/notifications", response_model=StudentNotificationPage)
async def list_student_notifications(
    ctx: Annotated[StudentContext, Depends(get_student_context)],
    db: Annotated[Session, Depends(get_db)],
    unread_only: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> StudentNotificationPage:
    """Retrieve student notification feed with unread count."""
    base_stmt = select(StudentNotification).where(StudentNotification.user_id == ctx.user.id)
    if unread_only:
        base_stmt = base_stmt.where(StudentNotification.is_read == False)  # noqa: E712

    total = db.query(StudentNotification).filter(StudentNotification.user_id == ctx.user.id).count()
    unread_count = db.query(StudentNotification).filter(
        StudentNotification.user_id == ctx.user.id,
        StudentNotification.is_read == False,  # noqa: E712
    ).count()

    stmt = base_stmt.order_by(StudentNotification.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    items = db.scalars(stmt).all()

    return StudentNotificationPage(
        items=[StudentNotificationRead.model_validate(i) for i in items],
        total=total,
        unread_count=unread_count,
    )


@router.patch("/notifications/{notification_id}/read", response_model=StudentNotificationRead)
async def mark_notification_read(
    notification_id: uuid.UUID,
    ctx: Annotated[StudentContext, Depends(get_student_context)],
    db: Annotated[Session, Depends(get_db)],
) -> StudentNotificationRead:
    """Mark a specific notification as read."""
    notif = db.scalar(
        select(StudentNotification).where(
            StudentNotification.id == notification_id,
            StudentNotification.user_id == ctx.user.id,
        )
    )
    if not notif:
        raise NotFoundException("Notification not found.")

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return StudentNotificationRead.model_validate(notif)


@router.post("/notifications/mark-all-read", response_model=dict[str, int])
async def mark_all_notifications_read(
    ctx: Annotated[StudentContext, Depends(get_student_context)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, int]:
    """Mark all unread notifications for the student as read."""
    unreads = db.scalars(
        select(StudentNotification).where(
            StudentNotification.user_id == ctx.user.id,
            StudentNotification.is_read == False,  # noqa: E712
        )
    ).all()
    count = len(unreads)
    for u in unreads:
        u.is_read = True
    db.commit()
    return {"marked_read_count": count}


# ── 8. Activity History ─────────────────────────────────────────────────────────

@router.get("/activity", response_model=list[StudentActivityItem])
async def get_student_activity(
    ctx: Annotated[StudentContext, Depends(get_student_context)],
    db: Annotated[Session, Depends(get_db)],
) -> list[StudentActivityItem]:
    """Retrieve full permitted activity trail for the student."""
    dashboard = await get_student_dashboard(ctx, db)
    return dashboard.recent_activity


# ── 9. Security: Password Change ────────────────────────────────────────────────

@router.post("/security/password", response_model=dict[str, str])
async def change_student_password(
    payload: PasswordChangeRequest,
    ctx: Annotated[StudentContext, Depends(get_student_context)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, str]:
    """Update student account password following verification of current credentials."""
    user = ctx.user
    if not verify_password(user.password_hash, payload.current_password):
        raise AstraMindException(
            message="Your current password is incorrect.",
            code="INVALID_PASSWORD",
            status_code=400,
        )

    if len(payload.new_password) < 8:
        raise AstraMindException(
            message="New password must be at least 8 characters.",
            code="PASSWORD_TOO_SHORT",
            status_code=400,
        )

    user.password_hash = hash_password(payload.new_password)

    # Audit event
    db.add(
        AuditEvent(
            institution_id=ctx.institution.id,
            actor_user_id=user.id,
            action="student_password_changed",
            resource_type="user",
            resource_id=user.id,
            event_metadata={},
        )
    )
    db.commit()

    return {"message": "Password updated successfully."}
