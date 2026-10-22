"""Institutional Reviewer Console and Student Data Import System Endpoints.
Production-ready endpoints for operational overview, student review queue,
student registry CRUD, file import wizard, mapping templates, and audit history.
"""

import math
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, Form, Header, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.orm import Session

from app.api.dependencies import AuthenticatedUser, TenantAccess, get_current_user
from app.core.errors import AstraMindException, AuthorizationException, NotFoundException, ValidationException
from app.core.config import settings
from app.db.session import get_db
from app.models.credential import DigitalCredential
from app.models.identity import Campus, Membership, Programme, ProgrammeEnrollment, Student, User
from app.models.institution import Institution
from app.models.onboarding import EmailOtpChallenge, ImportedStudentRecord, ImportMappingTemplate, RosterImport, StudentOnboardingRequest
from app.models.operations import AuditEvent
from app.models.student_portal import StudentRequest
from app.schemas.staff import (
    StaffAuditEventItem,
    StaffAuditResponse,
    StaffCommitRequest,
    StaffCommitResponse,
    StaffCreateStudentRecordRequest,
    StaffImportListResponse,
    StaffImportPreviewResponse,
    StaffImportSummary,
    StaffImportUploadResponse,
    StaffMappingRequest,
    StaffMappingTemplateCreateRequest,
    StaffMappingTemplateRead,
    StaffNotificationItem,
    StaffNotificationResponse,
    StaffOverviewResponse,
    StaffPreviewRow,
    StaffReconciliationSummary,
    StaffRequestDecisionRequest,
    StaffRequestItem,
    StaffRequestListResponse,
    StaffReviewCaseDetail,
    StaffReviewCaseEvidence,
    StaffReviewDecisionRequest,
    StaffReviewQueueItem,
    StaffReviewQueueResponse,
    StaffStudentRecordDetail,
    StaffStudentRecordItem,
    StaffStudentRecordListResponse,
    StaffTransformationConfig,
    StaffUpdateStudentRecordRequest,
)
from app.services.import_pipeline import apply_mapping_and_validate, commit_import_job, create_import_job
from app.services.luanar_demo import DEMO_ROSTER_VERSION, roster_csv
from app.services.onboarding import review_onboarding_request
from app.services.roster_import import check_roster_freshness

router = APIRouter(prefix="/staff", tags=["staff-reviewer-console"])


# ── Reviewer Authorization Dependency ──────────────────────────────────────────

async def get_reviewer_access(
    auth: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    selected_institution: Annotated[uuid.UUID | None, Header(alias="X-Institution-Context")] = None,
) -> TenantAccess:
    """Derives authorized institution scope strictly from server-verified staff membership.
    Allows Institutional Responsible Reviewers ('registry_admin') and platform admins.
    """
    staff_roles = ("registry_admin", "platform_admin")

    stmt = (
        select(Membership, Institution)
        .join(Institution, Institution.id == Membership.institution_id)
        .where(
            Membership.user_id == auth.user.id,
            Membership.status == "active",
            Institution.status == "active",
            Membership.role.in_(staff_roles),
        )
    )

    if selected_institution:
        stmt = stmt.where(Membership.institution_id == selected_institution)

    memberships = db.execute(stmt).all()

    if not memberships:
        raise AuthorizationException("Access denied: You do not have reviewer permissions for this institution.")

    if selected_institution:
        membership, institution = memberships[0]
    elif len(memberships) == 1:
        membership, institution = memberships[0]
    else:
        # Default to the first active membership if header not supplied
        membership, institution = memberships[0]

    return TenantAccess(user=auth.user, membership=membership, institution=institution)


# ── 1. Operational Overview ────────────────────────────────────────────────────

@router.get("/overview", response_model=StaffOverviewResponse)
async def get_overview(
    tenant: Annotated[TenantAccess, Depends(get_reviewer_access)],
    db: Annotated[Session, Depends(get_db)],
) -> StaffOverviewResponse:
    inst_id = tenant.institution.id

    # Pending reviews
    pending_count = db.scalar(
        select(func.count()).select_from(StudentOnboardingRequest).where(
            StudentOnboardingRequest.institution_id == inst_id,
            StudentOnboardingRequest.status.in_(["verification_pending", "contact_verified"]),
        )
    ) or 0

    # Cases needing attention (review required or discrepancy)
    needs_attention_count = db.scalar(
        select(func.count()).select_from(StudentOnboardingRequest).where(
            StudentOnboardingRequest.institution_id == inst_id,
            StudentOnboardingRequest.status == "verification_review_required",
        )
    ) or 0

    # Completed decisions in last 30 days
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    completed_decisions_30d = db.scalar(
        select(func.count()).select_from(StudentOnboardingRequest).where(
            StudentOnboardingRequest.institution_id == inst_id,
            StudentOnboardingRequest.reviewed_at >= thirty_days_ago,
        )
    ) or 0

    # Roster freshness calculation
    freshness = check_roster_freshness(db, inst_id)
    freshness_status = freshness.get("status", "missing")

    # Student counts
    total_active_students = db.scalar(
        select(func.count()).select_from(Student).where(
            Student.institution_id == inst_id,
            Student.status == "active",
        )
    ) or 0

    total_archived_students = db.scalar(
        select(func.count()).select_from(Student).where(
            Student.institution_id == inst_id,
            Student.status == "archived",
        )
    ) or 0
    total_current_roster_records = db.scalar(
        select(func.count()).select_from(ImportedStudentRecord).where(
            ImportedStudentRecord.institution_id == inst_id,
            ImportedStudentRecord.is_current == True,  # noqa: E712
        )
    ) or 0

    total_imports_count = db.scalar(
        select(func.count()).select_from(RosterImport).where(
            RosterImport.institution_id == inst_id,
        )
    ) or 0

    return StaffOverviewResponse(
        institution_id=inst_id,
        institution_name=tenant.institution.name,
        institution_code=tenant.institution.institution_code,
        verification_mode=tenant.institution.verification_mode,
        pending_reviews_count=pending_count,
        needs_attention_count=needs_attention_count,
        completed_decisions_30d=completed_decisions_30d,
        roster_freshness_status=freshness_status,
        roster_freshness_days=tenant.institution.roster_freshness_days,
        roster_last_imported_at=tenant.institution.roster_last_imported_at,
        roster_active_version=tenant.institution.roster_active_version,
        total_active_students=total_active_students,
        total_current_roster_records=total_current_roster_records,
        total_archived_students=total_archived_students,
        total_imports_count=total_imports_count,
    )


