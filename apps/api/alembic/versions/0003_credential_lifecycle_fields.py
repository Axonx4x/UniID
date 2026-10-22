"""Add lifecycle issuance data and concurrent active-credential protection.

Revision ID: 0003_lifecycle
Revises: 0002_phase2
Create Date: 2026-10-15
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003_lifecycle"
down_revision: Union[str, None] = "0002_phase2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("digital_credentials", sa.Column("public_reference", sa.String(64), nullable=True))
    op.add_column("digital_credentials", sa.Column("issued_by_user_id", sa.UUID(), nullable=True))
    op.add_column("digital_credentials", sa.Column("policy_reference", sa.String(100), nullable=True))
    op.create_foreign_key(
        "fk_credentials_issued_by_user", "digital_credentials", "users", ["issued_by_user_id"], ["id"], ondelete="RESTRICT"
    )
    # Backfill Phase 2 draft records without deriving any public value from a student number.
    op.execute("UPDATE digital_credentials SET public_reference = 'cr_' || replace(gen_random_uuid()::text, '-', '') WHERE public_reference IS NULL")
    op.alter_column("digital_credentials", "public_reference", nullable=False)
    op.create_index("ix_credentials_public_reference", "digital_credentials", ["public_reference"], unique=True)
    op.create_index(
        "uq_active_credential_per_student",
        "digital_credentials",
        ["institution_id", "student_id"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
        sqlite_where=sa.text("status = 'active'"),
    )


def downgrade() -> None:
    op.drop_index("uq_active_credential_per_student", table_name="digital_credentials")
    op.drop_index("ix_credentials_public_reference", table_name="digital_credentials")
    op.drop_constraint("fk_credentials_issued_by_user", "digital_credentials", type_="foreignkey")
    op.drop_column("digital_credentials", "policy_reference")
    op.drop_column("digital_credentials", "issued_by_user_id")
    op.drop_column("digital_credentials", "public_reference")
