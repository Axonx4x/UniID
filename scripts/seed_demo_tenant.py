"""Deterministic, idempotent, development-only Phase 3 demo seed."""

import os
import sys
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
api_dir = os.path.join(repo_root, "apps", "api")
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import logger
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import (
    AuditEvent, Campus, CredentialEvent, DigitalCredential, FeePolicy, Institution,
    IntegrationConfig, Membership, Programme, ProgrammeEnrollment, RosterImport,
    ImportedStudentRecord, Student, User,
)
from app.services.luanar_demo import DEMO_EMAIL_DOMAIN, DEMO_ROSTER_VERSION, as_record_data, roster_rows

DEMO_PASSWORDS = {
    "student@demo.invalid": "DemoStudent!2026",
    "verifier@demo.invalid": "DemoVerifier!2026",
    "registry@demo.invalid": "DemoRegistry!2026",
    "platform@demo.invalid": "DemoPlatform!2026",
    "multi.role@demo.invalid": "DemoMultiRole!2026",
    "unilia.registry@demo.invalid": "DemoUniliaRegistry!2026",
    # ── LUANAR Demo Accounts ──────────────────────────────────────────────────
    "luanar.student@demo.invalid": "LuanarStudent!2026",
    "luanar.registry@demo.invalid": "LuanarRegistry!2026",
}
_NAMESPACE = uuid.UUID("8f2080aa-2dd1-4b79-a70d-ef27c6c586d3")
ISSUED_AT = datetime(2026, 1, 15, 9, 0, tzinfo=timezone.utc)
EXPIRES_AT = datetime(2027, 1, 15, 9, 0, tzinfo=timezone.utc)


def demo_id(key: str) -> uuid.UUID:
    return uuid.uuid5(_NAMESPACE, key)


def add_or_update(db: Session, model: type, key: str, **values):
    object_id = demo_id(key)
    instance = db.get(model, object_id)
    if instance is None:
        # Natural keys keep this seed safe when a development database already
        # contains an account or tenant from an earlier seed/version.
        if model is Institution and "slug" in values:
            from sqlalchemy import select as sa_select
            instance = db.scalars(sa_select(Institution).where(Institution.slug == values["slug"])).first()
        elif model is User and "email" in values:
            from sqlalchemy import select as sa_select
            instance = db.scalars(sa_select(User).where(User.email == values["email"])).first()
        if instance is None:
            instance = model(id=object_id, **values)
            db.add(instance)
            return instance
    for field, value in values.items():
        setattr(instance, field, value)
    return instance


def lifecycle_seed_record(
    db: Session, key: str, institution_id: uuid.UUID, student_id: uuid.UUID,
    status: str, actor_user_id: uuid.UUID, reason: str | None = None,
) -> DigitalCredential:
    credential = add_or_update(
        db, DigitalCredential, f"credential:{key}", institution_id=institution_id, student_id=student_id,
        public_reference=f"cr_demo_{key.replace('-', '_')}", status=status, issued_at=ISSUED_AT,
        expires_at=EXPIRES_AT, issued_by_user_id=actor_user_id, policy_reference="enrollment-active-v1",
        revoked_at=ISSUED_AT if status == "revoked" else None,
        revocation_reason=reason if status == "revoked" else None,
    )
    db.flush()
    event_type = {"active": "credential.issued", "suspended": "credential.suspended", "revoked": "credential.revoked"}[status]
    add_or_update(
        db, CredentialEvent, f"credential-event:{key}", institution_id=institution_id,
        credential_id=credential.id, event_type=event_type, actor_user_id=actor_user_id, reason=reason,
        event_metadata={"previous_status": "active" if status != "active" else None, "new_status": status},
    )
    add_or_update(
        db, AuditEvent, f"credential-audit:{key}", institution_id=institution_id, actor_user_id=actor_user_id,
        action=event_type, resource_type="digital_credential", resource_id=credential.id,
        event_metadata={"seed": True, "new_status": status},
    )
    return credential


