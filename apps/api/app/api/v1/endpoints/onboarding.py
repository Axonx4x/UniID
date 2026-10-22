"""Public student onboarding endpoints: registration, email OTP, status, and follow-up."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import AstraMindException
from app.db.session import get_db
from app.schemas.onboarding import (
    DevMailboxResponse,
    FollowUpRequest,
    FollowUpResponse,
    OnboardingStatusResponse,
    RegisterStudentRequest,
    RegisterStudentResponse,
    ResendCodeRequest,
    ResendCodeResponse,
    VerifyCodeRequest,
    VerifyCodeResponse,
)
from app.services.onboarding import (
    OnboardingError,
    get_onboarding_status,
    register_student,
    resend_otp,
    submit_follow_up,
    verify_email_code,
)
from app.services.otp import get_dev_mailbox_code

router = APIRouter(prefix="/onboarding", tags=["student-onboarding"])


def _raise_onboarding_error(e: OnboardingError) -> None:
    raise AstraMindException(
        message=e.message,
        code=e.code.upper(),
        status_code=e.status_code,
    )


@router.post("/register", response_model=RegisterStudentResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterStudentRequest,
    db: Annotated[Session, Depends(get_db)],
) -> RegisterStudentResponse:
    """Register a new student account and dispatch an email verification OTP."""
    email_target = (payload.email or payload.institutional_email or "").strip().lower()
    if not email_target or "@" not in email_target:
        raise AstraMindException(message="A valid email address is required.", code="VALIDATION_ERROR", status_code=400)

    try:
        result = register_student(
            db,
            institution_slug=payload.institution_slug,
            institution_id=payload.institution_id,
            email=email_target,
            full_name=payload.full_name,
            password=payload.password,
            student_number=payload.student_number,
        )
    except OnboardingError as e:
        _raise_onboarding_error(e)
    return RegisterStudentResponse(**result)


@router.post("/verify-code", response_model=VerifyCodeResponse)
async def verify_code(
    payload: VerifyCodeRequest,
    db: Annotated[Session, Depends(get_db)],
) -> VerifyCodeResponse:
    """Verify the 6-digit OTP code and proceed through the institution's verification pathway."""
    try:
        result = verify_email_code(db, reference=payload.reference, code=payload.code)
    except OnboardingError as e:
        _raise_onboarding_error(e)
    return VerifyCodeResponse(**result)


@router.post("/resend-code", response_model=ResendCodeResponse)
async def resend_code(
    payload: ResendCodeRequest,
    db: Annotated[Session, Depends(get_db)],
) -> ResendCodeResponse:
    """Resend the email verification OTP code."""
    try:
        result = resend_otp(db, reference=payload.reference)
    except OnboardingError as e:
        _raise_onboarding_error(e)
    return ResendCodeResponse(**result)


@router.get("/status/{reference}", response_model=OnboardingStatusResponse)
async def onboarding_status(
    reference: str,
    db: Annotated[Session, Depends(get_db)],
) -> OnboardingStatusResponse:
    """Retrieve the current status of an onboarding request by reference."""
    try:
        result = get_onboarding_status(db, reference=reference)
    except OnboardingError as e:
        _raise_onboarding_error(e)
    return OnboardingStatusResponse(**result)


@router.post("/follow-up", response_model=FollowUpResponse)
async def follow_up(
    payload: FollowUpRequest,
    db: Annotated[Session, Depends(get_db)],
) -> FollowUpResponse:
    """Submit a follow-up response to staff during the review process."""
    try:
        result = submit_follow_up(db, reference=payload.reference, message=payload.message)
    except OnboardingError as e:
        _raise_onboarding_error(e)
    return FollowUpResponse(**result)


@router.get("/dev-mailbox", response_model=DevMailboxResponse)
async def dev_mailbox(
    email: Annotated[str, Query(min_length=3, max_length=320)],
) -> DevMailboxResponse:
    """Test-only endpoint to inspect simulated OTPs; never expose this to real users."""
    if settings.is_production or not (
        settings.OTP_DELIVERY_MODE == "development" and settings.OTP_DEV_MAILBOX_ENABLED
    ):
        raise AstraMindException(
            message="Dev mailbox is not available",
            code="NOT_AVAILABLE",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    entry = get_dev_mailbox_code(email)
    return DevMailboxResponse(
        email=email.strip().lower(),
        entry=entry,
    )
