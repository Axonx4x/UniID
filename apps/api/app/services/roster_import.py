"""Service for CSV student roster validation, preview, commit, and freshness tracking."""

import csv
from datetime import datetime, timezone
import io
import re
import uuid
from typing import Any

from sqlalchemy import and_, func, select, update
from sqlalchemy.orm import Session

from app.models.identity import User
from app.models.institution import Institution
from app.models.onboarding import ImportedStudentRecord, RosterImport
from app.models.operations import AuditEvent

REQUIRED_COLUMNS = [
    "student_number",
    "institutional_email",
    "enrollment_status",
    "programme_code",
    "campus_code",
    "academic_year",
]
EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class RosterValidationError(Exception):
    """Raised when CSV structure or header validation fails."""
    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


def parse_and_validate_csv(
    csv_content: str,
) -> tuple[list[str], list[dict[str, str]], list[dict[str, Any]]]:
    """
    Parse CSV text, validate headers, and separate valid rows from rejected rows.
    Returns: (headers, valid_rows, rejected_rows)
    """
    if not csv_content.strip():
        raise RosterValidationError("CSV file is empty.")

    reader = csv.reader(io.StringIO(csv_content))
    try:
        raw_headers = next(reader)
    except StopIteration:
        raise RosterValidationError("CSV file has no header row.")

    headers = [h.strip().lower() for h in raw_headers if h.strip()]
    missing = [col for col in REQUIRED_COLUMNS if col not in headers]
    if missing:
        raise RosterValidationError(
            f"CSV file is missing required columns: {', '.join(missing)}",
            details={"missing_columns": missing, "found_columns": headers},
        )

    dict_reader = csv.DictReader(io.StringIO(csv_content))
    valid_rows: list[dict[str, str]] = []
    rejected_rows: list[dict[str, Any]] = []

    for idx, row in enumerate(dict_reader, start=2):  # 1-indexed, line 2 is first data row
        row_clean = {k.strip().lower(): (v.strip() if v else "") for k, v in row.items() if k}
        
        student_no = row_clean.get("student_number", "")
        email = row_clean.get("institutional_email", "").lower()
        status = row_clean.get("enrollment_status", "")
        prog = row_clean.get("programme_code", "")
        year = row_clean.get("academic_year", "")

        errors = []
        if not student_no:
            errors.append("Missing student_number")
        if not email:
            errors.append("Missing institutional_email")
        elif not EMAIL_REGEX.match(email):
            errors.append(f"Invalid institutional_email format: '{email}'")
        if not status:
            errors.append("Missing enrollment_status")
        if not prog:
            errors.append("Missing programme_code")
        if not year:
            errors.append("Missing academic_year")

        if errors:
            rejected_rows.append({
                "row_index": idx,
                "reasons": errors,
                "data": row_clean,
            })
        else:
            row_clean["institutional_email"] = email
            valid_rows.append(row_clean)

    return headers, valid_rows, rejected_rows


def preview_roster_import(
    db: Session,
    *,
    institution_id: uuid.UUID,
    csv_content: str,
    is_authoritative_snapshot: bool = False,
) -> dict[str, Any]:
    """
    Preview the effects of importing the CSV file without committing changes.
    """
    headers, valid_rows, rejected_rows = parse_and_validate_csv(csv_content)

    # Query currently active roster records for this institution
    active_stmt = (
        select(ImportedStudentRecord.student_number, ImportedStudentRecord.institutional_email)
        .where(
            ImportedStudentRecord.institution_id == institution_id,
            ImportedStudentRecord.is_current == True,  # noqa: E712
        )
    )
    current_records = db.execute(active_stmt).all()
    current_emails = {row[1].lower() for row in current_records}
    current_student_nos = {row[0] for row in current_records}

    new_count = 0
    updated_count = 0
    seen_in_import_emails = set()

    for r in valid_rows:
        em = r["institutional_email"]
        sn = r["student_number"]
        seen_in_import_emails.add(em)
        if em in current_emails or sn in current_student_nos:
            updated_count += 1
        else:
            new_count += 1

    records_to_deactivate = 0
    if is_authoritative_snapshot:
        # Absence from authoritative snapshot means deactivation
        records_to_deactivate = len(current_emails - seen_in_import_emails)

    return {
        "headers": headers,
        "total_rows": len(valid_rows) + len(rejected_rows),
        "valid_rows_count": len(valid_rows),
        "rejected_rows_count": len(rejected_rows),
        "new_records_count": new_count,
        "updated_records_count": updated_count,
        "records_to_deactivate_count": records_to_deactivate,
        "is_authoritative_snapshot": is_authoritative_snapshot,
        "rejected_samples": rejected_rows[:5],
        "preview_records": valid_rows[:5],
    }


