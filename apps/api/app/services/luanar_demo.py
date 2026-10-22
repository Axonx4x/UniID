"""Deterministic, clearly synthetic LUANAR demonstration roster.

This module is deliberately the single source for both the seeded roster and
the downloadable CSV.  It never represents, imports, or contacts a real
institutional system.
"""

from __future__ import annotations

import csv
import io
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.onboarding import ImportedStudentRecord


DEMO_ROSTER_VERSION = "LUANAR-DEMO-2026-01"
DEMO_EMAIL_DOMAIN = "students.luanar.test"  # .test is an IANA-reserved domain


@dataclass(frozen=True)
class DemoRosterRow:
    student_number: str
    full_name: str
    institutional_email: str
    enrollment_status: str
    programme_code: str
    programme_name: str
    campus_code: str
    campus_name: str
    academic_year: str
    record_updated_at: str


_GIVEN_NAMES = (
    "Tione", "Chisomo", "Yamikani", "Thandiwe", "Mphatso", "Aisha", "Blessings", "Fatsani",
    "Kondwani", "Tadala", "Natasha", "Wongani", "Lameck", "Memory", "Pemphero", "Ruth",
)
_FAMILY_NAMES = (
    "Kamanga", "Phiri", "Banda", "Chirwa", "Mbewe", "Nkhoma", "Moyo", "Mwale",
    "Nyirenda", "Kachale", "Mvula", "Zimba", "Mwanza", "Kumwenda", "Gondwe", "Msiska",
)
_PROGRAMMES = (
    ("SIM-AGR", "Simulated Agricultural Systems"),
    ("SIM-FOOD", "Simulated Food Innovation"),
    ("SIM-NRES", "Simulated Natural Resource Studies"),
    ("SIM-ICT", "Simulated Digital Agriculture"),
)


def roster_rows() -> list[DemoRosterRow]:
    """Return 200 reproducible synthetic records, including review scenarios."""
    rows: list[DemoRosterRow] = []
    for number in range(1, 201):
        given = _GIVEN_NAMES[(number - 1) % len(_GIVEN_NAMES)]
        family = _FAMILY_NAMES[((number - 1) // len(_GIVEN_NAMES)) % len(_FAMILY_NAMES)]
        programme_code, programme_name = _PROGRAMMES[(number - 1) % len(_PROGRAMMES)]
        enrollment_status = "Active"
        # Deliberate, valid non-eligible cases for the reviewer/adapter flow.
        if number in (57, 143):
            enrollment_status = "Suspended"
        elif number in (89, 177):
            enrollment_status = "On Leave"
        rows.append(DemoRosterRow(
            student_number=f"LUA-DEMO-2026-{number:04d}",
            full_name=f"{given} {family}",
            institutional_email=f"student{number:04d}@{DEMO_EMAIL_DOMAIN}",
            enrollment_status=enrollment_status,
            programme_code=programme_code,
            programme_name=programme_name,
            campus_code="DEMO-BUNDA" if number % 2 else "DEMO-NRC",
            campus_name="Demonstration Campus A" if number % 2 else "Demonstration Campus B",
            academic_year="2026",
            record_updated_at="2026-01-15T09:00:00Z",
        ))
    return rows


def roster_csv(include_validation_cases: bool = False) -> str:
    """Build CSV from fixtures, optionally appending intentionally invalid rows.

    The default is import-ready.  The optional scenario is useful for showing
    preview validation: it contains a duplicate, a missing required field and
    an invalid email without contaminating the committed synthetic roster.
    """
    output = io.StringIO(newline="")
    headers = [field for field in DemoRosterRow.__dataclass_fields__]
    writer = csv.DictWriter(output, fieldnames=headers)
    writer.writeheader()
    for row in roster_rows():
        writer.writerow(row.__dict__)
    if include_validation_cases:
        first = roster_rows()[0]
        writer.writerow(first.__dict__)  # duplicate registration number
        writer.writerow({**first.__dict__, "student_number": "LUA-DEMO-INVALID-EMPTY", "full_name": ""})
        writer.writerow({**first.__dict__, "student_number": "LUA-DEMO-INVALID-EMAIL", "institutional_email": "not-an-email"})
    return output.getvalue()


def as_record_data(row: DemoRosterRow) -> dict[str, object]:
    """Values suitable for an ImportedStudentRecord plus traceable source data."""
    updated_at = datetime.fromisoformat(row.record_updated_at.replace("Z", "+00:00")).astimezone(timezone.utc)
    return {
        "student_number": row.student_number,
        "institutional_email": row.institutional_email,
        "full_name": row.full_name,
        "enrollment_status": row.enrollment_status,
        "programme_code": row.programme_code,
        "campus_code": row.campus_code,
        "academic_year": row.academic_year,
        "record_updated_at": updated_at,
        "raw_data": {**row.__dict__, "source": "synthetic_luanar_demo_fixture"},
        "is_current": True,
    }


def lookup_current_record(
    db: Session, *, institution_id: object, student_number: str | None, email: str, full_name: str,
) -> tuple[ImportedStudentRecord | None, str]:
    """Resolve a LUANAR demo onboarding claim against committed roster data.

    Results are intentionally structured for the adapter path: an exact active
    record can auto-verify, while missing, ambiguous, or mismatched claims are
    retained for the existing staff-review workflow.
    """
    if not student_number:
        return None, "student_number_missing"
    matches = db.scalars(
        select(ImportedStudentRecord).where(
            ImportedStudentRecord.institution_id == institution_id,
            ImportedStudentRecord.student_number == student_number.strip(),
            ImportedStudentRecord.is_current == True,  # noqa: E712
        )
    ).all()
    if not matches:
        return None, "not_found"
    if len(matches) != 1:
        return None, "ambiguous"
    record = matches[0]
    if record.institutional_email.strip().lower() != email.strip().lower():
        return None, "email_mismatch"
    normalize = lambda value: " ".join(value.strip().casefold().split())
    if record.full_name and normalize(record.full_name) != normalize(full_name):
        return None, "name_mismatch"
    return record, "matched"
