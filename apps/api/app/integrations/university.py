"""Explicit adapter interface and simulation implementation for university SIS integrations."""

import re
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field


class StudentEligibilityRecord(BaseModel):
    institution_code: str = Field(..., description="Institution code identifier (e.g. luanar)")
    student_id: str = Field(..., description="University-assigned student registration number")
    full_name: str = Field(..., description="Student authorized full legal name")
    photo_reference: Optional[str] = Field(default=None, description="URL or key of authorized student photo")
    programme: str = Field(..., description="Registered academic programme")
    academic_year: str = Field(..., description="Current academic year / level")
    enrollment_status: str = Field(..., description="Active, Deferred, Graduated, Suspended")
    is_eligible_for_credential: bool = Field(..., description="Whether registry permits ID issuance")
    is_simulation: bool = Field(default=True, description="Flag explicitly declaring synthetic record")


class UniversityIntegrationAdapter(ABC):
    """Abstract contract that all university Student Information System (SIS) adapters must implement."""

    @abstractmethod
    def fetch_student_eligibility(self, institution_code: str, student_id: str) -> Optional[StudentEligibilityRecord]:
        """Fetches student registration, enrollment and credential eligibility status from university records."""
        pass

    @abstractmethod
    def verify_student_status(self, institution_code: str, student_id: str) -> bool:
        """Verifies if the student remains in an active enrolled status at the institution."""
        pass


# Programme defaults for each institution when no specific fixture exists
_INSTITUTION_DEFAULTS = {
    "unima": {
        "programmes": ["Bachelor of Education", "BSc Mathematics", "Bachelor of Laws", "BA Social Sciences"],
        "prefix_pattern": re.compile(r"^(UN|CHC|KCN|BUA|CCE|EDU)\d{3,8}$", re.IGNORECASE),
        "generic_pattern": re.compile(r"^\d{4,}/\d+$"),  # e.g. 2024/001
    },
    "luanar": {
        "programmes": ["BSc Agribusiness Management", "BSc Food Science and Technology", "BSc Crop Science", "Diploma in Agriculture"],
        "prefix_pattern": re.compile(r"^(LCC|LNR|BND|LUANAR)/\d{4}/\d+$", re.IGNORECASE),
        "generic_pattern": re.compile(r"^[A-Z]{2,6}\d{4,}$", re.IGNORECASE),
    },
    "mubas": {
        "programmes": ["BSc Computer Science", "Bachelor of Business Administration", "BSc Electrical Engineering", "BCom Accountancy"],
        "prefix_pattern": re.compile(r"^(MUBAS|POLY|MB)\d{4,}$", re.IGNORECASE),
        "generic_pattern": re.compile(r"^[A-Z]{1,4}/\d{4}/\d+$", re.IGNORECASE),
    },
    "kuhes": {
        "programmes": ["Bachelor of Medicine and Surgery", "BSc Nursing", "BSc Pharmacy", "BSc Public Health"],
        "prefix_pattern": re.compile(r"^(KUHeS|KHS|MED|NUR|PHM)\d{4,}$", re.IGNORECASE),
        "generic_pattern": re.compile(r"^[A-Z]{2,5}/?\d{4,}$", re.IGNORECASE),
    },
    "must": {
        "programmes": ["BSc Computer Science", "BSc Engineering", "BSc Information Systems", "MBA"],
        "prefix_pattern": re.compile(r"^(MU|MUST)\d{4,}$", re.IGNORECASE),
        "generic_pattern": re.compile(r"^[A-Z]{1,4}\d{4,}$", re.IGNORECASE),
    },
    "mzuni": {
        "programmes": ["Bachelor of Education", "BSc Information Technology", "Bachelor of Nursing", "BSc Environmental Science"],
        "prefix_pattern": re.compile(r"^(MZ|MZUNI|MZU)\d{4,}$", re.IGNORECASE),
        "generic_pattern": re.compile(r"^[A-Z]{2,6}/?\d{4,}$", re.IGNORECASE),
    },
    "nsial-demo": {
        "programmes": ["Diploma in Information Technology (Demo)", "Diploma in Agricultural Systems (Demo)"],
        "prefix_pattern": re.compile(r"^DEMO/\d{4}/\d+$", re.IGNORECASE),
        "generic_pattern": re.compile(r"^[A-Z]{2,6}\d{3,}$", re.IGNORECASE),
    },
    "afi-demo": {
        "programmes": ["Alpha Programme"],
        "prefix_pattern": re.compile(r"^AFI/\d{4}/\d+$", re.IGNORECASE),
        "generic_pattern": re.compile(r"^[A-Z]{2,6}/?\d{3,}$", re.IGNORECASE),
    },
}

# Minimum valid registration number: at least 4 chars with at least one digit
_GENERIC_VALID_REG = re.compile(r"^[A-Z0-9/\-]{4,}$", re.IGNORECASE)