def seed_luanar_demo_roster(db: Session, luanar: Institution, registry_user: User) -> None:
    """Seed the persistent LUANAR presenter roster when explicitly enabled.

    The deterministic fixture is also the source of the downloadable CSV and
    API-simulation lookup.  Keeping it in ImportedStudentRecord means staff
    screens and onboarding exercise the same persistence path as a real import.
    """
    if not settings.UNIID_DEMO_MODE:
        return

    luanar.allowed_email_domains = sorted({*(luanar.allowed_email_domains or []), DEMO_EMAIL_DOMAIN})
    roster = add_or_update(
        db, RosterImport, "roster:luanar:demo-2026",
        institution_id=luanar.id,
        version_tag=DEMO_ROSTER_VERSION,
        filename="luanar_demo_roster_2026.csv",
        total_rows=200,
        valid_rows=200,
        new_records_count=200,
        updated_records_count=0,
        rejected_rows_count=0,
        status="committed",
        validation_errors=[],
        mapping_config={"fixture": "luanar_demo", "source": "synthetic"},
        transformation_config={},
        staged_data=[],
        raw_csv_content=None,
        reconciliation_summary={"fixture": "synthetic_luanar_demo", "records": 200},
        is_authoritative_snapshot=False,
        uploaded_by_user_id=registry_user.id,
    )
    db.flush()
    luanar.roster_last_imported_at = datetime(2026, 1, 15, 9, 0, tzinfo=timezone.utc)
    luanar.roster_active_version = DEMO_ROSTER_VERSION

    for row in roster_rows():
        add_or_update(
            db, ImportedStudentRecord, f"imported:luanar-demo:{row.student_number}",
            institution_id=luanar.id,
            roster_import_id=roster.id,
            **as_record_data(row),
        )