@router.get("/notifications", response_model=StaffNotificationResponse)
async def list_reviewer_notifications(
    tenant: Annotated[TenantAccess, Depends(get_reviewer_access)],
    db: Annotated[Session, Depends(get_db)],
) -> StaffNotificationResponse:
    """Build the reviewer activity feed from persisted operational events.

    Reviewer notifications are derived rather than demo fixtures: every item
    points to a scoped, actionable record and disappears/changes with its data.
    """
    inst_id = tenant.institution.id
    items: list[StaffNotificationItem] = []
    cases = db.scalars(
        select(StudentOnboardingRequest)
        .where(
            StudentOnboardingRequest.institution_id == inst_id,
            StudentOnboardingRequest.status.in_(("verification_pending", "verification_review_required")),
        )
        .order_by(desc(StudentOnboardingRequest.submitted_at)).limit(20)
    ).all()
    for case in cases:
        items.append(StaffNotificationItem(
            id=f"review:{case.id}", category="verification",
            title="Student verification requires attention",
            message=f"{case.full_name} ({case.student_number or 'no registration number supplied'}) is {case.status.replace('_', ' ')}.",
            created_at=case.submitted_at, action_url=f"/staff/reviews/{case.id}",
        ))
    requests = db.scalars(
        select(StudentRequest).where(
            StudentRequest.institution_id == inst_id,
            StudentRequest.status.in_(("pending", "in_review")),
        ).order_by(desc(StudentRequest.created_at)).limit(20)
    ).all()
    for request in requests:
        items.append(StaffNotificationItem(
            id=f"request:{request.id}", category="correction",
            title="Student request requires attention",
            message=f"{request.reference}: {request.subject}",
            created_at=request.created_at, action_url="/staff/requests",
        ))
    imports = db.scalars(
        select(RosterImport).where(RosterImport.institution_id == inst_id)
        .order_by(desc(RosterImport.created_at)).limit(10)
    ).all()
    for roster_import in imports:
        items.append(StaffNotificationItem(
            id=f"import:{roster_import.id}", category="system",
            title=f"Roster import {roster_import.status}",
            message=f"{roster_import.filename}: {roster_import.valid_rows} valid rows, {roster_import.rejected_rows_count} rejected.",
            created_at=roster_import.created_at, action_url=f"/staff/imports/{roster_import.id}",
        ))
    items.sort(key=lambda item: item.created_at, reverse=True)
    return StaffNotificationResponse(items=items[:50])


# ── 2. Verification Review Queue & Detail ──────────────────────────────────────

