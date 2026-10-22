"""Minimal Phase 2 institution-scoped administration endpoints."""

import math
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.dependencies import AuthenticatedUser, TenantAccess, get_current_user, require_tenant_access
from app.db.session import get_db
from app.core.errors import NotFoundException
from app.repositories import institutions as repository
from app.schemas.institution import CampusRead, InstitutionRead, MembershipRead, Page, ProgrammeRead, StudentRead

router = APIRouter(prefix="/institutions", tags=["institutions"])


@router.get("", response_model=list[InstitutionRead])
async def institutions(
    auth: Annotated[AuthenticatedUser, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[InstitutionRead]:
    return [InstitutionRead.model_validate(institution) for institution, _ in repository.list_user_institutions(db, auth.user.id)]


@router.get("/{institution_id}/memberships", response_model=list[MembershipRead])
async def memberships(
    institution_id: uuid.UUID,
    _: Annotated[TenantAccess, Depends(require_tenant_access("registry_admin", "platform_admin"))],
    db: Annotated[Session, Depends(get_db)],
) -> list[MembershipRead]:
    return [MembershipRead.model_validate(item) for item in repository.list_memberships(db, institution_id)]


@router.get("/{institution_id}/students", response_model=Page[StudentRead])
async def students(
    institution_id: uuid.UUID,
    _: Annotated[TenantAccess, Depends(require_tenant_access("registry_admin"))],
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
) -> Page[StudentRead]:
    items, total = repository.list_students(db, institution_id, page, page_size, search)
    return Page[StudentRead](
        items=[StudentRead.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size),
    )


@router.get("/{institution_id}/students/me", response_model=StudentRead)
async def own_student_record(
    institution_id: uuid.UUID,
    access: Annotated[TenantAccess, Depends(require_tenant_access("student"))],
    db: Annotated[Session, Depends(get_db)],
) -> StudentRead:
    student = repository.get_linked_student(db, institution_id, access.user.id)
    if student is None:
        raise NotFoundException("No student record is linked to this account")
    return StudentRead.model_validate(student)


@router.get("/{institution_id}/programmes", response_model=list[ProgrammeRead])
async def programmes(
    institution_id: uuid.UUID,
    _: Annotated[TenantAccess, Depends(require_tenant_access("student", "verifier", "registry_admin", "platform_admin"))],
    db: Annotated[Session, Depends(get_db)],
) -> list[ProgrammeRead]:
    return [ProgrammeRead.model_validate(item) for item in repository.list_programmes(db, institution_id)]


@router.get("/{institution_id}/campuses", response_model=list[CampusRead])
async def campuses(
    institution_id: uuid.UUID,
    _: Annotated[TenantAccess, Depends(require_tenant_access("student", "verifier", "registry_admin", "platform_admin"))],
    db: Annotated[Session, Depends(get_db)],
) -> list[CampusRead]:
    return [CampusRead.model_validate(item) for item in repository.list_campuses(db, institution_id)]
