"""Add student onboarding, email OTP, and roster verification tables.

Revision ID: 0005_onboarding
Revises: 0004_verification
Create Date: 2026-10-15
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0005_onboarding"
down_revision: Union[str, None] = "0004_verification"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add onboarding configuration fields to institutions
    op.add_column(
        "institutions",
        sa.Column(
            "verification_mode",
            sa.String(length=30),
            server_default="api_verification",
            nullable=False,
        ),
    )
    op.add_column(
        "institutions",
        sa.Column(
            "allowed_email_domains",
            sa.JSON(),
            server_default="[]",
            nullable=False,
        ),
    )
    op.add_column(
        "institutions",
        sa.Column(
            "roster_freshness_days",
            sa.Integer(),
            server_default="30",
            nullable=False,
        ),
    )
    op.add_column(
        "institutions",
        sa.Column(
            "roster_last_imported_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.add_column(
        "institutions",
        sa.Column(
            "roster_active_version",
            sa.String(length=64),
            nullable=True,
        ),
    )

    # 2. Create email_otp_challenges table
    op.create_table(
        "email_otp_challenges",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("institution_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("purpose", sa.String(length=50), server_default="student_onboarding", nullable=False),
        sa.Column("attempts_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("max_attempts", sa.Integer(), server_default="5", nullable=False),
        sa.Column("resend_available_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_used", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["institution_id"],
            ["institutions.id"],
            name="fk_email_otp_institution",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_email_otp_user",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_email_otp_institution_email",
        "email_otp_challenges",
        ["institution_id", "email", "purpose", "is_used"],
        unique=False,
    )
    op.create_index(
        "ix_email_otp_expires",
        "email_otp_challenges",
        ["expires_at"],
        unique=False,
    )
    op.create_index(
        "ix_email_otp_email",
        "email_otp_challenges",
        ["email"],
        unique=False,
    )

    # 3. Create roster_imports table
    op.create_table(
        "roster_imports",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("institution_id", sa.UUID(), nullable=False),
        sa.Column("version_tag", sa.String(length=64), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("total_rows", sa.Integer(), server_default="0", nullable=False),
        sa.Column("valid_rows", sa.Integer(), server_default="0", nullable=False),
        sa.Column("new_records_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("updated_records_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("rejected_rows_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("status", sa.String(length=30), server_default="committed", nullable=False),
        sa.Column("validation_errors", sa.JSON(), server_default="[]", nullable=False),
        sa.Column("is_authoritative_snapshot", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("uploaded_by_user_id", sa.UUID(), nullable=False),
        sa.Column("committed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["institution_id"],
            ["institutions.id"],
            name="fk_roster_imports_institution",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["uploaded_by_user_id"],
            ["users.id"],
            name="fk_roster_imports_uploader",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_roster_imports_institution_created",
        "roster_imports",
        ["institution_id", "created_at"],
        unique=False,
    )

    # 4. Create imported_student_records table
    op.create_table(
        "imported_student_records",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("institution_id", sa.UUID(), nullable=False),
        sa.Column("roster_import_id", sa.UUID(), nullable=False),
        sa.Column("student_number", sa.String(length=100), nullable=False),
        sa.Column("institutional_email", sa.String(length=320), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("enrollment_status", sa.String(length=30), server_default="Active", nullable=False),
        sa.Column("programme_code", sa.String(length=50), nullable=False),
        sa.Column("campus_code", sa.String(length=50), nullable=True),
        sa.Column("academic_year", sa.String(length=20), nullable=False),
        sa.Column("record_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("raw_data", sa.JSON(), server_default="{}", nullable=False),
        sa.Column("is_current", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["institution_id"],
            ["institutions.id"],
            name="fk_imported_records_institution",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["roster_import_id"],
            ["roster_imports.id"],
            name="fk_imported_records_import",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_imported_records_email",
        "imported_student_records",
        ["institution_id", "institutional_email", "is_current"],
        unique=False,
    )
    op.create_index(
        "ix_imported_records_student_no",
        "imported_student_records",
        ["institution_id", "student_number", "is_current"],
        unique=False,
    )
    op.create_index(
        "ix_imported_records_import",
        "imported_student_records",
        ["institution_id", "roster_import_id"],
        unique=False,
    )

    # 5. Create student_onboarding_requests table
    op.create_table(
        "student_onboarding_requests",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("reference", sa.String(length=50), nullable=False),
        sa.Column("institution_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("institutional_email", sa.String(length=320), nullable=False),
        sa.Column("student_number", sa.String(length=100), nullable=True),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("verification_mode", sa.String(length=30), nullable=False),
        sa.Column("status", sa.String(length=40), server_default="contact_verification_required", nullable=False),
        sa.Column("roster_match_status", sa.String(length=30), nullable=True),
        sa.Column("roster_import_id", sa.UUID(), nullable=True),
        sa.Column("api_check_status", sa.String(length=30), nullable=True),
        sa.Column("discrepancy_details", sa.JSON(), server_default="{}", nullable=False),
        sa.Column("reviewer_user_id", sa.UUID(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_decision", sa.String(length=30), nullable=True),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.Column("follow_up_instructions", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "status IN ('contact_verification_required', 'contact_verified', 'verification_pending', "
            "'verification_review_required', 'verified', 'rejected', 'verification_expired')",
            name="ck_onboarding_requests_status",
        ),
        sa.CheckConstraint(
            "verification_mode IN ('api_verification', 'file_and_review')",
            name="ck_onboarding_requests_mode",
        ),
        sa.ForeignKeyConstraint(
            ["institution_id"],
            ["institutions.id"],
            name="fk_onboarding_requests_institution",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_onboarding_requests_user",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["roster_import_id"],
            ["roster_imports.id"],
            name="fk_onboarding_requests_roster_import",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["reviewer_user_id"],
            ["users.id"],
            name="fk_onboarding_requests_reviewer",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("reference", name="uq_onboarding_requests_reference"),
    )
    op.create_index(
        "ix_onboarding_requests_institution_status",
        "student_onboarding_requests",
        ["institution_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_onboarding_requests_user_institution",
        "student_onboarding_requests",
        ["user_id", "institution_id"],
        unique=False,
    )
    op.create_index(
        "ix_onboarding_requests_email",
        "student_onboarding_requests",
        ["institution_id", "institutional_email"],
        unique=False,
    )


def downgrade() -> None:
    # Drop student_onboarding_requests
    op.drop_index("ix_onboarding_requests_email", table_name="student_onboarding_requests")
    op.drop_index("ix_onboarding_requests_user_institution", table_name="student_onboarding_requests")
    op.drop_index("ix_onboarding_requests_institution_status", table_name="student_onboarding_requests")
    op.drop_table("student_onboarding_requests")

    # Drop imported_student_records
    op.drop_index("ix_imported_records_import", table_name="imported_student_records")
    op.drop_index("ix_imported_records_student_no", table_name="imported_student_records")
    op.drop_index("ix_imported_records_email", table_name="imported_student_records")
    op.drop_table("imported_student_records")

    # Drop roster_imports
    op.drop_index("ix_roster_imports_institution_created", table_name="roster_imports")
    op.drop_table("roster_imports")

    # Drop email_otp_challenges
    op.drop_index("ix_email_otp_email", table_name="email_otp_challenges")
    op.drop_index("ix_email_otp_expires", table_name="email_otp_challenges")
    op.drop_index("ix_email_otp_institution_email", table_name="email_otp_challenges")
    op.drop_table("email_otp_challenges")

    # Drop institution columns
    op.drop_column("institutions", "roster_active_version")
    op.drop_column("institutions", "roster_last_imported_at")
    op.drop_column("institutions", "roster_freshness_days")
    op.drop_column("institutions", "allowed_email_domains")
    op.drop_column("institutions", "verification_mode")
