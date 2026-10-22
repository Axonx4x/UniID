"""Phase 2 domain, authentication, and tenant authorization foundation.

Revision ID: 0002_phase2
Revises: 0001_initial
Create Date: 2026-10-15
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0002_phase2"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

UUID = postgresql.UUID(as_uuid=True)
utc_now = sa.text("now()")


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=utc_now, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=utc_now, nullable=False),
    ]


def upgrade() -> None:
    # Preserve all Phase 1 columns/data; legacy fields remain as compatibility storage.
    op.add_column("institutions", sa.Column("slug", sa.String(50), nullable=True))
    op.add_column("institutions", sa.Column("institution_code", sa.String(50), nullable=True))
    op.add_column("institutions", sa.Column("status", sa.String(20), nullable=True))
    op.execute("UPDATE institutions SET slug = code, institution_code = upper(code), status = CASE WHEN is_active THEN 'active' ELSE 'inactive' END")
    op.alter_column("institutions", "slug", nullable=False)
    op.alter_column("institutions", "institution_code", nullable=False)
    op.alter_column("institutions", "status", nullable=False)
    op.alter_column("institutions", "code", nullable=True)
    op.alter_column("institutions", "short_name", nullable=True)
    op.alter_column("institutions", "contact_email", nullable=True)
    op.create_check_constraint("ck_institutions_status", "institutions", "status IN ('active', 'inactive')")
    op.create_index("ix_institutions_slug", "institutions", ["slug"], unique=True)
    op.create_index("ix_institutions_institution_code", "institutions", ["institution_code"], unique=True)
    op.create_index("ix_institutions_status", "institutions", ["status"])

    op.create_table(
        "users",
        sa.Column("id", UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("password_hash", sa.String(512), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        *timestamps(),
        sa.CheckConstraint("status IN ('active', 'inactive')", name="ck_users_status"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_status", "users", ["status"])

    op.create_table(
        "campuses",
        sa.Column("id", UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", UUID, sa.ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        *timestamps(),
        sa.UniqueConstraint("institution_id", "code", name="uq_campuses_institution_code"),
        sa.UniqueConstraint("id", "institution_id", name="uq_campuses_id_institution"),
        sa.CheckConstraint("status IN ('active', 'inactive')", name="ck_campuses_status"),
    )
    op.create_index("ix_campuses_institution_status", "campuses", ["institution_id", "status"])

    op.create_table(
        "programmes",
        sa.Column("id", UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", UUID, sa.ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        *timestamps(),
        sa.UniqueConstraint("institution_id", "code", name="uq_programmes_institution_code"),
        sa.UniqueConstraint("id", "institution_id", name="uq_programmes_id_institution"),
        sa.CheckConstraint("status IN ('active', 'inactive')", name="ck_programmes_status"),
    )
    op.create_index("ix_programmes_institution_status", "programmes", ["institution_id", "status"])

    op.create_table(
        "memberships",
        sa.Column("id", UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("institution_id", UUID, sa.ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("role", sa.String(30), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        *timestamps(),
        sa.UniqueConstraint("user_id", "institution_id", name="uq_memberships_user_institution"),
        sa.CheckConstraint("role IN ('student', 'verifier', 'registry_admin', 'platform_admin')", name="ck_memberships_role"),
        sa.CheckConstraint("status IN ('active', 'inactive')", name="ck_memberships_status"),
    )
    op.create_index("ix_memberships_user_id", "memberships", ["user_id"])
    op.create_index("ix_memberships_institution_role_status", "memberships", ["institution_id", "role", "status"])

    op.create_table(
        "students",
        sa.Column("id", UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", UUID, sa.ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("campus_id", UUID, nullable=False),
        sa.Column("student_number", sa.String(100), nullable=False),
        sa.Column("user_id", UUID, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        *timestamps(),
        sa.UniqueConstraint("institution_id", "student_number", name="uq_students_institution_number"),
        sa.UniqueConstraint("institution_id", "user_id", name="uq_students_institution_user"),
        sa.UniqueConstraint("id", "institution_id", name="uq_students_id_institution"),
        sa.ForeignKeyConstraint(["campus_id", "institution_id"], ["campuses.id", "campuses.institution_id"], name="fk_students_campus_institution", ondelete="RESTRICT"),
    )
    op.create_index("ix_students_user_id", "students", ["user_id"])
    op.create_index("ix_students_institution_number", "students", ["institution_id", "student_number"])

    op.create_table(
        "programme_enrollments",
        sa.Column("id", UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", UUID, sa.ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("student_id", UUID, nullable=False),
        sa.Column("programme_id", UUID, nullable=False),
        sa.Column("academic_year", sa.String(20), nullable=False),
        sa.Column("study_year", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        *timestamps(),
        sa.ForeignKeyConstraint(["student_id", "institution_id"], ["students.id", "students.institution_id"], name="fk_enrollments_student_institution", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["programme_id", "institution_id"], ["programmes.id", "programmes.institution_id"], name="fk_enrollments_programme_institution", ondelete="RESTRICT"),
        sa.CheckConstraint("status IN ('pending', 'active', 'completed', 'suspended', 'withdrawn')", name="ck_enrollments_status"),
        sa.CheckConstraint("study_year IS NULL OR study_year > 0", name="ck_enrollments_study_year"),
        sa.CheckConstraint("end_date IS NULL OR start_date IS NULL OR end_date >= start_date", name="ck_enrollments_dates"),
    )
    op.create_index("ix_enrollments_institution_student_status", "programme_enrollments", ["institution_id", "student_id", "status"])

    op.create_table(
        "digital_credentials",
        sa.Column("id", UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", UUID, sa.ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("student_id", UUID, nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revocation_reason", sa.Text(), nullable=True),
        *timestamps(),
        sa.UniqueConstraint("id", "institution_id", name="uq_credentials_id_institution"),
        sa.ForeignKeyConstraint(["student_id", "institution_id"], ["students.id", "students.institution_id"], name="fk_credentials_student_institution", ondelete="RESTRICT"),
        sa.CheckConstraint("status IN ('pending', 'active', 'expired', 'revoked', 'suspended')", name="ck_credentials_status"),
        sa.CheckConstraint("expires_at IS NULL OR issued_at IS NULL OR expires_at >= issued_at", name="ck_credentials_dates"),
        sa.CheckConstraint("status = 'revoked' OR revoked_at IS NULL", name="ck_credentials_revoked_at"),
    )
    op.create_index("ix_credentials_institution_student_status", "digital_credentials", ["institution_id", "student_id", "status"])

    op.create_table(
        "credential_events",
        sa.Column("id", UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", UUID, sa.ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("credential_id", UUID, nullable=False),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("actor_user_id", UUID, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("metadata", sa.JSON(), server_default=sa.text("'{}'::json"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=utc_now, nullable=False),
        sa.ForeignKeyConstraint(["credential_id", "institution_id"], ["digital_credentials.id", "digital_credentials.institution_id"], name="fk_credential_events_credential_institution", ondelete="RESTRICT"),
    )
    op.create_index("ix_credential_events_institution_credential_created", "credential_events", ["institution_id", "credential_id", "created_at"])

    op.create_table(
        "fee_policies",
        sa.Column("id", UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", UUID, sa.ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("effective_until", sa.Date(), nullable=True),
        *timestamps(),
        sa.CheckConstraint("amount >= 0", name="ck_fee_policies_amount"),
        sa.CheckConstraint("status IN ('active', 'inactive')", name="ck_fee_policies_status"),
        sa.CheckConstraint("effective_until IS NULL OR effective_until >= effective_from", name="ck_fee_policies_dates"),
    )
    op.create_index("ix_fee_policies_institution_status", "fee_policies", ["institution_id", "status"])

    op.create_table(
        "payments",
        sa.Column("id", UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", UUID, sa.ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("student_id", UUID, nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("provider_reference", sa.String(255), nullable=True),
        sa.Column("idempotency_key", sa.String(255), nullable=True),
        *timestamps(),
        sa.ForeignKeyConstraint(["student_id", "institution_id"], ["students.id", "students.institution_id"], name="fk_payments_student_institution", ondelete="RESTRICT"),
        sa.CheckConstraint("amount >= 0", name="ck_payments_amount"),
        sa.CheckConstraint("status IN ('pending', 'successful', 'failed', 'cancelled', 'refunded')", name="ck_payments_status"),
    )
    op.create_index("ix_payments_institution_student_status", "payments", ["institution_id", "student_id", "status"])
    op.create_index("ix_payments_idempotency_key", "payments", ["idempotency_key"], unique=True)

    op.create_table(
        "renewal_requests",
        sa.Column("id", UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", UUID, sa.ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("student_id", UUID, nullable=False),
        sa.Column("credential_id", UUID, nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("requested_at", sa.DateTime(timezone=True), server_default=utc_now, nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_by_user_id", UUID, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        *timestamps(),
        sa.ForeignKeyConstraint(["student_id", "institution_id"], ["students.id", "students.institution_id"], name="fk_renewals_student_institution", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["credential_id", "institution_id"], ["digital_credentials.id", "digital_credentials.institution_id"], name="fk_renewals_credential_institution", ondelete="RESTRICT"),
        sa.CheckConstraint("status IN ('pending', 'approved', 'rejected', 'completed')", name="ck_renewals_status"),
    )
    op.create_index("ix_renewals_institution_student_status", "renewal_requests", ["institution_id", "student_id", "status"])

    op.create_table(
        "integration_configs",
        sa.Column("id", UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", UUID, sa.ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("integration_type", sa.String(100), nullable=False),
        sa.Column("configuration", sa.JSON(), server_default=sa.text("'{}'::json"), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        *timestamps(),
        sa.UniqueConstraint("id", "institution_id", name="uq_integration_configs_id_institution"),
        sa.CheckConstraint("status IN ('not_configured', 'configured', 'syncing', 'successful', 'failed')", name="ck_integration_configs_status"),
    )
    op.create_index("ix_integration_configs_institution_type", "integration_configs", ["institution_id", "integration_type"])

    op.create_table(
        "sync_runs",
        sa.Column("id", UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", UUID, sa.ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("integration_config_id", UUID, nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("records_processed", sa.Integer(), server_default="0", nullable=False),
        sa.Column("records_failed", sa.Integer(), server_default="0", nullable=False),
        sa.Column("error_summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=utc_now, nullable=False),
        sa.ForeignKeyConstraint(["integration_config_id", "institution_id"], ["integration_configs.id", "integration_configs.institution_id"], name="fk_sync_runs_config_institution", ondelete="RESTRICT"),
        sa.CheckConstraint("records_processed >= 0 AND records_failed >= 0", name="ck_sync_runs_counts"),
    )
    op.create_index("ix_sync_runs_institution_config_started", "sync_runs", ["institution_id", "integration_config_id", "started_at"])

    op.create_table(
        "audit_events",
        sa.Column("id", UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("institution_id", UUID, sa.ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("actor_user_id", UUID, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("resource_type", sa.String(100), nullable=False),
        sa.Column("resource_id", UUID, nullable=True),
        sa.Column("metadata", sa.JSON(), server_default=sa.text("'{}'::json"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=utc_now, nullable=False),
    )
    op.create_index("ix_audit_events_institution_created", "audit_events", ["institution_id", "created_at"])
    op.create_index("ix_audit_events_resource", "audit_events", ["resource_type", "resource_id"])

    op.create_table(
        "auth_sessions",
        sa.Column("id", UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=utc_now, nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_auth_sessions_token_hash", "auth_sessions", ["token_hash"], unique=True)
    op.create_index("ix_auth_sessions_user_active", "auth_sessions", ["user_id", "revoked_at", "expires_at"])


def downgrade() -> None:
    for table in (
        "auth_sessions", "audit_events", "sync_runs", "integration_configs", "renewal_requests",
        "payments", "fee_policies", "credential_events", "digital_credentials",
        "programme_enrollments", "students", "memberships", "programmes", "campuses", "users",
    ):
        op.drop_table(table)

    op.drop_index("ix_institutions_status", table_name="institutions")
    op.drop_index("ix_institutions_institution_code", table_name="institutions")
    op.drop_index("ix_institutions_slug", table_name="institutions")
    op.drop_constraint("ck_institutions_status", "institutions", type_="check")
    op.execute("UPDATE institutions SET code = COALESCE(code, slug), short_name = COALESCE(short_name, institution_code), contact_email = COALESCE(contact_email, 'demo@example.invalid')")
    op.alter_column("institutions", "code", nullable=False)
    op.alter_column("institutions", "short_name", nullable=False)
    op.alter_column("institutions", "contact_email", nullable=False)
    op.drop_column("institutions", "status")
    op.drop_column("institutions", "institution_code")
    op.drop_column("institutions", "slug")