def commit_roster_import(
    db: Session,
    *,
    institution_id: uuid.UUID,
    uploaded_by_user_id: uuid.UUID,
    filename: str,
    csv_content: str,
    is_authoritative_snapshot: bool = False,
) -> RosterImport:
    """
    Transactionally commit an imported CSV roster.
    Follows critical rule: an import never deactivates absent students unless explicitly
    designated as an authoritative snapshot.
    """
    now = datetime.now(timezone.utc)
    headers, valid_rows, rejected_rows = parse_and_validate_csv(csv_content)

    if not valid_rows:
        raise RosterValidationError("Cannot commit roster import: no valid records found in file.")

    version_tag = f"ROSTER-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"

    # Calculate new vs updated
    active_stmt = (
        select(ImportedStudentRecord.id, ImportedStudentRecord.student_number, ImportedStudentRecord.institutional_email)
        .where(
            ImportedStudentRecord.institution_id == institution_id,
            ImportedStudentRecord.is_current == True,  # noqa: E712
        )
    )
    current_records = db.execute(active_stmt).all()
    current_map = {row[2].lower(): row[0] for row in current_records}
    current_by_student_no = {row[1]: row[0] for row in current_records}

    new_count = 0
    updated_count = 0
    records_to_insert = []
    incoming_emails = set()

    roster_import = RosterImport(
        id=uuid.uuid4(),
        institution_id=institution_id,
        version_tag=version_tag,
        filename=filename,
        total_rows=len(valid_rows) + len(rejected_rows),
        valid_rows=len(valid_rows),
        new_records_count=0,
        updated_records_count=0,
        rejected_rows_count=len(rejected_rows),
        status="committed",
        validation_errors=rejected_rows[:20],  # store up to 20 errors
        is_authoritative_snapshot=is_authoritative_snapshot,
        uploaded_by_user_id=uploaded_by_user_id,
        committed_at=now,
    )
    db.add(roster_import)
    db.flush()

    for r in valid_rows:
        em = r["institutional_email"]
        sn = r["student_number"]
        incoming_emails.add(em)

        is_update = (em in current_map) or (sn in current_by_student_no)
        if is_update:
            updated_count += 1
            # Mark previous active version of this record as superseded
            db.execute(
                update(ImportedStudentRecord)
                .where(
                    ImportedStudentRecord.institution_id == institution_id,
                    (ImportedStudentRecord.institutional_email == em) | (ImportedStudentRecord.student_number == sn),
                    ImportedStudentRecord.is_current == True,  # noqa: E712
                )
                .values(is_current=False)
            )
        else:
            new_count += 1

        rec = ImportedStudentRecord(
            id=uuid.uuid4(),
            institution_id=institution_id,
            roster_import_id=roster_import.id,
            student_number=sn,
            institutional_email=em,
            full_name=r.get("full_name"),
            enrollment_status=r.get("enrollment_status", "Active"),
            programme_code=r.get("programme_code", ""),
            campus_code=r.get("campus_code"),
            academic_year=r.get("academic_year", ""),
            raw_data=r,
            is_current=True,
        )
        records_to_insert.append(rec)

    # If authoritative snapshot, deactivate absent records
    if is_authoritative_snapshot:
        db.execute(
            update(ImportedStudentRecord)
            .where(
                ImportedStudentRecord.institution_id == institution_id,
                ImportedStudentRecord.is_current == True,  # noqa: E712
                ImportedStudentRecord.institutional_email.not_in(list(incoming_emails)),
            )
            .values(is_current=False)
        )

    db.add_all(records_to_insert)

    roster_import.new_records_count = new_count
    roster_import.updated_records_count = updated_count

    # Update institution roster freshness tracker
    inst = db.get(Institution, institution_id)
    if inst:
        inst.roster_last_imported_at = now
        inst.roster_active_version = version_tag

    # Log audit event
    audit = AuditEvent(
        institution_id=institution_id,
        actor_user_id=uploaded_by_user_id,
        action="roster.import_committed",
        resource_type="roster_import",
        resource_id=roster_import.id,
        event_metadata={
            "version_tag": version_tag,
            "filename": filename,
            "valid_rows": len(valid_rows),
            "new_count": new_count,
            "updated_count": updated_count,
            "rejected_count": len(rejected_rows),
            "is_authoritative_snapshot": is_authoritative_snapshot,
        },
    )
    db.add(audit)
    db.commit()
    db.refresh(roster_import)
    return roster_import


def check_roster_freshness(
    db: Session,
    institution_id: uuid.UUID,
) -> dict[str, Any]:
    """
    Check roster freshness against the institution's configured policy.
    """
    inst = db.get(Institution, institution_id)
    if not inst:
        return {"error": "Institution not found"}

    now = datetime.now(timezone.utc)
    last_imported = inst.roster_last_imported_at
    policy_days = inst.roster_freshness_days or 30

    count_stmt = (
        select(func.count(ImportedStudentRecord.id))
        .where(
            ImportedStudentRecord.institution_id == institution_id,
            ImportedStudentRecord.is_current == True,  # noqa: E712
        )
    )
    total_active_records = db.scalar(count_stmt) or 0

    if not last_imported:
        return {
            "institution_id": str(institution_id),
            "is_stale": True,
            "days_since_import": None,
            "freshness_policy_days": policy_days,
            "last_imported_at": None,
            "active_version": None,
            "total_active_records": 0,
            "status_label": "no_roster_imported",
        }

    last_imported_utc = last_imported if last_imported.tzinfo else last_imported.replace(tzinfo=timezone.utc)
    days_since = (now - last_imported_utc).days
    is_stale = days_since > policy_days

    return {
        "institution_id": str(institution_id),
        "is_stale": is_stale,
        "days_since_import": days_since,
        "freshness_policy_days": policy_days,
        "last_imported_at": last_imported.isoformat(),
        "active_version": inst.roster_active_version,
        "total_active_records": total_active_records,
        "status_label": "stale" if is_stale else "fresh",
    }