def seed_demo_data(db: Session) -> None:
    if settings.is_production:
        raise RuntimeError("Synthetic seed data is disabled in production")

    # ── Legacy Demo Institutions (Path A & B for internal demos) ──────────────
    northstar = add_or_update(
        db, Institution, "institution:northstar",
        name="Northstar Institute of Applied Learning", slug="northstar-demo", institution_code="NSIAL-DEMO", status="active",
        verification_mode="api_verification",
        allowed_email_domains=["northstar.ac.mw", "student.northstar.invalid", "demo.invalid"],
    )
    lakeside = add_or_update(
        db, Institution, "institution:lakeside",
        name="Lakeside Technical College", slug="lakeside-demo", institution_code="LTC-DEMO", status="active",
        verification_mode="file_and_review",
        allowed_email_domains=["lakeside.ac.mw", "student.lakeside.invalid", "demo.invalid"],
    )
    unilia = add_or_update(
        db, Institution, "institution:unilia",
        name="University of Livingstonia", slug="unilia", institution_code="UNILIA-DEMO", status="active",
        verification_mode="api_verification",
        allowed_email_domains=["unilia.ac.mw", "student.unilia.ac.mw"],
    )

    # ── 6 Partner Malawian Universities ──────────────────────────────────────
    unima = add_or_update(
        db, Institution, "institution:unima",
        name="University of Malawi", slug="unima", institution_code="UNIMA", status="active",
        verification_mode="api_verification",
        allowed_email_domains=["unima.ac.mw", "student.unima.ac.mw", "chanco.unima.ac.mw", "kck.unima.ac.mw"],
    )
    luanar = add_or_update(
        db, Institution, "institution:luanar",
        name="Lilongwe University of Agriculture and Natural Resources", slug="luanar", institution_code="LUANAR", status="active",
        verification_mode="api_verification",
        allowed_email_domains=["luanar.ac.mw", "student.luanar.ac.mw", DEMO_EMAIL_DOMAIN],
    )
    mubas = add_or_update(
        db, Institution, "institution:mubas",
        name="Malawi University of Business and Applied Sciences", slug="mubas", institution_code="MUBAS", status="active",
        verification_mode="file_and_review",
        allowed_email_domains=["mubas.ac.mw", "student.mubas.ac.mw", "poly.ac.mw"],
    )
    kuhes = add_or_update(
        db, Institution, "institution:kuhes",
        name="Kamuzu University of Health Sciences", slug="kuhes", institution_code="KUHeS", status="active",
        verification_mode="api_verification",
        allowed_email_domains=["kuhes.ac.mw", "student.kuhes.ac.mw"],
    )
    must = add_or_update(
        db, Institution, "institution:must",
        name="Malawi University of Science and Technology", slug="must", institution_code="MUST", status="active",
        verification_mode="api_verification",
        allowed_email_domains=["must.ac.mw", "student.must.ac.mw"],
    )
    mzuni = add_or_update(
        db, Institution, "institution:mzuni",
        name="Mzuzu University", slug="mzuni", institution_code="MZUNI", status="active",
        verification_mode="api_verification",
        allowed_email_domains=["mzuni.ac.mw", "student.mzuni.ac.mw"],
    )

    db.flush()

    # ── Campuses ──────────────────────────────────────────────────────────────
    north_campus = add_or_update(db, Campus, "campus:northstar:central", institution_id=northstar.id, name="Central Demonstration Campus", code="CENTRAL", status="active")
    lake_campus = add_or_update(db, Campus, "campus:lakeside:harbour", institution_id=lakeside.id, name="Harbour Demonstration Campus", code="HARBOUR", status="active")
    unilia_campus = add_or_update(db, Campus, "campus:unilia:laws", institution_id=unilia.id, name="Laws Campus", code="LAWS", status="active")

    # Partner university campuses
    unima_campus = add_or_update(db, Campus, "campus:unima:chancellor", institution_id=unima.id, name="Chancellor College", code="CHC", status="active")
    luanar_campus = add_or_update(db, Campus, "campus:luanar:city", institution_id=luanar.id, name="City Campus", code="CITY", status="active")
    mubas_campus = add_or_update(db, Campus, "campus:mubas:blantyre", institution_id=mubas.id, name="Blantyre Main Campus", code="BLT", status="active")
    kuhes_campus = add_or_update(db, Campus, "campus:kuhes:gandhi", institution_id=kuhes.id, name="Mahatma Gandhi Campus", code="MGC", status="active")
    must_campus = add_or_update(db, Campus, "campus:must:thyolo", institution_id=must.id, name="Thyolo Campus", code="THY", status="active")
    mzuni_campus = add_or_update(db, Campus, "campus:mzuni:luwinga", institution_id=mzuni.id, name="Luwinga Campus", code="LWG", status="active")

    # ── Programmes (demo + partner) ───────────────────────────────────────────
    programmes = {
        "north-it": add_or_update(db, Programme, "programme:northstar:it", institution_id=northstar.id, code="DIT-DEMO", name="Diploma in Information Technology (Demo)", status="active"),
        "north-agri": add_or_update(db, Programme, "programme:northstar:agri", institution_id=northstar.id, code="DAS-DEMO", name="Diploma in Agricultural Systems (Demo)", status="active"),
        "lake-eng": add_or_update(db, Programme, "programme:lakeside:eng", institution_id=lakeside.id, code="BENG-DEMO", name="Bachelor of Engineering Practice (Demo)", status="active"),
        "lake-bus": add_or_update(db, Programme, "programme:lakeside:bus", institution_id=lakeside.id, code="DBA-DEMO", name="Diploma in Business Administration (Demo)", status="active"),
        "unilia-it": add_or_update(db, Programme, "programme:unilia:it", institution_id=unilia.id, code="BIT-DEMO", name="Bachelor of Information Technology (Demo)", status="active"),
        # Partner university programmes
        "unima-edu": add_or_update(db, Programme, "programme:unima:edu", institution_id=unima.id, code="BED", name="Bachelor of Education", status="active"),
        "unima-sci": add_or_update(db, Programme, "programme:unima:sci", institution_id=unima.id, code="BSC-MATH", name="BSc Mathematics", status="active"),
        "luanar-agri": add_or_update(db, Programme, "programme:luanar:agri", institution_id=luanar.id, code="BSC-AGRI", name="BSc Agribusiness Management", status="active"),
        "luanar-food": add_or_update(db, Programme, "programme:luanar:food", institution_id=luanar.id, code="BSC-FOOD", name="BSc Food Science and Technology", status="active"),
        "mubas-cs": add_or_update(db, Programme, "programme:mubas:cs", institution_id=mubas.id, code="BSC-CS", name="BSc Computer Science", status="active"),
        "mubas-biz": add_or_update(db, Programme, "programme:mubas:biz", institution_id=mubas.id, code="BBA", name="Bachelor of Business Administration", status="active"),
        "kuhes-mbbs": add_or_update(db, Programme, "programme:kuhes:mbbs", institution_id=kuhes.id, code="MBBS", name="Bachelor of Medicine and Surgery", status="active"),
        "kuhes-nurs": add_or_update(db, Programme, "programme:kuhes:nurs", institution_id=kuhes.id, code="BSC-NURS", name="BSc Nursing", status="active"),
        "must-cs": add_or_update(db, Programme, "programme:must:cs", institution_id=must.id, code="BSC-CS-MUST", name="BSc Computer Science", status="active"),
        "must-eng": add_or_update(db, Programme, "programme:must:eng", institution_id=must.id, code="BSC-ENG", name="BSc Engineering", status="active"),
        "mzuni-edu": add_or_update(db, Programme, "programme:mzuni:edu", institution_id=mzuni.id, code="BED-MZUNI", name="Bachelor of Education", status="active"),
        "mzuni-it": add_or_update(db, Programme, "programme:mzuni:it", institution_id=mzuni.id, code="BSC-IT", name="BSc Information Technology", status="active"),
    }

    names = {
        "student@demo.invalid": "Amina Example", "verifier@demo.invalid": "Victor Example",
        "registry@demo.invalid": "Ruth Example", "platform@demo.invalid": "Pat Example",
        "multi.role@demo.invalid": "Morgan Example",
        "unilia.registry@demo.invalid": "UNILIA Registry Demo",
        # LUANAR demo personas
        "luanar.student@demo.invalid": "Chikondi Phiri",
        "luanar.registry@demo.invalid": "Dr. Evelyn Nkhoma",
    }
    users = {email: add_or_update(db, User, f"user:{email}", email=email, password_hash=hash_password(password), full_name=names[email], status="active") for email, password in DEMO_PASSWORDS.items()}
    db.flush()
    for key, email, institution, role in (
        ("student", "student@demo.invalid", northstar, "student"), ("verifier", "verifier@demo.invalid", northstar, "verifier"),
        ("registry", "registry@demo.invalid", northstar, "registry_admin"), ("platform", "platform@demo.invalid", northstar, "platform_admin"),
        ("multi-north", "multi.role@demo.invalid", northstar, "registry_admin"), ("multi-lake", "multi.role@demo.invalid", lakeside, "verifier"),
        ("multi-unilia", "multi.role@demo.invalid", unilia, "verifier"),
        ("unilia-registry", "unilia.registry@demo.invalid", unilia, "registry_admin"),
        # LUANAR demo memberships
        ("luanar-student", "luanar.student@demo.invalid", luanar, "student"),
        ("luanar-registry", "luanar.registry@demo.invalid", luanar, "registry_admin"),
    ):
        add_or_update(db, Membership, f"membership:{key}", user_id=users[email].id, institution_id=institution.id, role=role, status="active")

    amina = add_or_update(
        db, Student, "student:northstar:001",
        institution_id=northstar.id, campus_id=north_campus.id,
        student_number="DEMO/2026/001", user_id=users["student@demo.invalid"].id,
        photo_url="/assets/images/student_id_photo.jpg",
        phone_number="+265 991 234 567",
    )

    # ── LUANAR Demo Student ─────────────────────────────────────────────────────
    luanar_student = add_or_update(
        db, Student, "student:luanar:001",
        institution_id=luanar.id, campus_id=luanar_campus.id,
        student_number="LCC/2024/0101",
        user_id=users["luanar.student@demo.invalid"].id,
        photo_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&auto=format",
        phone_number="+265 888 101 202",
    )
    biko = add_or_update(db, Student, "student:northstar:002", institution_id=northstar.id, campus_id=north_campus.id, student_number="DEMO/2026/002", user_id=None)
    chisomo = add_or_update(db, Student, "student:northstar:003", institution_id=northstar.id, campus_id=north_campus.id, student_number="DEMO/2026/003", user_id=None)
    dita = add_or_update(db, Student, "student:northstar:004", institution_id=northstar.id, campus_id=north_campus.id, student_number="DEMO/2026/004", user_id=None)
    eni = add_or_update(db, Student, "student:northstar:005", institution_id=northstar.id, campus_id=north_campus.id, student_number="DEMO/2026/005", user_id=None)
    lake_student = add_or_update(db, Student, "student:lakeside:001", institution_id=lakeside.id, campus_id=lake_campus.id, student_number="DEMO/2026/001", user_id=None)
    db.flush()
    for key, institution_id, student_id, programme_id, status, study_year in (
        ("north-001", northstar.id, amina.id, programmes["north-it"].id, "active", 1),
        ("north-002", northstar.id, biko.id, programmes["north-agri"].id, "active", 2),
        ("north-003", northstar.id, chisomo.id, programmes["north-agri"].id, "suspended", 1),
        ("north-004", northstar.id, dita.id, programmes["north-it"].id, "active", 2),
        ("north-005", northstar.id, eni.id, programmes["north-it"].id, "active", 2),
        ("lake-001", lakeside.id, lake_student.id, programmes["lake-eng"].id, "active", 1),
        ("luanar-001", luanar.id, luanar_student.id, programmes["luanar-agri"].id, "active", 2),
    ):
        add_or_update(db, ProgrammeEnrollment, f"enrollment:{key}", institution_id=institution_id, student_id=student_id, programme_id=programme_id, academic_year="2026", study_year=study_year, status=status, start_date=date(2026, 1, 12), end_date=None)

    lifecycle_seed_record(db, "north-001-active", northstar.id, amina.id, "active", users["registry@demo.invalid"].id)
    lifecycle_seed_record(db, "north-004-suspended", northstar.id, dita.id, "suspended", users["registry@demo.invalid"].id, "Synthetic demo suspension")
    lifecycle_seed_record(db, "north-005-revoked", northstar.id, eni.id, "revoked", users["registry@demo.invalid"].id, "Synthetic demo revocation")
    # LUANAR credential lifecycle
    lifecycle_seed_record(db, "luanar-001-active", luanar.id, luanar_student.id, "active", users["luanar.registry@demo.invalid"].id)
    add_or_update(db, FeePolicy, "fee-policy:northstar:example", institution_id=northstar.id, name="Illustrative Demo Fee - Not Institutionally Approved", amount=Decimal("15000.00"), currency="MWK", status="inactive", effective_from=date(2026, 1, 1), effective_until=None)
    add_or_update(db, IntegrationConfig, "integration:northstar:sis", institution_id=northstar.id, name="Synthetic SIS Adapter (No Live Connection)", integration_type="student_information_system", configuration={"mode": "simulation", "secret_reference": None}, status="not_configured")

    # ── Integration configs for partner universities ───────────────────────────
    for inst_key, inst_obj, adapter_name in (
        ("unilia", unilia, "UNILIA SIS Adapter (Simulated Test Tenant)"),
        ("unima", unima, "UNIMA SIS Adapter (Simulated)"),
        ("luanar", luanar, "LUANAR SIS Adapter (Simulated)"),
        ("mubas", mubas, "MUBAS File Review Adapter"),
        ("kuhes", kuhes, "KUHeS SIS Adapter (Simulated)"),
        ("must", must, "MUST SIS Adapter (Simulated)"),
        ("mzuni", mzuni, "MZUNI SIS Adapter (Simulated)"),
    ):
        add_or_update(
            db, IntegrationConfig, f"integration:{inst_key}:sis",
            institution_id=inst_obj.id,
            name=adapter_name,
            integration_type="student_information_system",
            configuration={"mode": "simulation", "secret_reference": None},
            status="not_configured",
        )

    seed_luanar_demo_roster(db, luanar, users["luanar.registry@demo.invalid"])

    # ── Lakeside Roster Records (Path B seed data) ──────────────────────
    roster = add_or_update(
        db, RosterImport, "roster:lakeside:initial",
        institution_id=lakeside.id,
        version_tag="ROSTER-SEED-2026",
        filename="lakeside_students_seed.csv",
        total_rows=3,
        valid_rows=3,
        new_records_count=3,
        updated_records_count=0,
        rejected_rows_count=0,
        status="committed",
        validation_errors=[],
        is_authoritative_snapshot=False,
        uploaded_by_user_id=users["registry@demo.invalid"].id,
    )
    db.flush()
    lakeside.roster_last_imported_at = datetime(2026, 10, 1, 9, 0, tzinfo=timezone.utc)
    lakeside.roster_active_version = "ROSTER-SEED-2026"

    for key, sn, em, name, prog, year in (
        ("lake-r1", "LTC/2026/001", "student.lake1@demo.invalid", "Grace Nyirenda", "BENG-DEMO", "2026"),
        ("lake-r2", "LTC/2026/002", "student.lake2@demo.invalid", "James Chirwa", "DBA-DEMO", "2026"),
        ("lake-r3", "LTC/2026/003", "student.lake3@demo.invalid", "Faith Mwale", "BENG-DEMO", "2026"),
    ):
        add_or_update(
            db, ImportedStudentRecord, f"imported:{key}",
            institution_id=lakeside.id,
            roster_import_id=roster.id,
            student_number=sn,
            institutional_email=em,
            full_name=name,
            enrollment_status="Active",
            programme_code=prog,
            academic_year=year,
            raw_data={"student_number": sn, "institutional_email": em, "full_name": name},
            is_current=True,
        )

    # ── MUBAS Roster Records (Path B for file_and_review mode) ───────────────
    mubas_roster = add_or_update(
        db, RosterImport, "roster:mubas:initial",
        institution_id=mubas.id,
        version_tag="MUBAS-ROSTER-2026",
        filename="mubas_students_seed.csv",
        total_rows=2,
        valid_rows=2,
        new_records_count=2,
        updated_records_count=0,
        rejected_rows_count=0,
        status="committed",
        validation_errors=[],
        is_authoritative_snapshot=False,
        uploaded_by_user_id=users["registry@demo.invalid"].id,
    )
    db.flush()
    mubas.roster_last_imported_at = datetime(2026, 10, 1, 9, 0, tzinfo=timezone.utc)
    mubas.roster_active_version = "MUBAS-ROSTER-2026"

    for key, sn, em, name, prog, year in (
        ("mubas-r1", "MUBAS2024001", "grace.nkhonjera@student.mubas.ac.mw", "Grace Nkhonjera", "BSC-CS", "2026"),
        ("mubas-r2", "MB/2024/001", "thokozani.mwale@student.mubas.ac.mw", "Thokozani Mwale", "BBA", "2026"),
    ):
        add_or_update(
            db, ImportedStudentRecord, f"imported:{key}",
            institution_id=mubas.id,
            roster_import_id=mubas_roster.id,
            student_number=sn,
            institutional_email=em,
            full_name=name,
            enrollment_status="Active",
            programme_code=prog,
            academic_year=year,
            raw_data={"student_number": sn, "institutional_email": em, "full_name": name},
            is_current=True,
        )

    db.commit()


def seed_tenants() -> None:
    with SessionLocal() as db:
        try:
            seed_demo_data(db)
            logger.info("Synthetic Phase 3 credential lifecycle demo data is present")
        except Exception:
            db.rollback()
            logger.exception("Failed to seed synthetic demo data")
            raise


if __name__ == "__main__":
    seed_tenants()
