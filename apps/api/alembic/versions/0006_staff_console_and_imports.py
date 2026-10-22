"""staff_console_and_imports

Revision ID: 0006_staff_imports
Revises: 0005_onboarding
Create Date: 2026-10-16 14:00:00+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = "0006_staff_imports"
down_revision: Union[str, None] = "0005_onboarding"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add status to students table for archiving/restoring
    op.add_column(
        "students",
        sa.Column("status", sa.String(length=20), server_default="active", nullable=False),
    )
    op.create_check_constraint(
        "ck_students_status",
        "students",
        "status IN ('active', 'archived')",
    )

    # 2. Add extended staging and wizard columns to roster_imports
    op.add_column(
        "roster_imports",
        sa.Column("file_checksum", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "roster_imports",
        sa.Column("mapping_config", sa.JSON(), server_default="{}", nullable=False),
    )
    op.add_column(
        "roster_imports",
        sa.Column("transformation_config", sa.JSON(), server_default="{}", nullable=False),
    )
    op.add_column(
        "roster_imports",
        sa.Column("staged_data", sa.JSON(), server_default="[]", nullable=False),
    )
    op.add_column(
        "roster_imports",
        sa.Column("raw_csv_content", sa.Text(), nullable=True),
    )
    op.add_column(
        "roster_imports",
        sa.Column("reconciliation_summary", sa.JSON(), server_default="{}", nullable=False),
    )

    # 3. Create import_mapping_templates table
    op.create_table(
        "import_mapping_templates",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("institution_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("source_headers", sa.JSON(), server_default="[]", nullable=False),
        sa.Column("mappings", sa.JSON(), server_default="{}", nullable=False),
        sa.Column("transformations", sa.JSON(), server_default="{}", nullable=False),
        sa.Column("status_dictionary", sa.JSON(), server_default="{}", nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_by_user_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["institution_id"],
            ["institutions.id"],
            name="fk_import_templates_institution",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["users.id"],
            name="fk_import_templates_creator",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("institution_id", "name", "version", name="uq_import_templates_inst_name_version"),
    )
    op.create_index(
        "ix_import_templates_institution_active",
        "import_mapping_templates",
        ["institution_id", "is_active"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_import_templates_institution_active", table_name="import_mapping_templates")
    op.drop_table("import_mapping_templates")
    op.drop_column("roster_imports", "reconciliation_summary")
    op.drop_column("roster_imports", "raw_csv_content")
    op.drop_column("roster_imports", "staged_data")
    op.drop_column("roster_imports", "transformation_config")
    op.drop_column("roster_imports", "mapping_config")
    op.drop_column("roster_imports", "file_checksum")
    op.drop_constraint("ck_students_status", "students", type_="check")
    op.drop_column("students", "status")
