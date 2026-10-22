"""Add verification events audit log for public ID verification attempts.

Revision ID: 0004_verification
Revises: 0003_lifecycle
Create Date: 2026-10-15
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004_verification"
down_revision: Union[str, None] = "0003_lifecycle"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "verification_events",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("institution_id", sa.UUID(), nullable=True),
        sa.Column("credential_id", sa.UUID(), nullable=True),
        sa.Column("outcome", sa.String(length=20), nullable=False),
        sa.Column("verifier_user_id", sa.UUID(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "outcome IN ('valid', 'suspended', 'revoked', 'expired', 'invalid')",
            name="ck_verification_events_outcome",
        ),
        sa.ForeignKeyConstraint(
            ["credential_id"],
            ["digital_credentials.id"],
            name="fk_verification_events_credential",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["institution_id"],
            ["institutions.id"],
            name="fk_verification_events_institution",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["verifier_user_id"],
            ["users.id"],
            name="fk_verification_events_verifier",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_verification_events_created",
        "verification_events",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        "ix_verification_events_credential_created",
        "verification_events",
        ["credential_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_verification_events_institution_created",
        "verification_events",
        ["institution_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_verification_events_institution_created", table_name="verification_events")
    op.drop_index("ix_verification_events_credential_created", table_name="verification_events")
    op.drop_index("ix_verification_events_created", table_name="verification_events")
    op.drop_table("verification_events")
