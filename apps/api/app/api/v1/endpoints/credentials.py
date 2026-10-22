"""Institution-scoped credential eligibility, lifecycle, and student read endpoints."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import AuthenticatedUser, TenantAccess, get_current_user, require_tenant_access
from app.core.errors import NotFoundException
from app.db.session import get_db
from app.models.credential import DigitalCredential
from app.models.identity import Campus, Programme, ProgrammeEnrollment, Student
from app.models.institution import Institution
from app.schemas.credential import (
    CredentialEventPage,
    CredentialEventRead,
    CredentialPage,
    CredentialRead,
    EligibilityRead,
    LifecycleReasonRequest,
    StudentCredentialProfile,
    StudentRegistryDetail,
)
from app.schemas.verification import CredentialQrRead
from app.services.credentials import CredentialEligibilityService, CredentialLifecycleService, total_pages, utc_now
from app.services.qr import build_verification_url, generate_qr_data_url

router = APIRouter(prefix="/institutions/{institution_id}", tags=["credential lifecycle"])


def credential_read(credential: DigitalCredential) -> CredentialRead:
    response = CredentialRead.model_validate(credential)
    # Reads cannot present an overdue active credential as valid while a background expiry pass is delayed.
    if response.status == "active" and not CredentialLifecycleService.is_valid(credential):
        return response.model_copy(update={"status": "expired"})
    return response


def find_student(db: Session, institution_id: uuid.UUID, student_id: uuid.UUID) -> Student:
    student = db.scalar(select(Student).where(Student.id == student_id, Student.institution_id == institution_id))
    if student is None:
        raise NotFoundException("Student record not found")
    return student


def latest_credential(db: Session, institution_id: uuid.UUID, student_id: uuid.UUID) -> DigitalCredential | None:
    return db.scalar(
        select(DigitalCredential)
        .where(DigitalCredential.institution_id == institution_id, DigitalCredential.student_id == student_id)
        .order_by(DigitalCredential.created_at.desc())
    )


def student_detail_response(db: Session, institution: Institution, student: Student, display_name: str) -> StudentCredentialProfile:
    campus = db.scalar(select(Campus).where(Campus.id == student.campus_id, Campus.institution_id == institution.id))
    enrollment_row = db.execute(
        select(ProgrammeEnrollment, Programme)
        .join(Programme, Programme.id == ProgrammeEnrollment.programme_id)
        .where(ProgrammeEnrollment.student_id == student.id, ProgrammeEnrollment.institution_id == institution.id)
        .order_by(ProgrammeEnrollment.created_at.desc())
    ).first()
    enrollment, programme = enrollment_row if enrollment_row else (None, None)
    credential = latest_credential(db, institution.id, student.id)
    verification_url = None
    qr_code_data_url = None
    if credential and credential.public_reference:
        verification_url = build_verification_url(credential.public_reference)
        qr_code_data_url = generate_qr_data_url(credential.public_reference)
    return StudentCredentialProfile(
        institution_name=institution.name,
        student_number=student.student_number,
        display_name=display_name,
        campus_name=campus.name if campus else None,
        programme_name=programme.name if programme else None,
        credential=credential_read(credential) if credential else None,
        verification_url=verification_url,
        qr_code_data_url=qr_code_data_url,
    )


@router.get("/students/{student_id}", response_model=StudentRegistryDetail)
async def registry_student_detail(
    institution_id: uuid.UUID,
    student_id: uuid.UUID,
    _: Annotated[TenantAccess, Depends(require_tenant_access("registry_admin"))],
    db: Annotated[Session, Depends(get_db)],
) -> StudentRegistryDetail:
    student = find_student(db, institution_id, student_id)
    campus = db.scalar(select(Campus).where(Campus.id == student.campus_id, Campus.institution_id == institution_id))
    enrollment_row = db.execute(
        select(ProgrammeEnrollment, Programme)
        .join(Programme, Programme.id == ProgrammeEnrollment.programme_id)
        .where(ProgrammeEnrollment.student_id == student.id, ProgrammeEnrollment.institution_id == institution_id)
        .order_by(ProgrammeEnrollment.created_at.desc())
    ).first()
    enrollment, programme = enrollment_row if enrollment_row else (None, None)
    credential = latest_credential(db, institution_id, student_id)
    return StudentRegistryDetail(
        id=student.id,
        student_number=student.student_number,
        campus_name=campus.name if campus else None,
        programme_name=programme.name if programme else None,
        enrollment_status=enrollment.status if enrollment else None,
        academic_year=enrollment.academic_year if enrollment else None,
        credential=credential_read(credential) if credential else None,
    )


@router.get("/students/{student_id}/credential-eligibility", response_model=EligibilityRead)
async def credential_eligibility(
    institution_id: uuid.UUID,
    student_id: uuid.UUID,
    _: Annotated[TenantAccess, Depends(require_tenant_access("registry_admin"))],
    db: Annotated[Session, Depends(get_db)],
) -> EligibilityRead:
    find_student(db, institution_id, student_id)
    decision = CredentialEligibilityService.evaluate(db, institution_id, student_id)
    return EligibilityRead(**decision.__dict__)


@router.get("/students/{student_id}/credentials", response_model=CredentialPage)
async def student_credentials(
    institution_id: uuid.UUID,
    student_id: uuid.UUID,
    _: Annotated[TenantAccess, Depends(require_tenant_access("registry_admin"))],
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> CredentialPage:
    find_student(db, institution_id, student_id)
    items, total = CredentialLifecycleService.list_credentials(db, institution_id, student_id, page, page_size)
    return CredentialPage(items=[credential_read(item) for item in items], total=total, page=page, page_size=page_size, total_pages=total_pages(total, page_size))


@router.post("/students/{student_id}/credentials", response_model=CredentialRead, status_code=201)
async def issue_credential(
    institution_id: uuid.UUID,
    student_id: uuid.UUID,
    access: Annotated[TenantAccess, Depends(require_tenant_access("registry_admin"))],
    db: Annotated[Session, Depends(get_db)],
) -> CredentialRead:
    return credential_read(CredentialLifecycleService.issue(db, institution_id, student_id, access.user.id))


@router.post("/credentials/expire-overdue", response_model=dict[str, int])
async def expire_overdue_credentials(
    institution_id: uuid.UUID,
    _: Annotated[TenantAccess, Depends(require_tenant_access("registry_admin"))],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, int]:
    # An institution-scoped caller is required; service safely processes records it can lock.
    count = CredentialLifecycleService.expire_overdue(db, utc_now(), institution_id)
    return {"expired_count": count}


@router.get("/credentials/{credential_id}", response_model=CredentialRead)
async def get_credential(
    institution_id: uuid.UUID,
    credential_id: uuid.UUID,
    _: Annotated[TenantAccess, Depends(require_tenant_access("registry_admin"))],
    db: Annotated[Session, Depends(get_db)],
) -> CredentialRead:
    credential = CredentialLifecycleService._find_credential_for_update(db, institution_id, credential_id)
    return credential_read(credential)


@router.get("/credentials/{credential_id}/qr", response_model=CredentialQrRead)
async def get_credential_qr(
    institution_id: uuid.UUID,
    credential_id: uuid.UUID,
    _: Annotated[TenantAccess, Depends(require_tenant_access("registry_admin"))],
    db: Annotated[Session, Depends(get_db)],
) -> CredentialQrRead:
    credential = CredentialLifecycleService._find_credential_for_update(db, institution_id, credential_id)
    return CredentialQrRead(
        public_reference=credential.public_reference,
        verification_url=build_verification_url(credential.public_reference),
        qr_code_data_url=generate_qr_data_url(credential.public_reference),
    )


@router.post("/credentials/{credential_id}/suspend", response_model=CredentialRead)
async def suspend_credential(
    institution_id: uuid.UUID,
    credential_id: uuid.UUID,
    payload: LifecycleReasonRequest,
    access: Annotated[TenantAccess, Depends(require_tenant_access("registry_admin"))],
    db: Annotated[Session, Depends(get_db)],
) -> CredentialRead:
    return credential_read(CredentialLifecycleService.suspend(db, institution_id, credential_id, access.user.id, payload.reason.strip()))


@router.post("/credentials/{credential_id}/reinstate", response_model=CredentialRead)
async def reinstate_credential(
    institution_id: uuid.UUID,
    credential_id: uuid.UUID,
    payload: LifecycleReasonRequest,
    access: Annotated[TenantAccess, Depends(require_tenant_access("registry_admin"))],
    db: Annotated[Session, Depends(get_db)],
) -> CredentialRead:
    return credential_read(CredentialLifecycleService.reinstate(db, institution_id, credential_id, access.user.id, payload.reason.strip()))


@router.post("/credentials/{credential_id}/revoke", response_model=CredentialRead)
async def revoke_credential(
    institution_id: uuid.UUID,
    credential_id: uuid.UUID,
    payload: LifecycleReasonRequest,
    access: Annotated[TenantAccess, Depends(require_tenant_access("registry_admin"))],
    db: Annotated[Session, Depends(get_db)],
) -> CredentialRead:
    return credential_read(CredentialLifecycleService.revoke(db, institution_id, credential_id, access.user.id, payload.reason.strip()))


@router.get("/credentials/{credential_id}/events", response_model=CredentialEventPage)
async def credential_events(
    institution_id: uuid.UUID,
    credential_id: uuid.UUID,
    _: Annotated[TenantAccess, Depends(require_tenant_access("registry_admin"))],
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> CredentialEventPage:
    CredentialLifecycleService._find_credential_for_update(db, institution_id, credential_id)
    items, total = CredentialLifecycleService.list_events(db, institution_id, credential_id, page, page_size)
    return CredentialEventPage(items=[CredentialEventRead.model_validate(item) for item in items], total=total, page=page, page_size=page_size, total_pages=total_pages(total, page_size))


@router.get("/students/me/credential", response_model=StudentCredentialProfile)
async def own_credential(
    institution_id: uuid.UUID,
    access: Annotated[TenantAccess, Depends(require_tenant_access("student"))],
    db: Annotated[Session, Depends(get_db)],
) -> StudentCredentialProfile:
    student = db.scalar(select(Student).where(Student.institution_id == institution_id, Student.user_id == access.user.id))
    if student is None:
        raise NotFoundException("No student record is linked to this account")
    return student_detail_response(db, access.institution, student, access.user.full_name)
