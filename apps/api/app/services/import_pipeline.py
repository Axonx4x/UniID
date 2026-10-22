"""Institutional student data import pipeline, deterministic transformation engine,
canonical field mapping, reconciliation, and transactional commit service.
"""

import csv
import hashlib
import io
import re
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, and_, or_
from sqlalchemy.orm import Session

from app.core.errors import AstraMindException, ValidationException
from app.models.identity import Campus, Programme, ProgrammeEnrollment, Student, User
from app.models.institution import Institution
from app.models.onboarding import ImportedStudentRecord, ImportMappingTemplate, RosterImport
from app.models.operations import AuditEvent


# ── Canonical Schema Definition ────────────────────────────────────────────────

CANONICAL_FIELDS: dict[str, dict[str, Any]] = {
    "student_number": {
        "label": "Student Number / Registration No.",
        "required": True,
        "type": "string",
        "description": "Unique institutional student identifier (preserves leading zeros)",
    },
    "full_name": {
        "label": "Full Name",
        "required": True,
        "type": "string",
        "description": "Student's full legal name",
    },
    "institutional_email": {
        "label": "Institutional Email",
        "required": True,
        "type": "email",
        "description": "Official institutional email address",
    },
    "enrollment_status": {
        "label": "Enrollment Status",
        "required": True,
        "type": "enum",
        "description": "Current status (active, on_leave, suspended, completed, withdrawn)",
    },
    "programme_name": {
        "label": "Programme Name",
        "required": False,
        "type": "string",
        "description": "Full name of degree or academic programme",
    },
    "programme_code": {
        "label": "Programme Code",
        "required": False,
        "type": "string",
        "description": "Official course or programme code (e.g., BIT, BENG)",
    },
    "campus_name": {
        "label": "Campus Name",
        "required": False,
        "type": "string",
        "description": "Campus or facility name",
    },
    "campus_code": {
        "label": "Campus Code",
        "required": False,
        "type": "string",
        "description": "Official campus code (e.g., CENTRAL, HARBOUR)",
    },
    "academic_year": {
        "label": "Academic Year",
        "required": False,
        "type": "string",
        "description": "Academic cohort or academic year (e.g., 2026)",
    },
    "record_updated_at": {
        "label": "Record Last Updated",
        "required": False,
        "type": "datetime",
        "description": "Timestamp from source SIS when student record was updated",
    },
}

REQUIRED_CANONICAL_FIELDS = [k for k, v in CANONICAL_FIELDS.items() if v["required"]]

# Known Header Aliases for Automatic Suggestions
HEADER_ALIASES: dict[str, list[str]] = {
    "student_number": [
        "student number", "student no", "student no.", "registration no", "registration number",
        "reg no", "reg no.", "reg_no", "student_id", "studentid", "student id", "matric no", "matriculation number"
    ],
    "full_name": [
        "full name", "fullname", "student name", "names", "student_name", "candidate name", "name"
    ],
    "institutional_email": [
        "institutional email", "email address", "student email", "email", "uni email", "university email", "university mail", "mail", "e-mail"
    ],
    "enrollment_status": [
        "enrollment status", "current status", "status", "enrollment", "registration status", "academic status", "state"
    ],
    "programme_name": [
        "programme name", "program name", "programme", "program", "degree", "field of study"
    ],
    "programme_code": [
        "programme code", "program code", "prog code", "course code", "degree code", "course"
    ],
    "campus_name": [
        "campus name", "campus", "location", "facility", "college"
    ],
    "campus_code": [
        "campus code", "camp code", "branch code"
    ],
    "academic_year": [
        "academic year", "acad year", "year of study", "study year", "session", "academic session", "cohort"
    ],
    "record_updated_at": [
        "record updated at", "last updated", "updated at", "modified at", "last modified", "date updated"
    ],
}

# Standard enrollment status mappings
DEFAULT_STATUS_MAP: dict[str, str] = {
    "active": "active",
    "continuing": "active",
    "registered": "active",
    "enrolled": "active",
    "current": "active",
    "on leave": "on_leave",
    "on_leave": "on_leave",
    "leave of absence": "on_leave",
    "suspended": "suspended",
    "disciplinary": "suspended",
    "completed": "completed",
    "graduated": "completed",
    "alumni": "completed",
    "withdrawn": "withdrawn",
    "dropout": "withdrawn",
    "terminated": "withdrawn",
    "pending": "pending",
}

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


# ── Transformation Helpers ─────────────────────────────────────────────────────