@router.get("/reviews", response_model=StaffReviewQueueResponse)
async def list_reviews(
    tenant: Annotated[TenantAccess, Depends(get_reviewer_access)],
    db: Annotated[Session, Depends(get_db)],
    status_filter: str | None = Query(None, alias="status"),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
) -> StaffReviewQueueResponse:
    inst_id = tenant.institution.id

    filters = [StudentOnboardingRequest.institution_id == inst_id]

    if status_filter:
        s = status_filter.lower()
        if s == "pending":
            filters.append(StudentOnboardingRequest.status.in_(["verification_pending", "contact_verified"]))
        elif s in ("needs_attention", "follow_up"):
            filters.append(StudentOnboardingRequest.status == "verification_review_required")
        elif s == "verified":
            filters.append(StudentOnboardingRequest.status == "verified")
        elif s == "rejected":
            filters.append(StudentOnboardingRequest.status == "rejected")
        elif s != "all":
            filters.append(StudentOnboardingRequest.status == s)

    if search and search.strip():
        term = f"%{search.strip()}%"
        filters.append(
            or_(
                StudentOnboardingRequest.student_number.ilike(term),
                StudentOnboardingRequest.full_name.ilike(term),
                StudentOnboardingRequest.institutional_email.ilike(term),
                StudentOnboardingRequest.reference.ilike(term),
            )
        )

    # Counts
    pending_c = db.scalar(
        select(func.count()).select_from(StudentOnboardingRequest).where(
            StudentOnboardingRequest.institution_id == inst_id,
            StudentOnboardingRequest.status.in_(["verification_pending", "contact_verified"]),
        )
    ) or 0
    attention_c = db.scalar(
        select(func.count()).select_from(StudentOnboardingRequest).where(
            StudentOnboardingRequest.institution_id == inst_id,
            StudentOnboardingRequest.status == "verification_review_required",
        )
    ) or 0
    verified_c = db.scalar(
        select(func.count()).select_from(StudentOnboardingRequest).where(
            StudentOnboardingRequest.institution_id == inst_id,
            StudentOnboardingRequest.status == "verified",
        )
    ) or 0
    rejected_c = db.scalar(
        select(func.count()).select_from(StudentOnboardingRequest).where(
            StudentOnboardingRequest.institution_id == inst_id,
            StudentOnboardingRequest.status == "rejected",
        )
    ) or 0

    total = db.scalar(select(func.count()).select_from(StudentOnboardingRequest).where(*filters)) or 0

    stmt = (
        select(StudentOnboardingRequest, User.full_name.label("reviewer_name"))
        .outerjoin(User, User.id == StudentOnboardingRequest.reviewer_user_id)
        .where(*filters)
        .order_by(desc(StudentOnboardingRequest.submitted_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    rows = db.execute(stmt).all()
    items = []
    for req, rev_name in rows:
        items.append(
            StaffReviewQueueItem(
                id=req.id,
                reference=req.reference,
                student_number=req.student_number,
                full_name=req.full_name,
                institutional_email=req.institutional_email,
                verification_mode=req.verification_mode,
                status=req.status,
                roster_match_status=req.roster_match_status,
                api_check_status=req.api_check_status,
                discrepancy_details=req.discrepancy_details or {},
                submitted_at=req.submitted_at,
                reviewed_at=req.reviewed_at,
                review_decision=req.review_decision,
                reviewer_name=rev_name,
            )
        )

    return StaffReviewQueueResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, math.ceil(total / page_size)),
        pending_count=pending_c,
        needs_attention_count=attention_c,
        verified_count=verified_c,
        rejected_count=rejected_c,
    )


@router.get("/reviews/{review_id}", response_model=StaffReviewCaseDetail)
async def get_review_case(
    review_id: uuid.UUID,
    tenant: Annotated[TenantAccess, Depends(get_reviewer_access)],
    db: Annotated[Session, Depends(get_db)],
) -> StaffReviewCaseDetail:
    inst_id = tenant.institution.id

    req = db.scalar(
        select(StudentOnboardingRequest).where(
            StudentOnboardingRequest.id == review_id,
            StudentOnboardingRequest.institution_id == inst_id,
        )
    )
    if not req:
        raise NotFoundException("Verification review case not found.")

    reviewer = db.get(User, req.reviewer_user_id) if req.reviewer_user_id else None

    # Find matching evidence in ImportedStudentRecord or live Student
    evidence_record = None
    roster_ver = None
    if req.student_number:
        evidence_record = db.scalar(
            select(ImportedStudentRecord).where(
                ImportedStudentRecord.institution_id == inst_id,
                ImportedStudentRecord.student_number == req.student_number,
                ImportedStudentRecord.is_current == True,
            )
        )

    discrepancies: list[str] = []
    if req.discrepancy_details:
        discrepancies = [f"{k}: {v}" for k, v in req.discrepancy_details.items()]

    evidence = StaffReviewCaseEvidence(
        has_match=evidence_record is not None,
        match_source="roster_import" if evidence_record else None,
        student_number=evidence_record.student_number if evidence_record else req.student_number,
        full_name=evidence_record.full_name if evidence_record else None,
        institutional_email=evidence_record.institutional_email if evidence_record else None,
        enrollment_status=evidence_record.enrollment_status if evidence_record else None,
        programme_code=evidence_record.programme_code if evidence_record else None,
        programme_name=None,
        campus_code=evidence_record.campus_code if evidence_record else None,
        campus_name=None,
        academic_year=evidence_record.academic_year if evidence_record else None,
        record_updated_at=evidence_record.record_updated_at if evidence_record else None,
        roster_version=tenant.institution.roster_active_version,
        discrepancies=discrepancies,
    )

    # Audit events / history
    history_events = db.scalars(
        select(AuditEvent).where(
            AuditEvent.institution_id == inst_id,
            AuditEvent.resource_id == req.id,
        ).order_by(AuditEvent.created_at.desc())
    ).all()

    history = [
        {
            "action": e.action,
            "timestamp": e.created_at.isoformat(),
            "metadata": e.event_metadata,
        }
        for e in history_events
    ]

    return StaffReviewCaseDetail(
        id=req.id,
        reference=req.reference,
        student_number=req.student_number,
        full_name=req.full_name,
        institutional_email=req.institutional_email,
        verification_mode=req.verification_mode,
        status=req.status,
        roster_match_status=req.roster_match_status,
        api_check_status=req.api_check_status,
        discrepancy_details=req.discrepancy_details or {},
        submitted_at=req.submitted_at,
        reviewed_at=req.reviewed_at,
        review_decision=req.review_decision,
        review_notes=req.review_notes,
        follow_up_instructions=req.follow_up_instructions,
        reviewer_name=reviewer.full_name if reviewer else None,
        evidence=evidence,
        history=history,
    )


@router.post("/reviews/{review_id}/decisions")
async def submit_review_decision(
    review_id: uuid.UUID,
    payload: StaffReviewDecisionRequest,
    tenant: Annotated[TenantAccess, Depends(get_reviewer_access)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, Any]:
    inst_id = tenant.institution.id

    res = review_onboarding_request(
        db,
        request_id=review_id,
        institution_id=inst_id,
        reviewer_user_id=tenant.user.id,
        decision=payload.decision,
        notes=payload.notes,
        follow_up_instructions=payload.follow_up_instructions,
    )

    # Write audit event
    audit = AuditEvent(
        institution_id=inst_id,
        actor_user_id=tenant.user.id,
        action=f"review.{payload.decision}",
        resource_type="student_onboarding_requests",
        resource_id=review_id,
        event_metadata={
            "decision": payload.decision,
            "notes": payload.notes,
            "follow_up_instructions": payload.follow_up_instructions,
        },
    )
    db.add(audit)
    db.commit()

    return res


# ── 3. Student Registry CRUD ───────────────────────────────────────────────────

@router.get("/records", response_model=StaffStudentRecordListResponse)
async def list_student_records(
    tenant: Annotated[TenantAccess, Depends(get_reviewer_access)],
    db: Annotated[Session, Depends(get_db)],
    search: str | None = Query(None),
    campus_id: uuid.UUID | None = Query(None),
    programme_id: uuid.UUID | None = Query(None),
    status_filter: str | None = Query("active", alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> StaffStudentRecordListResponse:
    inst_id = tenant.institution.id

    filters = [Student.institution_id == inst_id]

    if status_filter and status_filter.lower() != "all":
        filters.append(Student.status == status_filter.lower())

    if campus_id:
        filters.append(Student.campus_id == campus_id)

    # Base query joining Student, Campus, User
    query = (
        select(
            Student,
            Campus.name.label("campus_name"),
            Campus.code.label("campus_code"),
            User.full_name.label("user_full_name"),
            User.email.label("user_email"),
        )
        .join(Campus, Campus.id == Student.campus_id)
        .outerjoin(User, User.id == Student.user_id)
        .where(*filters)
    )

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Student.student_number.ilike(term),
                User.full_name.ilike(term),
                User.email.ilike(term),
            )
        )

    rows = db.execute(query.order_by(Student.student_number)).all()

    items: list[StaffStudentRecordItem] = []
    for s, camp_name, camp_code, u_name, u_email in rows:
        # Get active enrollment
        enr = db.scalar(
            select(ProgrammeEnrollment)
            .where(ProgrammeEnrollment.institution_id == inst_id, ProgrammeEnrollment.student_id == s.id)
            .order_by(desc(ProgrammeEnrollment.created_at))
        )
        prog = db.get(Programme, enr.programme_id) if enr else None

        # Get active credential
        cred = db.scalar(
            select(DigitalCredential)
            .where(DigitalCredential.institution_id == inst_id, DigitalCredential.student_id == s.id)
            .order_by(desc(DigitalCredential.created_at))
        )

        items.append(
            StaffStudentRecordItem(
                id=s.id,
                institution_id=s.institution_id,
                student_number=s.student_number,
                full_name=u_name or f"Student {s.student_number}",
                institutional_email=u_email or f"{s.student_number.lower()}@student.invalid",
                campus_id=s.campus_id,
                campus_name=camp_name,
                campus_code=camp_code,
                programme_id=prog.id if prog else None,
                programme_name=prog.name if prog else None,
                programme_code=prog.code if prog else None,
                academic_year=enr.academic_year if enr else None,
                study_year=enr.study_year if enr else None,
                enrollment_status=enr.status if enr else "active",
                status=s.status,
                source="institutional_registry",
                credential_status=cred.status if cred else "none",
                credential_id=cred.id if cred else None,
                created_at=s.created_at,
                updated_at=s.updated_at,
            )
        )

    # Imported roster rows are institutional evidence, not yet student accounts.
    # Keep them visible to reviewers immediately after a commit without creating
    # login-capable Student rows before the normal onboarding decision.
    if not status_filter or status_filter.lower() in ("all", "active"):
        registered_numbers = {item.student_number for item in items}
        roster_records = db.scalars(
            select(ImportedStudentRecord).where(
                ImportedStudentRecord.institution_id == inst_id,
                ImportedStudentRecord.is_current == True,  # noqa: E712
            )
        ).all()
        term = search.strip().casefold() if search and search.strip() else None
        for record in roster_records:
            if record.student_number in registered_numbers:
                continue
            raw = record.raw_data or {}
            searchable = " ".join(filter(None, [record.student_number, record.full_name, record.institutional_email]))
            if term and term not in searchable.casefold():
                continue
            items.append(StaffStudentRecordItem(
                id=record.id,
                institution_id=record.institution_id,
                student_number=record.student_number,
                full_name=record.full_name or "Name not supplied in roster",
                institutional_email=record.institutional_email,
                campus_id=None,
                campus_name=raw.get("campus_name") or record.campus_code,
                campus_code=record.campus_code,
                programme_id=None,
                programme_name=raw.get("programme_name") or record.programme_code,
                programme_code=record.programme_code,
                academic_year=record.academic_year,
                study_year=None,
                enrollment_status=record.enrollment_status,
                status="active",
                source="imported_roster",
                credential_status="none",
                credential_id=None,
                created_at=record.created_at,
                updated_at=record.created_at,
            ))

    items.sort(key=lambda item: (item.student_number.casefold(), item.source != "imported_roster"))
    total = len(items)
    start = (page - 1) * page_size
    items = items[start:start + page_size]

    return StaffStudentRecordListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, math.ceil(total / page_size)),
    )


