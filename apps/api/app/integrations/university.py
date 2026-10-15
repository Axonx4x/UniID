"""Explicit adapter interface and simulation implementation for university SIS integrations."""

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


class SimulatedUniversityAdapter(UniversityIntegrationAdapter):
    """
    Simulated implementation of UniversityIntegrationAdapter for demonstration and development.
    Provides synthetic student records without requiring direct SIS integration.
    """

    def __init__(self):
        # Synthetic fixture dataset for demonstration personas
        self._fixtures = {
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
        }

    def fetch_student_eligibility(self, institution_code: str, student_id: str) -> Optional[StudentEligibilityRecord]:
        return self._fixtures.get((institution_code.lower(), student_id.strip()))

    def verify_student_status(self, institution_code: str, student_id: str) -> bool:
        record = self.fetch_student_eligibility(institution_code, student_id)
        return record is not None and record.enrollment_status.lower() == "active"
