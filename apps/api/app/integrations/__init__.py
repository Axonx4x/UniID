"""Integration package providing explicit adapter interfaces for university SIS and payment systems."""
from app.integrations.university import (
    UniversityIntegrationAdapter,
    SimulatedUniversityAdapter,
    StudentEligibilityRecord,
)
from app.integrations.payment import (
    PaymentIntegrationAdapter,
    SimulatedPaymentAdapter,
    PaymentTransactionRecord,
)

__all__ = [
    "UniversityIntegrationAdapter",
    "SimulatedUniversityAdapter",
    "StudentEligibilityRecord",
    "PaymentIntegrationAdapter",
    "SimulatedPaymentAdapter",
    "PaymentTransactionRecord",
]