@router.post("/records", response_model=StaffStudentRecordItem, status_code=status.HTTP_201_CREATED)
async def create_student_record(
    payload: StaffCreateStudentRecordRequest,
    tenant: Annotated[TenantAccess, Depends(get_reviewer_access)],
    db: Annotated[Session, Depends(get_db)],
) -> StaffStudentRecordItem:
    inst_id = tenant.institution.id

    # Check unique student number within institution
    existing = db.scalar(
        select(Student).where(
            Student.institution_id == inst_id,
            Student.student_number == payload.student_number.strip(),
        )
    )
    if existing:
        raise ValidationException(
            f"A student with registration number '{payload.student_number}' already exists in this institution."
        )
    roster_conflict = db.scalar(
        select(ImportedStudentRecord).where(
            ImportedStudentRecord.institution_id == inst_id,
            ImportedStudentRecord.student_number == payload.student_number.strip(),
            ImportedStudentRecord.is_current == True,  # noqa: E712
        )
    )
    if roster_conflict:
        raise ValidationException(
            "This registration number already exists in the current institutional roster. "
            "Use the roster import workflow or review the existing evidence instead of creating a duplicate."
        )

    # Check campus exists
    campus = db.scalar(
        select(Campus).where(Campus.id == payload.campus_id, Campus.institution_id == inst_id)
    )
    if not campus:
        raise ValidationException("Selected campus does not belong to your institution.")

    # Check programme exists
    programme = db.scalar(
        select(Programme).where(Programme.id == payload.programme_id, Programme.institution_id == inst_id)
    )
    if not programme:
        raise ValidationException("Selected programme does not belong to your institution.")

    # Find or create User for institutional email
    user = db.scalar(select(User).where(User.email == payload.institutional_email.strip().lower()))
    if not user:
        user = User(
            email=payload.institutional_email.strip().lower(),
            full_name=payload.full_name.strip(),
            password_hash="!NO_PASSWORD_SET",
            status="active",
        )
        db.add(user)
        db.flush()

    # Create Student
    student = Student(
        institution_id=inst_id,
        campus_id=campus.id,
        student_number=payload.student_number.strip(),
        user_id=user.id,
        status="active",
    )
    db.add(student)
    db.flush()

    # Create ProgrammeEnrollment
    enr = ProgrammeEnrollment(
        institution_id=inst_id,
        student_id=student.id,
        programme_id=programme.id,
        academic_year=payload.academic_year.strip(),
        study_year=payload.study_year or 1,
        status=payload.enrollment_status,
    )
    db.add(enr)

    # Write AuditEvent
    audit = AuditEvent(
        institution_id=inst_id,
        actor_user_id=tenant.user.id,
        action="student.created",
        resource_type="students",
        resource_id=student.id,
        event_metadata={
            "student_number": student.student_number,
            "full_name": payload.full_name,
            "email": payload.institutional_email,
            "campus": campus.name,
            "programme": programme.name,
        },
    )
    db.add(audit)
    db.commit()
    db.refresh(student)

    return StaffStudentRecordItem(
        id=student.id,
        institution_id=inst_id,
        student_number=student.student_number,
        full_name=user.full_name,
        institutional_email=user.email,
        campus_id=campus.id,
        campus_name=campus.name,
        campus_code=campus.code,
        programme_id=programme.id,
        programme_name=programme.name,
        programme_code=programme.code,
        academic_year=enr.academic_year,
        study_year=enr.study_year,
        enrollment_status=enr.status,
        status=student.status,
        source="manual",
        credential_status="none",
        credential_id=None,
        created_at=student.created_at,
        updated_at=student.updated_at,
    )