def transform_trim(value: str) -> str:
    return value.strip()


def transform_collapse_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def transform_normalize_email(value: str) -> str:
    return value.strip().lower()


def transform_preserve_string(value: Any) -> str:
    return str(value).strip() if value is not None else ""


def transform_status(value: str, status_dictionary: dict[str, str] | None = None) -> tuple[str | None, str | None]:
    """Resolves an enrollment status string to canonical status.
    Returns (canonical_status, error_message).
    Unknown status is NEVER silently mapped to active or inactive.
    """
    clean_val = value.strip().lower()
    combined_map = {**DEFAULT_STATUS_MAP, **(status_dictionary or {})}
    # Case-insensitive lookup
    for k, v in combined_map.items():
        if k.strip().lower() == clean_val:
            return v, None
    return None, f"Unknown status value: '{value}'. Must be explicitly mapped in status dictionary."


def suggest_mappings(headers: list[str]) -> dict[str, str]:
    """Suggests canonical field mappings for source headers based on normalized aliases."""
    suggestions: dict[str, str] = {}
    used_canonicals: set[str] = set()

    for header in headers:
        normalized = re.sub(r"[\W_]+", " ", header.lower()).strip()
        matched_canonical = None

        for canonical, aliases in HEADER_ALIASES.items():
            if canonical in used_canonicals:
                continue
            if normalized == canonical.replace("_", " "):
                matched_canonical = canonical
                break
            for alias in aliases:
                if normalized == alias or normalized.startswith(alias) or normalized.endswith(alias) or alias in normalized.split():
                    matched_canonical = canonical
                    break
            if matched_canonical:
                break

        if matched_canonical:
            suggestions[header] = matched_canonical
            used_canonicals.add(matched_canonical)

    return suggestions


# ── File Parsing & Initial Job Creation ────────────────────────────────────────

def create_import_job(
    db: Session,
    institution_id: uuid.UUID,
    uploader_user_id: uuid.UUID,
    filename: str,
    raw_content: bytes,
) -> dict[str, Any]:
    """Parses uploaded CSV file, computes checksum, extracts headers and sample rows,
    and initializes a RosterImport job in 'uploaded' state.
    """
    if len(raw_content) > 10 * 1024 * 1024:
        raise ValidationException("File exceeds maximum allowed size of 10 MB.")

    file_checksum = hashlib.sha256(raw_content).hexdigest()

    # Detect encoding
    text = None
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            text = raw_content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue

    if text is None:
        raise ValidationException("Could not decode file content. Please upload UTF-8 or Latin-1 encoded CSV.")

    # Parse CSV structure
    try:
        sample = text[:4096]
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
    except Exception:
        dialect = csv.excel

    reader = csv.reader(io.StringIO(text), dialect=dialect)
    try:
        raw_headers = next(reader)
    except StopIteration:
        raise ValidationException("CSV file is empty or missing headers.")

    headers = [h.strip() for h in raw_headers if h.strip()]
    if not headers:
        raise ValidationException("CSV header row contains no non-empty columns.")

    rows = []
    sample_rows = []
    for i, row in enumerate(reader):
        if not any(cell.strip() for cell in row):
            continue
        row_dict = {headers[c]: row[c].strip() if c < len(row) else "" for c in range(len(headers))}
        rows.append(row_dict)
        if len(sample_rows) < 5:
            sample_rows.append(row_dict)

    if not rows:
        raise ValidationException("CSV file contains no data rows.")

    if len(rows) > 10000:
        raise ValidationException("File contains more than 10,000 rows. Please split into smaller batches.")

    # Generate suggestions and find compatible templates
    suggested = suggest_mappings(headers)

    templates_stmt = select(ImportMappingTemplate).where(
        ImportMappingTemplate.institution_id == institution_id,
        ImportMappingTemplate.is_active == True,
    ).order_by(ImportMappingTemplate.name)
    templates = db.scalars(templates_stmt).all()

    compatible_templates = []
    for tmpl in templates:
        matched_headers = [h for h in headers if h in tmpl.source_headers]
        match_pct = (len(matched_headers) / len(headers)) if headers else 0
        compatible_templates.append({
            "id": str(tmpl.id),
            "name": tmpl.name,
            "version": tmpl.version,
            "match_percentage": round(match_pct * 100, 1),
            "mappings": tmpl.mappings,
            "transformations": tmpl.transformations,
            "status_dictionary": tmpl.status_dictionary,
        })

    version_tag = f"IMP-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"

    import_job = RosterImport(
        institution_id=institution_id,
        version_tag=version_tag,
        filename=filename,
        file_checksum=file_checksum,
        total_rows=len(rows),
        valid_rows=0,
        new_records_count=0,
        updated_records_count=0,
        rejected_rows_count=0,
        status="uploaded",
        mapping_config=suggested,
        transformation_config={},
        staged_data=rows,
        raw_csv_content=text,
        reconciliation_summary={},
        uploaded_by_user_id=uploader_user_id,
        validation_errors=[],
        is_authoritative_snapshot=False,
    )
    db.add(import_job)
    db.commit()
    db.refresh(import_job)

    # Log audit event
    audit = AuditEvent(
        institution_id=institution_id,
        actor_user_id=uploader_user_id,
        action="import.created",
        resource_type="roster_imports",
        resource_id=import_job.id,
        event_metadata={"filename": filename, "total_rows": len(rows), "checksum": file_checksum},
    )
    db.add(audit)
    db.commit()

    canonical_fields_list = [
        {"key": k, "label": v["label"], "required": v["required"], "type": v["type"], "description": v["description"]}
        for k, v in CANONICAL_FIELDS.items()
    ]

    return {
        "import_id": import_job.id,
        "filename": filename,
        "file_checksum": file_checksum,
        "total_rows": len(rows),
        "source_headers": headers,
        "sample_rows": sample_rows,
        "suggested_mappings": suggested,
        "canonical_fields": canonical_fields_list,
        "compatible_templates": compatible_templates,
    }


