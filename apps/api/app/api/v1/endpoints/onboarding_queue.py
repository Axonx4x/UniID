"""Staff-authenticated onboarding review queue endpoints."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import TenantAccess, require_tenant_access
from app.core.errors import AstraMindException
from app.db.session import get_db
from app.schemas.onboarding import (
    OnboardingQueueItem,
    OnboardingQueueResponse,
    ReviewDecisionRequest,
    ReviewDecisionResponse,
)
from app.services.onboarding import OnboardingError, list_pending_reviews, review_onboarding_request

router = APIRouter(
    prefix="/institutions/{institution_id}/onboarding-queue",
    tags=["onboarding-staff-review"],
)


def _raise_onboarding_error(e: OnboardingError) -> None:
    raise AstraMindException(
        message=e.message,
        code=e.code.upper(),
        status_code=e.status_code,
    )


@router.get("", response_model=OnboardingQueueResponse)
async def list_queue(
    institution_id: uuid.UUID,
    tenant: Annotated[TenantAccess, Depends(require_tenant_access("registry_admin", "platform_admin"))],
    db: Annotated[Session, Depends(get_db)],
    status_filter: str | None = None,
) -> OnboardingQueueResponse:
    """List all onboarding requests pending staff review for this institution."""
    items = list_pending_reviews(db, institution_id=institution_id, status_filter=status_filter)
    return OnboardingQueueResponse(
        items=[OnboardingQueueItem(**item) for item in items],
        total=len(items),
    )


@router.post("/{request_id}/review", response_model=ReviewDecisionResponse)
async def review_request(
    institution_id: uuid.UUID,
    request_id: uuid.UUID,
    payload: ReviewDecisionRequest,
    tenant: Annotated[TenantAccess, Depends(require_tenant_access("registry_admin", "platform_admin"))],
    db: Annotated[Session, Depends(get_db)],
) -> ReviewDecisionResponse:
    """Approve, reject, or request follow-up for an onboarding request."""
    try:
        result = review_onboarding_request(
            db,
            request_id=request_id,
            institution_id=institution_id,
            reviewer_user_id=tenant.user.id,
            decision=payload.decision,
            notes=payload.notes,
            follow_up_instructions=payload.follow_up_instructions,
        )
    except OnboardingError as e:
        _raise_onboarding_error(e)
    return ReviewDecisionResponse(**result)