@router.get("/records/{record_id}", response_model=StaffStudentRecordDetail)
async def get_student_record(
    record_id: uuid.UUID,
    tenant: Annotated[TenantAccess, Depends(get_reviewer_access)],
    db: Annotated[Session, Depends(get_db)],
) -> StaffStudentRecordDetail:
    inst_id = tenant.institution.id

    student = db.scalar(
        select(Student).where(Student.id == record_id, Student.institution_id == inst_id)
    )
    if not student:
        roster_record = db.scalar(
            select(ImportedStudentRecord).where(
                ImportedStudentRecord.id == record_id,
                ImportedStudentRecord.institution_id == inst_id,
                ImportedStudentRecord.is_current == True,  # noqa: E712
            )
        )
        if not roster_record:
            raise NotFoundException("Student record not found.")
        raw = roster_record.raw_data or {}
        import_audits = db.scalars(
            select(AuditEvent).where(
                AuditEvent.institution_id == inst_id,
                AuditEvent.resource_id == roster_record.roster_import_id,
            ).order_by(desc(AuditEvent.created_at))
        ).all()
        return StaffStudentRecordDetail(
            student=StaffStudentRecordItem(
                id=roster_record.id,
                institution_id=roster_record.institution_id,
                student_number=roster_record.student_number,
                full_name=roster_record.full_name or "Name not supplied in roster",
                institutional_email=roster_record.institutional_email,
                campus_id=None,
                campus_name=raw.get("campus_name") or roster_record.campus_code,
                campus_code=roster_record.campus_code,
                programme_id=None,
                programme_name=raw.get("programme_name") or roster_record.programme_code,
                programme_code=roster_record.programme_code,
                academic_year=roster_record.academic_year,
                study_year=None,
                enrollment_status=roster_record.enrollment_status,
                status="active",
                source="imported_roster",
                credential_status="none",
                credential_id=None,
                created_at=roster_record.created_at,
                updated_at=roster_record.created_at,
            ),
            audit_history=[
                {"action": event.action, "timestamp": event.created_at.isoformat(), "metadata": event.event_metadata}
                for event in import_audits
            ],
            available_campuses=[],
            available_programmes=[],
        )

    campus = db.get(Campus, student.campus_id)
    user = db.get(User, student.user_id) if student.user_id else None

    enr = db.scalar(
        select(ProgrammeEnrollment)
        .where(ProgrammeEnrollment.institution_id == inst_id, ProgrammeEnrollment.student_id == student.id)
        .order_by(desc(ProgrammeEnrollment.created_at))
    )
    prog = db.get(Programme, enr.programme_id) if enr else None

    cred = db.scalar(
        select(DigitalCredential)
        .where(DigitalCredential.institution_id == inst_id, DigitalCredential.student_id == student.id)
        .order_by(desc(DigitalCredential.created_at))
    )

    student_item = StaffStudentRecordItem(
        id=student.id,
        institution_id=inst_id,
        student_number=student.student_number,
        full_name=user.full_name if user else f"Student {student.student_number}",
        institutional_email=user.email if user else f"{student.student_number.lower()}@student.invalid",
        campus_id=campus.id if campus else student.campus_id,
        campus_name=campus.name if campus else "Main Campus",
        campus_code=campus.code if campus else "MAIN",
        programme_id=prog.id if prog else None,
        programme_name=prog.name if prog else None,
        programme_code=prog.code if prog else None,
        academic_year=enr.academic_year if enr else None,
        study_year=enr.study_year if enr else None,
        enrollment_status=enr.status if enr else "active",
        status=student.status,
        source="institutional_registry",
        credential_status=cred.status if cred else "none",
        credential_id=cred.id if cred else None,
        created_at=student.created_at,
        updated_at=student.updated_at,
    )

    # Audit history for this record
    audit_events = db.scalars(
        select(AuditEvent)
        .where(AuditEvent.institution_id == inst_id, AuditEvent.resource_id == student.id)
        .order_by(desc(AuditEvent.created_at))
    ).all()
    history = [
        {"action": e.action, "timestamp": e.created_at.isoformat(), "metadata": e.event_metadata}
        for e in audit_events
    ]

    campuses = db.scalars(select(Campus).where(Campus.institution_id == inst_id, Campus.status == "active")).all()
    programmes = db.scalars(select(Programme).where(Programme.institution_id == inst_id, Programme.status == "active")).all()

    return StaffStudentRecordDetail(
        student=student_item,
        audit_history=history,
        available_campuses=[{"id": str(c.id), "name": c.name, "code": c.code} for c in campuses],
        available_programmes=[{"id": str(p.id), "name": p.name, "code": p.code} for p in programmes],
    )


@router.patch("/records/{record_id}", response_model=StaffStudentRecordItem)
async def update_student_record(
    record_id: uuid.UUID,
    payload: StaffUpdateStudentRecordRequest,
    tenant: Annotated[TenantAccess, Depends(get_reviewer_access)],
    db: Annotated[Session, Depends(get_db)],
) -> StaffStudentRecordItem:
    inst_id = tenant.institution.id

    student = db.scalar(
        select(Student).where(Student.id == record_id, Student.institution_id == inst_id)
    )
    if not student:
        raise NotFoundException("Student record not found.")

    diff: dict[str, Any] = {}

    if payload.campus_id:
        camp = db.scalar(select(Campus).where(Campus.id == payload.campus_id, Campus.institution_id == inst_id))
        if not camp:
            raise ValidationException("Selected campus does not belong to your institution.")
        diff["campus_id"] = {"from": str(student.campus_id), "to": str(payload.campus_id)}
        student.campus_id = payload.campus_id

    user = db.get(User, student.user_id) if student.user_id else None
    if payload.full_name and user:
        diff["full_name"] = {"from": user.full_name, "to": payload.full_name.strip()}
        user.full_name = payload.full_name.strip()

    enr = db.scalar(
        select(ProgrammeEnrollment)
        .where(ProgrammeEnrollment.institution_id == inst_id, ProgrammeEnrollment.student_id == student.id)
        .order_by(desc(ProgrammeEnrollment.created_at))
    )

    if enr:
        if payload.programme_id:
            prog = db.scalar(select(Programme).where(Programme.id == payload.programme_id, Programme.institution_id == inst_id))
            if not prog:
                raise ValidationException("Selected programme does not belong to your institution.")
            diff["programme_id"] = {"from": str(enr.programme_id), "to": str(payload.programme_id)}
            enr.programme_id = payload.programme_id
        if payload.academic_year:
            diff["academic_year"] = {"from": enr.academic_year, "to": payload.academic_year.strip()}
            enr.academic_year = payload.academic_year.strip()
        if payload.study_year is not None:
            diff["study_year"] = {"from": enr.study_year, "to": payload.study_year}
            enr.study_year = payload.study_year
        if payload.enrollment_status:
            diff["enrollment_status"] = {"from": enr.status, "to": payload.enrollment_status}
            enr.status = payload.enrollment_status

    audit = AuditEvent(
        institution_id=inst_id,
        actor_user_id=tenant.user.id,
        action="student.updated",
        resource_type="students",
        resource_id=student.id,
        event_metadata=diff,
    )
    db.add(audit)
    db.commit()
    db.refresh(student)

    detail = await get_student_record(record_id, tenant, db)
    return detail.student