# ── Mapping Configuration & Validation ─────────────────────────────────────────

def apply_mapping_and_validate(
    db: Session,
    import_job: RosterImport,
    mappings: dict[str, str],
    transformations: dict[str, Any] | None = None,
    status_dictionary: dict[str, str] | None = None,
    save_as_template: bool = False,
    template_name: str | None = None,
    template_description: str | None = None,
    actor_user_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    """Validates column mapping and executes staging transformation & reconciliation preview."""
    # 1. Validate that all required canonical fields are mapped
    mapped_canonicals = set()
    for source_header, canonical in mappings.items():
        if not canonical:
            continue
        if canonical not in CANONICAL_FIELDS:
            raise ValidationException(f"Destination field '{canonical}' is not an authorized canonical field.")
        if canonical in mapped_canonicals:
            raise ValidationException(f"Duplicate destination mapping: multiple columns target '{canonical}'.")
        mapped_canonicals.add(canonical)

    missing_required = [f for f in REQUIRED_CANONICAL_FIELDS if f not in mapped_canonicals]
    if missing_required:
        missing_labels = [CANONICAL_FIELDS[f]["label"] for f in missing_required]
        raise ValidationException(f"Missing required canonical mappings: {', '.join(missing_labels)}")

    # 2. Save template if requested
    if save_as_template and template_name:
        existing_tmpl = db.scalar(
            select(ImportMappingTemplate).where(
                ImportMappingTemplate.institution_id == import_job.institution_id,
                ImportMappingTemplate.name == template_name.strip(),
            )
        )
        if existing_tmpl:
            version = existing_tmpl.version + 1
        else:
            version = 1

        new_tmpl = ImportMappingTemplate(
            institution_id=import_job.institution_id,
            name=template_name.strip(),
            description=template_description,
            source_headers=list(mappings.keys()),
            mappings=mappings,
            transformations=transformations or {},
            status_dictionary=status_dictionary or {},
            version=version,
            is_active=True,
            created_by_user_id=actor_user_id or import_job.uploaded_by_user_id,
        )
        db.add(new_tmpl)

    # 3. Perform row validation, transformation, and database reconciliation
    staged_rows = import_job.staged_data or []
    preview_rows = []
    creates = 0
    updates = 0
    unchanged = 0
    conflicts = 0
    invalid = 0
    skipped = 0

    # Invert mapping: canonical -> source_header
    canonical_to_source = {v: k for k, v in mappings.items() if v}

    # Fetch institution's existing student and imported records for fast lookup
    institution_id = import_job.institution_id
    existing_imported = db.scalars(
        select(ImportedStudentRecord).where(
            ImportedStudentRecord.institution_id == institution_id,
            ImportedStudentRecord.is_current == True,
        )
    ).all()
    imported_by_number = {r.student_number.strip().upper(): r for r in existing_imported}
    imported_by_email = {r.institutional_email.strip().lower(): r for r in existing_imported}

    existing_students = db.scalars(
        select(Student).where(
            Student.institution_id == institution_id,
            Student.status == "active",
        )
    ).all()
    students_by_number = {s.student_number.strip().upper(): s for s in existing_students}

    # Track student numbers within upload to catch file-internal duplicates
    seen_in_upload: dict[str, int] = {}

    for idx, row in enumerate(staged_rows):
        row_num = idx + 1
        errors: list[str] = []

        # Extract values using mapping
        raw_reg = row.get(canonical_to_source.get("student_number", ""), "")
        raw_name = row.get(canonical_to_source.get("full_name", ""), "")
        raw_email = row.get(canonical_to_source.get("institutional_email", ""), "")
        raw_status = row.get(canonical_to_source.get("enrollment_status", ""), "")
        raw_prog_name = row.get(canonical_to_source.get("programme_name", ""), "")
        raw_prog_code = row.get(canonical_to_source.get("programme_code", ""), "")
        raw_campus_name = row.get(canonical_to_source.get("campus_name", ""), "")
        raw_campus_code = row.get(canonical_to_source.get("campus_code", ""), "")
        raw_acad_year = row.get(canonical_to_source.get("academic_year", ""), "")

        # Transformations
        student_number = transform_preserve_string(raw_reg)
        full_name = transform_collapse_whitespace(raw_name)
        email = transform_normalize_email(raw_email)

        # Validate required fields
        if not student_number:
            errors.append("Student number is required.")
        if not full_name:
            errors.append("Full name is required.")
        if not email:
            errors.append("Institutional email is required.")
        elif not EMAIL_REGEX.match(email):
            errors.append(f"Institutional email '{email}' has invalid syntax.")

        canonical_status, status_err = transform_status(raw_status, status_dictionary)
        if status_err:
            errors.append(status_err)

        norm_prog_code = transform_collapse_whitespace(raw_prog_code) or transform_collapse_whitespace(raw_prog_name) or "GEN"
        norm_campus_code = transform_collapse_whitespace(raw_campus_code) or transform_collapse_whitespace(raw_campus_name)
        norm_acad_year = transform_collapse_whitespace(raw_acad_year) or str(datetime.now().year)

        incoming_values = {
            "student_number": student_number,
            "full_name": full_name,
            "institutional_email": email,
            "enrollment_status": canonical_status or raw_status,
            "programme_code": norm_prog_code,
            "campus_code": norm_campus_code,
            "academic_year": norm_acad_year,
        }

        classification = "create"
        validation_status = "valid"
        existing_values = None
        diff = None

        if errors:
            classification = "invalid"
            validation_status = "error"
            invalid += 1
        else:
            # Check duplicate within upload
            reg_key = student_number.upper()
            if reg_key in seen_in_upload:
                classification = "conflict"
                validation_status = "error"
                errors.append(f"Duplicate student number '{student_number}' within this upload (first seen on row {seen_in_upload[reg_key]}).")
                conflicts += 1
            else:
                seen_in_upload[reg_key] = row_num

                # Check registry match
                existing_match = imported_by_number.get(reg_key)
                email_match = imported_by_email.get(email)

                # Check if email belongs to a different student number
                if email_match and email_match.student_number.upper() != reg_key:
                    classification = "conflict"
                    validation_status = "error"
                    errors.append(f"Email '{email}' is already registered to a different student ({email_match.student_number}).")
                    conflicts += 1
                elif existing_match:
                    existing_values = {
                        "student_number": existing_match.student_number,
                        "full_name": existing_match.full_name or "",
                        "institutional_email": existing_match.institutional_email,
                        "enrollment_status": existing_match.enrollment_status,
                        "programme_code": existing_match.programme_code,
                        "campus_code": existing_match.campus_code or "",
                        "academic_year": existing_match.academic_year,
                    }

                    # Compute field diffs
                    row_diff: dict[str, dict[str, Any]] = {}
                    has_changes = False
                    for k in ("full_name", "institutional_email", "enrollment_status", "programme_code", "campus_code", "academic_year"):
                        inc_val = incoming_values.get(k, "")
                        ex_val = existing_values.get(k, "")
                        if str(inc_val).strip() != str(ex_val).strip():
                            row_diff[k] = {"from": ex_val, "to": inc_val}
                            has_changes = True

                    if has_changes:
                        classification = "update"
                        validation_status = "valid"
                        diff = row_diff
                        updates += 1
                    else:
                        classification = "unchanged"
                        validation_status = "valid"
                        unchanged += 1
                else:
                    classification = "create"
                    validation_status = "valid"
                    creates += 1

        preview_rows.append({
            "row_number": row_num,
            "student_number": student_number,
            "full_name": full_name or None,
            "institutional_email": email,
            "classification": classification,
            "validation_status": validation_status,
            "errors": errors,
            "incoming_values": incoming_values,
            "existing_values": existing_values,
            "diff": diff,
        })

    summary = {
        "total_rows": len(staged_rows),
        "creates_count": creates,
        "updates_count": updates,
        "unchanged_count": unchanged,
        "conflicts_count": conflicts,
        "invalid_count": invalid,
        "skipped_count": skipped,
    }

    is_ready_to_commit = (invalid == 0 and conflicts == 0)
    can_partial_commit = (creates > 0 or updates > 0)

    # Update job state
    import_job.mapping_config = mappings
    import_job.transformation_config = {
        "transformations": transformations or {},
        "status_dictionary": status_dictionary or {},
    }
    import_job.status = "ready_to_commit" if is_ready_to_commit else "validated"
    import_job.reconciliation_summary = summary
    import_job.validation_errors = [
        {"row": r["row_number"], "errors": r["errors"]} for r in preview_rows if r["errors"]
    ]
    db.commit()

    return {
        "import_id": import_job.id,
        "status": import_job.status,
        "filename": import_job.filename,
        "version_tag": import_job.version_tag,
        "summary": summary,
        "rows": preview_rows,
        "is_ready_to_commit": is_ready_to_commit,
        "can_partial_commit": can_partial_commit,
    }


# ── Transactional Commit ───────────────────────────────────────────────────────

def commit_import_job(
    db: Session,
    import_job: RosterImport,
    committer_user_id: uuid.UUID,
    is_authoritative_snapshot: bool = False,
    allow_partial_commit: bool = False,
) -> dict[str, Any]:
    """Applies all valid creates and updates into the institutional registry transactionally.
    Failed imports or validation issues roll back completely leaving registry untouched.
    """
    if import_job.status == "committed":
        raise ValidationException("This import has already been committed.")

    summary = import_job.reconciliation_summary or {}
    invalid_count = summary.get("invalid_count", 0)
    conflicts_count = summary.get("conflicts_count", 0)

    if (invalid_count > 0 or conflicts_count > 0) and not allow_partial_commit:
        raise ValidationException(
            f"Import contains {invalid_count} invalid rows and {conflicts_count} conflicts. "
            "Resolve errors or explicitly permit partial commit."
        )

    # Regenerate preview rows to ensure fresh state
    validation_result = apply_mapping_and_validate(
        db,
        import_job=import_job,
        mappings=import_job.mapping_config,
        transformations=import_job.transformation_config.get("transformations"),
        status_dictionary=import_job.transformation_config.get("status_dictionary"),
    )
    rows = validation_result["rows"]
    institution_id = import_job.institution_id

    now = datetime.now(timezone.utc)
    new_records_count = 0
    updated_records_count = 0
    rejected_rows_count = 0

    try:
        # Load or create a default campus for this institution if needed
        default_campus = db.scalar(
            select(Campus).where(Campus.institution_id == institution_id, Campus.status == "active")
        )
        if not default_campus:
            default_campus = Campus(
                institution_id=institution_id,
                name="Main Campus",
                code="MAIN",
                status="active",
            )
            db.add(default_campus)
            db.flush()

        for row in rows:
            classification = row["classification"]
            if classification in ("invalid", "conflict"):
                rejected_rows_count += 1
                continue
            if classification == "unchanged":
                continue

            inc = row["incoming_values"]
            student_num = inc["student_number"]
            email = inc["institutional_email"]
            name = inc["full_name"]
            status_val = inc["enrollment_status"]
            prog_code = inc["programme_code"]
            campus_code = inc["campus_code"]
            acad_year = inc["academic_year"]

            # 1. Archive prior ImportedStudentRecord for this student number
            existing_imported = db.scalars(
                select(ImportedStudentRecord).where(
                    ImportedStudentRecord.institution_id == institution_id,
                    ImportedStudentRecord.student_number == student_num,
                    ImportedStudentRecord.is_current == True,
                )
            ).all()
            for old_rec in existing_imported:
                old_rec.is_current = False

            # 2. Insert new ImportedStudentRecord
            new_imported = ImportedStudentRecord(
                institution_id=institution_id,
                roster_import_id=import_job.id,
                student_number=student_num,
                institutional_email=email,
                full_name=name,
                enrollment_status=status_val,
                programme_code=prog_code,
                campus_code=campus_code,
                academic_year=acad_year,
                record_updated_at=now,
                raw_data=inc,
                is_current=True,
            )
            db.add(new_imported)

            # 3. Synchronize with live Student and ProgrammeEnrollment
            existing_student = db.scalar(
                select(Student).where(
                    Student.institution_id == institution_id,
                    Student.student_number == student_num,
                )
            )

            # Find or create Programme
            prog = db.scalar(
                select(Programme).where(
                    Programme.institution_id == institution_id,
                    Programme.code == prog_code,
                )
            )
            if not prog:
                prog = Programme(
                    institution_id=institution_id,
                    code=prog_code,
                    name=inc.get("programme_name") or f"Programme {prog_code}",
                    status="active",
                )
                db.add(prog)
                db.flush()

            if not existing_student:
                # Create Student
                new_student = Student(
                    institution_id=institution_id,
                    campus_id=default_campus.id,
                    student_number=student_num,
                    status="active",
                )
                db.add(new_student)
                db.flush()

                # Create ProgrammeEnrollment
                enrollment = ProgrammeEnrollment(
                    institution_id=institution_id,
                    student_id=new_student.id,
                    programme_id=prog.id,
                    academic_year=acad_year,
                    study_year=1,
                    status=status_val if status_val in ("active", "pending", "completed", "suspended", "withdrawn") else "active",
                )
                db.add(enrollment)
                new_records_count += 1
            else:
                # Existing student update
                if existing_student.status == "archived":
                    existing_student.status = "active"

                # Update or create ProgrammeEnrollment
                enrollment = db.scalar(
                    select(ProgrammeEnrollment).where(
                        ProgrammeEnrollment.institution_id == institution_id,
                        ProgrammeEnrollment.student_id == existing_student.id,
                    ).order_by(ProgrammeEnrollment.created_at.desc())
                )
                if enrollment:
                    enrollment.academic_year = acad_year
                    if status_val in ("active", "pending", "completed", "suspended", "withdrawn"):
                        enrollment.status = status_val
                else:
                    new_enr = ProgrammeEnrollment(
                        institution_id=institution_id,
                        student_id=existing_student.id,
                        programme_id=prog.id,
                        academic_year=acad_year,
                        study_year=1,
                        status=status_val if status_val in ("active", "pending", "completed", "suspended", "withdrawn") else "active",
                    )
                    db.add(new_enr)
                updated_records_count += 1

        # If authoritative snapshot, handle missing records if policy permits
        if is_authoritative_snapshot:
            # Note: per requirements, missing records do not silently become inactive unless policy allows
            pass

        # Update institution roster tracking
        inst = db.get(Institution, institution_id)
        if inst:
            inst.roster_last_imported_at = now
            inst.roster_active_version = import_job.version_tag

        # Update RosterImport record
        import_job.status = "committed"
        import_job.committed_at = now
        import_job.valid_rows = len(rows) - rejected_rows_count
        import_job.new_records_count = new_records_count
        import_job.updated_records_count = updated_records_count
        import_job.rejected_rows_count = rejected_rows_count
        import_job.is_authoritative_snapshot = is_authoritative_snapshot

        # Audit event
        audit = AuditEvent(
            institution_id=institution_id,
            actor_user_id=committer_user_id,
            action="import.committed",
            resource_type="roster_imports",
            resource_id=import_job.id,
            event_metadata={
                "version_tag": import_job.version_tag,
                "new_records": new_records_count,
                "updated_records": updated_records_count,
                "rejected_records": rejected_rows_count,
                "is_authoritative_snapshot": is_authoritative_snapshot,
            },
        )
        db.add(audit)
        db.commit()

        return {
            "import_id": import_job.id,
            "status": "committed",
            "version_tag": import_job.version_tag,
            "total_rows": len(rows),
            "new_records_count": new_records_count,
            "updated_records_count": updated_records_count,
            "rejected_rows_count": rejected_rows_count,
            "committed_at": now,
            "message": f"Successfully committed roster import: {new_records_count} created, {updated_records_count} updated, {rejected_rows_count} rejected.",
        }

    except Exception as e:
        db.rollback()
        import_job.status = "failed"
        db.commit()
        raise AstraMindException(
            message=f"Import commit transaction failed and was rolled back: {str(e)}",
            code="IMPORT_COMMIT_FAILED",
            status_code=500,
        )
