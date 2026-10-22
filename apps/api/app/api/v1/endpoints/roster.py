"""Roster management endpoints: preview, commit, freshness, and import history."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import TenantAccess, require_tenant_access
from app.core.errors import AstraMindException, ValidationException
from app.db.session import get_db
from app.models.onboarding import RosterImport
from app.schemas.onboarding import (
    RosterCommitRequest,
    RosterCommitResponse,
    RosterFreshnessResponse,
    RosterImportListResponse,
    RosterImportSummary,
    RosterPreviewRequest,
    RosterPreviewResponse,
)
from app.services.roster_import import (
    RosterValidationError,
    check_roster_freshness,
    commit_roster_import,
    preview_roster_import,
)

router = APIRouter(
    prefix="/institutions/{institution_id}/roster",
    tags=["roster-management"],
)


def _raise_roster_error(e: RosterValidationError) -> None:
    raise ValidationException(message=e.message, details=[e.details] if e.details else [])


@router.post("/preview", response_model=RosterPreviewResponse)
def roster_preview(
    institution_id: uuid.UUID,
    tenant: Annotated[TenantAccess, Depends(require_tenant_access("registry_admin", "platform_admin"))],
    db: Annotated[Session, Depends(get_db)],
    payload: RosterPreviewRequest,
) -> RosterPreviewResponse:
    """Preview the effects of importing a CSV roster without committing."""
    if not payload.csv_content or not payload.csv_content.strip():
        raise ValidationException(message="CSV content is empty.")

    try:
        result = preview_roster_import(
            db,
            institution_id=institution_id,
            csv_content=payload.csv_content,
            is_authoritative_snapshot=payload.is_authoritative_snapshot,
        )
    except RosterValidationError as e:
        _raise_roster_error(e)
    return RosterPreviewResponse(**result)


@router.post("/commit", response_model=RosterCommitResponse, status_code=status.HTTP_201_CREATED)
def roster_commit(
    institution_id: uuid.UUID,
    tenant: Annotated[TenantAccess, Depends(require_tenant_access("registry_admin", "platform_admin"))],
    db: Annotated[Session, Depends(get_db)],
    payload: RosterCommitRequest,
) -> RosterCommitResponse:
    """Validate and commit a CSV roster import transactionally."""
    if not payload.csv_content or not payload.csv_content.strip():
        raise ValidationException(message="CSV content is empty.")

    try:
        roster = commit_roster_import(
            db,
            institution_id=institution_id,
            uploaded_by_user_id=tenant.user.id,
            filename=payload.filename,
            csv_content=payload.csv_content,
            is_authoritative_snapshot=payload.is_authoritative_snapshot,
        )
    except RosterValidationError as e:
        _raise_roster_error(e)
    return RosterCommitResponse(
        id=str(roster.id),
        version_tag=roster.version_tag,
        filename=roster.filename,
        total_rows=roster.total_rows,
        valid_rows=roster.valid_rows,
        new_records_count=roster.new_records_count,
        updated_records_count=roster.updated_records_count,
        rejected_rows_count=roster.rejected_rows_count,
        is_authoritative_snapshot=roster.is_authoritative_snapshot,
        status=roster.status,
    )


@router.get("/freshness", response_model=RosterFreshnessResponse)
async def roster_freshness(
    institution_id: uuid.UUID,
    tenant: Annotated[TenantAccess, Depends(require_tenant_access("registry_admin", "platform_admin"))],
    db: Annotated[Session, Depends(get_db)],
) -> RosterFreshnessResponse:
    """Check the freshness of the institution's imported roster."""
    result = check_roster_freshness(db, institution_id=institution_id)
    if "error" in result:
        raise AstraMindException(message=result["error"], code="NOT_FOUND", status_code=404)
    return RosterFreshnessResponse(**result)


@router.get("/imports", response_model=RosterImportListResponse)
async def roster_imports_list(
    institution_id: uuid.UUID,
    tenant: Annotated[TenantAccess, Depends(require_tenant_access("registry_admin", "platform_admin"))],
    db: Annotated[Session, Depends(get_db)],
) -> RosterImportListResponse:
    """List all past roster imports for this institution."""
    stmt = (
        select(RosterImport)
        .where(RosterImport.institution_id == institution_id)
        .order_by(RosterImport.created_at.desc())
    )
    imports = db.scalars(stmt).all()
    items = [
        RosterImportSummary(
            id=str(r.id),
            version_tag=r.version_tag,
            filename=r.filename,
            total_rows=r.total_rows,
            valid_rows=r.valid_rows,
            new_records_count=r.new_records_count,
            updated_records_count=r.updated_records_count,
            rejected_rows_count=r.rejected_rows_count,
            is_authoritative_snapshot=r.is_authoritative_snapshot,
            status=r.status,
            committed_at=r.committed_at.isoformat() if r.committed_at else "",
        )
        for r in imports
    ]
    return RosterImportListResponse(imports=items, total=len(items))
