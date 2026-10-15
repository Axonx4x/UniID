"""Seed script to ensure default university demonstration tenant exists."""

import os
import sys

# Ensure apps/api is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
repo_root = os.path.dirname(current_dir)
api_dir = os.path.join(repo_root, "apps", "api")
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)

from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.institution import Institution
from app.core.logging import logger


def seed_tenants():
    db = SessionLocal()
    try:
        # Check if LUANAR tenant already seeded
        stmt = select(Institution).where(Institution.code == "luanar")
        existing = db.execute(stmt).scalar_one_or_none()

        if existing:
            logger.info(f"Tenant 'luanar' already exists: {existing.name} ({existing.campus})")
            return

        luanar = Institution(
            code="luanar",
            name="Lilongwe University of Agriculture and Natural Resources",
            short_name="LUANAR",
            campus="City Campus",
            contact_email="registrar.city@luanar.ac.mw",
            is_active=True,
            brand_primary_color="#0B192C",
            brand_accent_color="#1E88E5",
        )
        db.add(luanar)
        db.commit()
        db.refresh(luanar)
        logger.info(f"Successfully seeded demonstration tenant: {luanar.short_name} (ID: {luanar.id})")
    except Exception as exc:
        db.rollback()
        logger.error(f"Failed to seed demo tenant: {str(exc)}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    logger.info("Executing tenant seed utility...")
    seed_tenants()
