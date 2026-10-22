"""Explicit entrypoint for the persistent, synthetic LUANAR presenter dataset."""

import os
import sys

repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

from app.core.config import settings  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from scripts.seed_demo_tenant import seed_demo_data  # noqa: E402


if __name__ == "__main__":
    if not settings.UNIID_DEMO_MODE:
        raise SystemExit("Set UNIID_DEMO_MODE=true before seeding the LUANAR demo environment.")
    with SessionLocal() as db:
        seed_demo_data(db)
    print("LUANAR synthetic demo roster seeded (200 records).")
