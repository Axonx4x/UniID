"""Public QR-based credential verification endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, Path, Request, Response
from sqlalchemy.orm import Session

from app.api.dependencies import AuthenticatedUser, get_optional_current_user
from app.core.errors import RateLimitException
from app.core.security import verification_rate_limiter
from app.db.session import get_db
from app.schemas.verification import VerificationPublicResponse
from app.services.credentials import utc_now
from app.services.verification import VerificationService

router = APIRouter(prefix="/public", tags=["verification"])


@router.get(
    "/verify/{opaque_reference}",
    response_model=VerificationPublicResponse,
    summary="Publicly verify a student digital credential via its opaque reference",
    response_description="Minimal approved public verification disclosure",
)
async def public_verify_credential(
    opaque_reference: Annotated[str, Path(min_length=1, max_length=64, description="Opaque QR reference identifier")],
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    auth: Annotated[AuthenticatedUser | None, Depends(get_optional_current_user)] = None,
) -> VerificationPublicResponse:
    # Resolve client IP for sliding window rate limiting
    client_ip = request.client.host if request.client else "unknown"
    throttle_key = f"verify:{client_ip}"

    if verification_rate_limiter.is_limited(throttle_key):
        raise RateLimitException("Too many verification attempts. Please wait before trying again.")

    verification_rate_limiter.record_attempt(throttle_key)

    # Strictly disallow browser/CDN caching of verification outcomes
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
    response.headers["Pragma"] = "no-cache"

    verifier_user_id = auth.user.id if auth else None

    return VerificationService.verify(
        db=db,
        reference=opaque_reference,
        now=utc_now(),
        verifier_user_id=verifier_user_id,
        client_ip=client_ip,
    )