class SimulatedUniversityAdapter(UniversityIntegrationAdapter):
    """
    Simulated implementation of UniversityIntegrationAdapter for demonstration and development.
    Provides synthetic, allow-listed student records for development without requiring
    a direct SIS integration. Unknown registration numbers never auto-verify: they
    are deliberately routed to the staff-review path just as an unavailable or
    non-authoritative SIS lookup would be.
    """

    def __init__(self):
        # Explicit fixture dataset for demonstration personas (exact match)
        self._fixtures: dict[tuple[str, str], StudentEligibilityRecord] = {
            # ── UNILIA synthetic test tenant ───────────────────────────────────
            ("unilia-demo", "cen-01-41-23"): StudentEligibilityRecord(
                institution_code="unilia-demo",
                student_id="cen-01-41-23",
                full_name="UNILIA Test Student",
                photo_reference=None,
                programme="Bachelor of Information Technology (Demo)",
                academic_year="2026",
                enrollment_status="Active",
                is_eligible_for_credential=True,
                is_simulation=True,
            ),
            # ── MUST ────────────────────────────────────────────────────────────
            ("must", "MU123456"): StudentEligibilityRecord(
                institution_code="must",
                student_id="MU123456",
                full_name="John Doe",
                photo_reference="/assets/images/student_id_photo.jpg",
                programme="BSc Computer Science",
                academic_year="Year 2",
                enrollment_status="Active",
                is_eligible_for_credential=True,
                is_simulation=False,
            ),
            ("must", "MUST2024001"): StudentEligibilityRecord(
                institution_code="must",
                student_id="MUST2024001",
                full_name="Chisomo Phiri",
                photo_reference=None,
                programme="BSc Engineering",
                academic_year="Year 3",
                enrollment_status="Active",
                is_eligible_for_credential=True,
                is_simulation=True,
            ),
            # ── UNIMA ───────────────────────────────────────────────────────────
            ("unima", "UN2024001"): StudentEligibilityRecord(
                institution_code="unima",
                student_id="UN2024001",
                full_name="Alinafe Banda",
                photo_reference=None,
                programme="Bachelor of Education",
                academic_year="Year 2",
                enrollment_status="Active",
                is_eligible_for_credential=True,
                is_simulation=True,
            ),
            ("unima", "CHC/2024/001"): StudentEligibilityRecord(
                institution_code="unima",
                student_id="CHC/2024/001",
                full_name="Kondwani Chirwa",
                photo_reference=None,
                programme="BSc Mathematics",
                academic_year="Year 1",
                enrollment_status="Active",
                is_eligible_for_credential=True,
                is_simulation=True,
            ),
            # ── LUANAR ──────────────────────────────────────────────────────────
            ("luanar", "LCC/2024/0101"): StudentEligibilityRecord(
                institution_code="luanar",
                student_id="LCC/2024/0101",
                full_name="Chikondi Phiri",
                photo_reference="https://images.unsplash.com/photo-1534528741775-53994a69daeb",
                programme="BSc Agribusiness Management",
                academic_year="Year 2",
                enrollment_status="Active",
                is_eligible_for_credential=True,
                is_simulation=True,
            ),
            ("luanar", "LCC/2024/0102"): StudentEligibilityRecord(
                institution_code="luanar",
                student_id="LCC/2024/0102",
                full_name="Tamanda Banda",
                photo_reference="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
                programme="BSc Food Science and Technology",
                academic_year="Year 3",
                enrollment_status="Active",
                is_eligible_for_credential=True,
                is_simulation=True,
            ),
            ("luanar", "LCC/2024/0103"): StudentEligibilityRecord(
                institution_code="luanar",
                student_id="LCC/2024/0103",
                full_name="Kondwani Mtambo",
                photo_reference="https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
                programme="Diploma in Agriculture",
                academic_year="Year 1",
                enrollment_status="Suspended",
                is_eligible_for_credential=False,
                is_simulation=True,
            ),
            # ── MUBAS ───────────────────────────────────────────────────────────
            ("mubas", "MUBAS2024001"): StudentEligibilityRecord(
                institution_code="mubas",
                student_id="MUBAS2024001",
                full_name="Grace Nkhonjera",
                photo_reference=None,
                programme="BSc Computer Science",
                academic_year="Year 2",
                enrollment_status="Active",
                is_eligible_for_credential=True,
                is_simulation=True,
            ),
            ("mubas", "MB/2024/001"): StudentEligibilityRecord(
                institution_code="mubas",
                student_id="MB/2024/001",
                full_name="Thokozani Mwale",
                photo_reference=None,
                programme="Bachelor of Business Administration",
                academic_year="Year 1",
                enrollment_status="Active",
                is_eligible_for_credential=True,
                is_simulation=True,
            ),
            # ── KUHeS ───────────────────────────────────────────────────────────
            ("kuhes", "KHS2024001"): StudentEligibilityRecord(
                institution_code="kuhes",
                student_id="KHS2024001",
                full_name="Precious Kachingwe",
                photo_reference=None,
                programme="Bachelor of Medicine and Surgery",
                academic_year="Year 3",
                enrollment_status="Active",
                is_eligible_for_credential=True,
                is_simulation=True,
            ),
            ("kuhes", "MED/2024/001"): StudentEligibilityRecord(
                institution_code="kuhes",
                student_id="MED/2024/001",
                full_name="Tadala Msiska",
                photo_reference=None,
                programme="BSc Nursing",
                academic_year="Year 2",
                enrollment_status="Active",
                is_eligible_for_credential=True,
                is_simulation=True,
            ),
            # ── MZUNI ───────────────────────────────────────────────────────────
            ("mzuni", "MZ2024001"): StudentEligibilityRecord(
                institution_code="mzuni",
                student_id="MZ2024001",
                full_name="Fainess Nkhata",
                photo_reference=None,
                programme="Bachelor of Education",
                academic_year="Year 2",
                enrollment_status="Active",
                is_eligible_for_credential=True,
                is_simulation=True,
            ),
            ("mzuni", "MZU/2024/001"): StudentEligibilityRecord(
                institution_code="mzuni",
                student_id="MZU/2024/001",
                full_name="Blessings Tembo",
                photo_reference=None,
                programme="BSc Information Technology",
                academic_year="Year 1",
                enrollment_status="Active",
                is_eligible_for_credential=True,
                is_simulation=True,
            ),
            # ── Legacy demo institutions ─────────────────────────────────────────
            ("nsial-demo", "DEMO/2026/001"): StudentEligibilityRecord(
                institution_code="nsial-demo",
                student_id="DEMO/2026/001",
                full_name="Amina Example",
                photo_reference="https://images.unsplash.com/photo-1534528741775-53994a69daeb",
                programme="Diploma in Information Technology (Demo)",
                academic_year="Year 2",
                enrollment_status="Active",
                is_eligible_for_credential=True,
                is_simulation=True,
            ),
            ("nsial-demo", "DEMO/2026/0101"): StudentEligibilityRecord(
                institution_code="nsial-demo",
                student_id="DEMO/2026/0101",
                full_name="Davie Banda",
                photo_reference="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
                programme="Diploma in Information Technology (Demo)",
                academic_year="Year 1",
                enrollment_status="Active",
                is_eligible_for_credential=True,
                is_simulation=True,
            ),
            ("nsial-demo", "DEMO/2026/0102"): StudentEligibilityRecord(
                institution_code="nsial-demo",
                student_id="DEMO/2026/0102",
                full_name="Grace Chawinga",
                photo_reference="https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
                programme="Diploma in Agricultural Systems (Demo)",
                academic_year="Year 2",
                enrollment_status="Suspended",
                is_eligible_for_credential=False,
                is_simulation=True,
            ),
            ("afi-demo", "AFI/2026/001"): StudentEligibilityRecord(
                institution_code="afi-demo",
                student_id="AFI/2026/001",
                full_name="Alice Test",
                photo_reference=None,
                programme="Alpha Programme",
                academic_year="2026",
                enrollment_status="Active",
                is_eligible_for_credential=True,
                is_simulation=True,
            ),
            ("afi-demo", "AFI/2026/002"): StudentEligibilityRecord(
                institution_code="afi-demo",
                student_id="AFI/2026/002",
                full_name="Bob Suspended",
                photo_reference=None,
                programme="Alpha Programme",
                academic_year="2026",
                enrollment_status="Suspended",
                is_eligible_for_credential=False,
                is_simulation=True,
            ),
        }

    def _build_fallback_record(self, institution_code: str, student_id: str) -> Optional[StudentEligibilityRecord]:
        """
        Build a synthetic active record for any structurally valid registration number
        against a known partner institution. Used when no explicit fixture exists.
        Returns None only if the reg number is clearly malformed (< 4 chars, no digit, etc.).
        """
        code_lower = institution_code.lower()
        defaults = _INSTITUTION_DEFAULTS.get(code_lower)

        if defaults is None:
            # Unknown institution — no fallback
            return None

        # Minimum validity: at least 4 chars with at least one digit
        if not _GENERIC_VALID_REG.match(student_id.strip()):
            return None

        import hashlib
        # Pick a deterministic programme based on the student_id hash
        programmes = defaults["programmes"]
        idx = int(hashlib.md5(student_id.encode()).hexdigest(), 16) % len(programmes)
        programme = programmes[idx]

        year_digits = re.findall(r"\d+", student_id)
        academic_year = f"Year {(int(year_digits[-1]) % 4) + 1}" if year_digits else "Year 1"

        return StudentEligibilityRecord(
            institution_code=code_lower,
            student_id=student_id.strip(),
            full_name="Registered Student",
            photo_reference=None,
            programme=programme,
            academic_year=academic_year,
            enrollment_status="Active",
            is_eligible_for_credential=True,
            is_simulation=True,
        )

    def fetch_student_eligibility(self, institution_code: str, student_id: str) -> Optional[StudentEligibilityRecord]:
        # Exact fixtures model the only records that a simulated upstream SIS
        # has authoritatively returned. A syntactically plausible ID is not
        # proof of enrollment and must not create a verified membership.
        return self._fixtures.get((institution_code.lower(), student_id.strip()))

    def verify_student_status(self, institution_code: str, student_id: str) -> bool:
        record = self.fetch_student_eligibility(institution_code, student_id)
        return record is not None and record.enrollment_status.lower() == "active"
