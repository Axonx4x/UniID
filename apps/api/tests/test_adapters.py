"""Tests for simulation adapters and integration contracts."""

from app.integrations.university import SimulatedUniversityAdapter
from app.integrations.payment import SimulatedPaymentAdapter


def test_simulated_university_adapter():
    adapter = SimulatedUniversityAdapter()

    # Active student
    record = adapter.fetch_student_eligibility("luanar", "LCC/2024/0101")
    assert record is not None
    assert record.full_name == "Chikondi Phiri"
    assert record.is_eligible_for_credential is True
    assert record.is_simulation is True
    assert adapter.verify_student_status("luanar", "LCC/2024/0101") is True

    # Suspended student
    suspended = adapter.fetch_student_eligibility("luanar", "LCC/2024/0103")
    assert suspended is not None
    assert suspended.enrollment_status == "Suspended"
    assert suspended.is_eligible_for_credential is False
    assert adapter.verify_student_status("luanar", "LCC/2024/0103") is False

    # Unknown student
    unknown = adapter.fetch_student_eligibility("luanar", "NONEXISTENT")
    assert unknown is None
    assert adapter.verify_student_status("luanar", "NONEXISTENT") is False


def test_simulated_payment_adapter():
    adapter = SimulatedPaymentAdapter()
    tx = adapter.initiate_fee_payment(
        institution_code="luanar",
        student_id="LCC/2024/0101",
        amount_mwk=15000.0,
        purpose="Annual Digital ID Card Fee",
    )

    assert tx.transaction_id.startswith("SIM-PAY-")
    assert tx.status == "PAID"
    assert tx.amount_mwk == 15000.0
    assert tx.is_simulation is True

    # Lookup
    verified = adapter.verify_payment_status(tx.transaction_id)
    assert verified is not None
    assert verified.transaction_id == tx.transaction_id