@router.post("/records/{record_id}/archive")
async def archive_student_record(
    record_id: uuid.UUID,
    tenant: Annotated[TenantAccess, Depends(get_reviewer_access)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, str]:
    inst_id = tenant.institution.id

    student = db.scalar(
        select(Student).where(Student.id == record_id, Student.institution_id == inst_id)
    )
    if not student:
        raise NotFoundException("Student record not found.")

    student.status = "archived"

    audit = AuditEvent(
        institution_id=inst_id,
        actor_user_id=tenant.user.id,
        action="student.archived",
        resource_type="students",
        resource_id=student.id,
        event_metadata={"student_number": student.student_number},
    )
    db.add(audit)
    db.commit()

    return {"message": f"Student {student.student_number} has been archived."}


@router.post("/records/{record_id}/restore")
async def restore_student_record(
    record_id: uuid.UUID,
    tenant: Annotated[TenantAccess, Depends(get_reviewer_access)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, str]:
    inst_id = tenant.institution.id

    student = db.scalar(
        select(Student).where(Student.id == record_id, Student.institution_id == inst_id)
    )
    if not student:
        raise NotFoundException("Student record not found.")

    student.status = "active"

    audit = AuditEvent(
        institution_id=inst_id,
        actor_user_id=tenant.user.id,
        action="student.restored",
        resource_type="students",
        resource_id=student.id,
        event_metadata={"student_number": student.student_number},
    )
    db.add(audit)
    db.commit()

    return {"message": f"Student {student.student_number} has been restored to active status."}


# ── 4. File Import Wizard & Pipeline ───────────────────────────────────────────

@router.get("/demo/luanar-roster.csv", response_class=Response)
async def download_luanar_demo_roster(
    tenant: Annotated[TenantAccess, Depends(get_reviewer_access)],
    validation_cases: bool = Query(False, description="Append deliberately invalid rows for preview validation"),
) -> Response:
    """Download a generated synthetic roster for the selected LUANAR demo tenant."""
    if not settings.UNIID_DEMO_MODE or tenant.institution.slug != "luanar":
        raise NotFoundException("LUANAR demo roster download is not available in this context.")
    scenario = "validation" if validation_cases else "ready"
    return Response(
        content=roster_csv(include_validation_cases=validation_cases),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="luanar-demo-roster-{scenario}.csv"',
            "X-UniID-Demo-Roster-Version": DEMO_ROSTER_VERSION,
        },
    )

@router.post("/imports", response_model=StaffImportUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_import_file(
    tenant: Annotated[TenantAccess, Depends(get_reviewer_access)],
    db: Annotated[Session, Depends(get_db)],
    file: UploadFile = File(...),
) -> StaffImportUploadResponse:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise ValidationException("Only CSV (.csv) files are currently supported for institutional imports.")

    content = await file.read()
    if not content:
        raise ValidationException("Uploaded file is empty.")

    result = create_import_job(
        db=db,
        institution_id=tenant.institution.id,
        uploader_user_id=tenant.user.id,
        filename=file.filename,
        raw_content=content,
    )
    return StaffImportUploadResponse(**result)


@router.get("/imports", response_model=StaffImportListResponse)
async def list_imports(
    tenant: Annotated[TenantAccess, Depends(get_reviewer_access)],
    db: Annotated[Session, Depends(get_db)],
) -> StaffImportListResponse:
    inst_id = tenant.institution.id

    stmt = (
        select(RosterImport, User.full_name.label("user_name"), User.email.label("user_email"))
        .join(User, User.id == RosterImport.uploaded_by_user_id)
        .where(RosterImport.institution_id == inst_id)
        .order_by(desc(RosterImport.created_at))
    )
    rows = db.execute(stmt).all()

    imports = [
        StaffImportSummary(
            id=r.id,
            filename=r.filename,
            version_tag=r.version_tag,
            status=r.status,
            total_rows=r.total_rows,
            valid_rows=r.valid_rows,
            new_records_count=r.new_records_count,
            updated_records_count=r.updated_records_count,
            rejected_rows_count=r.rejected_rows_count,
            is_authoritative_snapshot=r.is_authoritative_snapshot,
            file_checksum=r.file_checksum,
            uploaded_by_name=uname,
            uploaded_by_email=uemail,
            created_at=r.created_at,
            committed_at=r.committed_at if r.status == "committed" else None,
        )
        for r, uname, uemail in rows
    ]

    freshness = check_roster_freshness(db, inst_id)

    return StaffImportListResponse(
        imports=imports,
        total=len(imports),
        freshness_status=freshness.get("status", "missing"),
        freshness_days=tenant.institution.roster_freshness_days,
        last_imported_at=tenant.institution.roster_last_imported_at,
    )


@router.get("/imports/{import_id}")
async def get_import_details(
    import_id: uuid.UUID,
    tenant: Annotated[TenantAccess, Depends(get_reviewer_access)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, Any]:
    inst_id = tenant.institution.id

    imp = db.scalar(
        select(RosterImport).where(RosterImport.id == import_id, RosterImport.institution_id == inst_id)
    )
    if not imp:
        raise NotFoundException("Import job not found.")

    uploader = db.get(User, imp.uploaded_by_user_id)

    return {
        "id": imp.id,
        "filename": imp.filename,
        "version_tag": imp.version_tag,
        "status": imp.status,
        "total_rows": imp.total_rows,
        "valid_rows": imp.valid_rows,
        "new_records_count": imp.new_records_count,
        "updated_records_count": imp.updated_records_count,
        "rejected_rows_count": imp.rejected_rows_count,
        "is_authoritative_snapshot": imp.is_authoritative_snapshot,
        "mapping_config": imp.mapping_config,
        "transformation_config": imp.transformation_config,
        "reconciliation_summary": imp.reconciliation_summary,
        "validation_errors": imp.validation_errors,
        "uploaded_by": uploader.full_name if uploader else "Unknown",
        "created_at": imp.created_at.isoformat(),
        "committed_at": imp.committed_at.isoformat() if imp.committed_at else None,
    }


@router.put("/imports/{import_id}/mapping")
async def update_mapping(
    import_id: uuid.UUID,
    payload: StaffMappingRequest,
    tenant: Annotated[TenantAccess, Depends(get_reviewer_access)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, Any]:
    inst_id = tenant.institution.id

    imp = db.scalar(
        select(RosterImport).where(RosterImport.id == import_id, RosterImport.institution_id == inst_id)
    )
    if not imp:
        raise NotFoundException("Import job not found.")

    if imp.status == "committed":
        raise ValidationException("Cannot update mapping on a committed import.")

    result = apply_mapping_and_validate(
        db=db,
        import_job=imp,
        mappings=payload.mappings,
        save_as_template=payload.save_as_template,
        template_name=payload.template_name,
        template_description=payload.template_description,
        actor_user_id=tenant.user.id,
    )
    return result


@router.post("/imports/{import_id}/validate", response_model=StaffImportPreviewResponse)
async def validate_import(
    import_id: uuid.UUID,
    payload: StaffTransformationConfig,
    tenant: Annotated[TenantAccess, Depends(get_reviewer_access)],
    db: Annotated[Session, Depends(get_db)],
) -> StaffImportPreviewResponse:
    inst_id = tenant.institution.id

    imp = db.scalar(
        select(RosterImport).where(RosterImport.id == import_id, RosterImport.institution_id == inst_id)
    )
    if not imp:
        raise NotFoundException("Import job not found.")

    result = apply_mapping_and_validate(
        db=db,
        import_job=imp,
        mappings=imp.mapping_config or {},
        transformations={
            "trim_whitespace": payload.trim_whitespace,
            "collapse_whitespace": payload.collapse_whitespace,
            "normalize_email": payload.normalize_email,
            "preserve_string_identifiers": payload.preserve_string_identifiers,
            "date_format": payload.date_format,
        },
        status_dictionary=payload.status_dictionary,
        actor_user_id=tenant.user.id,
    )
    return StaffImportPreviewResponse(**result)


@router.get("/imports/{import_id}/preview", response_model=StaffImportPreviewResponse)
async def get_preview(
    import_id: uuid.UUID,
    tenant: Annotated[TenantAccess, Depends(get_reviewer_access)],
    db: Annotated[Session, Depends(get_db)],
) -> StaffImportPreviewResponse:
    inst_id = tenant.institution.id

    imp = db.scalar(
        select(RosterImport).where(RosterImport.id == import_id, RosterImport.institution_id == inst_id)
    )
    if not imp:
        raise NotFoundException("Import job not found.")

    result = apply_mapping_and_validate(
        db=db,
        import_job=imp,
        mappings=imp.mapping_config or {},
        transformations=imp.transformation_config.get("transformations"),
        status_dictionary=imp.transformation_config.get("status_dictionary"),
    )
    return StaffImportPreviewResponse(**result)


@router.post("/imports/{import_id}/commit", response_model=StaffCommitResponse)
async def commit_import(
    import_id: uuid.UUID,
    payload: StaffCommitRequest,
    tenant: Annotated[TenantAccess, Depends(get_reviewer_access)],
    db: Annotated[Session, Depends(get_db)],
) -> StaffCommitResponse:
    inst_id = tenant.institution.id

    imp = db.scalar(
        select(RosterImport).where(RosterImport.id == import_id, RosterImport.institution_id == inst_id)
    )
    if not imp:
        raise NotFoundException("Import job not found.")

    result = commit_import_job(
        db=db,
        import_job=imp,
        committer_user_id=tenant.user.id,
        is_authoritative_snapshot=payload.is_authoritative_snapshot,
        allow_partial_commit=payload.allow_partial_commit,
    )
    return StaffCommitResponse(**result)


# ── 5. Saved Mapping Templates ─────────────────────────────────────────────────

@router.get("/mapping-templates", response_model=list[StaffMappingTemplateRead])
async def list_templates(
    tenant: Annotated[TenantAccess, Depends(get_reviewer_access)],
    db: Annotated[Session, Depends(get_db)],
) -> list[StaffMappingTemplateRead]:
    inst_id = tenant.institution.id

    templates = db.scalars(
        select(ImportMappingTemplate).where(
            ImportMappingTemplate.institution_id == inst_id,
            ImportMappingTemplate.is_active == True,
        ).order_by(ImportMappingTemplate.name)
    ).all()

    return [StaffMappingTemplateRead.model_validate(t) for t in templates]


@router.post("/mapping-templates", response_model=StaffMappingTemplateRead, status_code=status.HTTP_201_CREATED)
async def create_template(
    payload: StaffMappingTemplateCreateRequest,
    tenant: Annotated[TenantAccess, Depends(get_reviewer_access)],
    db: Annotated[Session, Depends(get_db)],
) -> StaffMappingTemplateRead:
    inst_id = tenant.institution.id

    existing = db.scalar(
        select(ImportMappingTemplate).where(
            ImportMappingTemplate.institution_id == inst_id,
            ImportMappingTemplate.name == payload.name.strip(),
        )
    )
    version = (existing.version + 1) if existing else 1

    tmpl = ImportMappingTemplate(
        institution_id=inst_id,
        name=payload.name.strip(),
        description=payload.description,
        source_headers=payload.source_headers,
        mappings=payload.mappings,
        transformations=payload.transformations,
        status_dictionary=payload.status_dictionary,
        version=version,
        is_active=True,
        created_by_user_id=tenant.user.id,
    )
    db.add(tmpl)
    db.commit()
    db.refresh(tmpl)

    return StaffMappingTemplateRead.model_validate(tmpl)


@router.get("/mapping-templates/{template_id}", response_model=StaffMappingTemplateRead)
async def get_template(
    template_id: uuid.UUID,
    tenant: Annotated[TenantAccess, Depends(get_reviewer_access)],
    db: Annotated[Session, Depends(get_db)],
) -> StaffMappingTemplateRead:
    inst_id = tenant.institution.id

    tmpl = db.scalar(
        select(ImportMappingTemplate).where(
            ImportMappingTemplate.id == template_id,
            ImportMappingTemplate.institution_id == inst_id,
        )
    )
    if not tmpl:
        raise NotFoundException("Mapping template not found.")

    return StaffMappingTemplateRead.model_validate(tmpl)


# ── 6. Audit History ───────────────────────────────────────────────────────────

@router.get("/audit", response_model=StaffAuditResponse)
async def get_audit_trail(
    tenant: Annotated[TenantAccess, Depends(get_reviewer_access)],
    db: Annotated[Session, Depends(get_db)],
    action: str | None = Query(None),
    resource_type: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
) -> StaffAuditResponse:
    inst_id = tenant.institution.id

    filters = [AuditEvent.institution_id == inst_id]

    if action:
        filters.append(AuditEvent.action.ilike(f"%{action.strip()}%"))
    if resource_type:
        filters.append(AuditEvent.resource_type == resource_type.strip())
    if search:
        term = f"%{search.strip()}%"
        filters.append(
            or_(
                AuditEvent.action.ilike(term),
                AuditEvent.resource_type.ilike(term),
            )
        )

    total = db.scalar(select(func.count()).select_from(AuditEvent).where(*filters)) or 0

    stmt = (
        select(AuditEvent, User.full_name.label("actor_name"), User.email.label("actor_email"))
        .outerjoin(User, User.id == AuditEvent.actor_user_id)
        .where(*filters)
        .order_by(desc(AuditEvent.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    rows = db.execute(stmt).all()
    items = []
    for event, actor_name, actor_email in rows:
        items.append(
            StaffAuditEventItem(
                id=event.id,
                action=event.action,
                resource_type=event.resource_type,
                resource_id=event.resource_id,
                actor_id=event.actor_user_id,
                actor_name=actor_name,
                actor_email=actor_email,
                metadata=event.event_metadata or {},
                created_at=event.created_at,
            )
        )

    return StaffAuditResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, math.ceil(total / page_size)),
    )


# ── 7. Student Requests Management ─────────────────────────────────────────────

@router.get("/requests", response_model=StaffRequestListResponse)
async def get_staff_requests(
    tenant: Annotated[TenantAccess, Depends(get_reviewer_access)],
    db: Annotated[Session, Depends(get_db)],
    status: str | None = Query(None),
    category: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
) -> StaffRequestListResponse:
    inst_id = tenant.institution.id

    filters = [StudentRequest.institution_id == inst_id]

    if status and status != "all":
        filters.append(StudentRequest.status == status.strip())
    if category and category != "all":
        filters.append(StudentRequest.category == category.strip())

    if search:
        term = f"%{search.strip()}%"
        filters.append(
            or_(
                StudentRequest.reference.ilike(term),
                StudentRequest.subject.ilike(term),
                StudentRequest.description.ilike(term),
                User.full_name.ilike(term),
                Student.student_number.ilike(term),
            )
        )

    # Base query joined with User and Student
    base_query = (
        select(StudentRequest, User, Student, Programme.name.label("programme_name"))
        .join(User, User.id == StudentRequest.user_id)
        .outerjoin(Student, Student.id == StudentRequest.student_id)
        .outerjoin(ProgrammeEnrollment, and_(
            ProgrammeEnrollment.student_id == Student.id,
            ProgrammeEnrollment.status == "active",
        ))
        .outerjoin(Programme, Programme.id == ProgrammeEnrollment.programme_id)
        .where(*filters)
    )

    total_query = select(func.count(StudentRequest.id)).select_from(StudentRequest).join(User, User.id == StudentRequest.user_id).outerjoin(Student, Student.id == StudentRequest.student_id).where(*filters)
    total = db.scalar(total_query) or 0

    # Counts for status tabs
    pending_count = db.scalar(
        select(func.count(StudentRequest.id)).where(
            StudentRequest.institution_id == inst_id,
            StudentRequest.status == "pending",
        )
    ) or 0
    in_review_count = db.scalar(
        select(func.count(StudentRequest.id)).where(
            StudentRequest.institution_id == inst_id,
            StudentRequest.status == "in_review",
        )
    ) or 0
    resolved_count = db.scalar(
        select(func.count(StudentRequest.id)).where(
            StudentRequest.institution_id == inst_id,
            StudentRequest.status == "resolved",
        )
    ) or 0
    declined_count = db.scalar(
        select(func.count(StudentRequest.id)).where(
            StudentRequest.institution_id == inst_id,
            StudentRequest.status == "declined",
        )
    ) or 0

    stmt = (
        base_query.order_by(desc(StudentRequest.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    rows = db.execute(stmt).all()
    items = []
    for req, usr, stud, prog_name in rows:
        items.append(
            StaffRequestItem(
                id=req.id,
                reference=req.reference,
                student_id=stud.id if stud else None,
                student_number=stud.student_number if stud else None,
                student_name=usr.full_name if usr else (stud.full_name if stud else "Unknown Student"),
                student_email=usr.email if usr else (stud.institutional_email if stud else ""),
                programme_name=prog_name,
                category=req.category,
                subject=req.subject,
                description=req.description,
                field_name=req.field_name,
                current_value=req.current_value,
                requested_value=req.requested_value,
                status=req.status,
                resolution_notes=req.resolution_notes,
                created_at=req.created_at,
                updated_at=req.updated_at,
            )
        )

    return StaffRequestListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, math.ceil(total / page_size)),
        pending_count=pending_count,
        in_review_count=in_review_count,
        resolved_count=resolved_count,
        declined_count=declined_count,
    )


@router.get("/requests/{request_id}", response_model=StaffRequestItem)
async def get_staff_request_detail(
    request_id: uuid.UUID,
    tenant: Annotated[TenantAccess, Depends(get_reviewer_access)],
    db: Annotated[Session, Depends(get_db)],
) -> StaffRequestItem:
    stmt = (
        select(StudentRequest, User, Student, Programme.name.label("programme_name"))
        .join(User, User.id == StudentRequest.user_id)
        .outerjoin(Student, Student.id == StudentRequest.student_id)
        .outerjoin(ProgrammeEnrollment, and_(
            ProgrammeEnrollment.student_id == Student.id,
            ProgrammeEnrollment.status == "active",
        ))
        .outerjoin(Programme, Programme.id == ProgrammeEnrollment.programme_id)
        .where(
            StudentRequest.id == request_id,
            StudentRequest.institution_id == tenant.institution.id,
        )
    )
    row = db.execute(stmt).first()
    if not row:
        raise NotFoundException("Student request not found or not in authorized institution.")

    req, usr, stud, prog_name = row
    return StaffRequestItem(
        id=req.id,
        reference=req.reference,
        student_id=stud.id if stud else None,
        student_number=stud.student_number if stud else None,
        student_name=usr.full_name if usr else (stud.full_name if stud else "Unknown Student"),
        student_email=usr.email if usr else (stud.institutional_email if stud else ""),
        programme_name=prog_name,
        category=req.category,
        subject=req.subject,
        description=req.description,
        field_name=req.field_name,
        current_value=req.current_value,
        requested_value=req.requested_value,
        status=req.status,
        resolution_notes=req.resolution_notes,
        created_at=req.created_at,
        updated_at=req.updated_at,
    )


@router.post("/requests/{request_id}/decision", response_model=StaffRequestItem)
async def submit_staff_request_decision(
    request_id: uuid.UUID,
    payload: StaffRequestDecisionRequest,
    tenant: Annotated[TenantAccess, Depends(get_reviewer_access)],
    db: Annotated[Session, Depends(get_db)],
) -> StaffRequestItem:
    req = db.scalar(
        select(StudentRequest).where(
            StudentRequest.id == request_id,
            StudentRequest.institution_id == tenant.institution.id,
        )
    )
    if not req:
        raise NotFoundException("Student request not found.")

    prev_status = req.status
    req.status = payload.decision
    req.resolution_notes = payload.resolution_notes

    # Audit event capture
    audit = AuditEvent(
        institution_id=tenant.institution.id,
        actor_user_id=tenant.user.id,
        action=f"student_request_{payload.decision}",
        resource_type="student_request",
        resource_id=req.id,
        event_metadata={
            "reference": req.reference,
            "category": req.category,
            "previous_status": prev_status,
            "new_status": payload.decision,
            "reviewer_name": tenant.user.full_name,
            "resolution_notes": payload.resolution_notes,
        },
    )
    db.add(audit)
    db.commit()
    db.refresh(req)

    return await get_staff_request_detail(request_id=req.id, tenant=tenant, db=db)
