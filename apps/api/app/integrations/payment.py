"""Explicit adapter interface and simulation implementation for payment gateway integrations."""

import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field


class PaymentTransactionRecord(BaseModel):
    transaction_id: str = Field(..., description="Unique payment transaction reference")
    institution_code: str = Field(..., description="Institution code identifier")
    student_id: str = Field(..., description="Student registration reference")
    amount_mwk: float = Field(..., description="Amount in Malawian Kwacha (MWK)")
    purpose: str = Field(..., description="Description e.g. 'Digital Student ID Annual Service Fee'")
    status: str = Field(..., description="'PAID', 'PENDING', 'FAILED'")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Explicit UTC timestamp of transaction"
    )
    is_simulation: bool = Field(default=True, description="Flag explicitly declaring synthetic payment")


class PaymentIntegrationAdapter(ABC):
    """Abstract contract for payment gateway integrations (e.g. TNM Mpamba, Airtel Money, Bank)."""

    @abstractmethod
    def initiate_fee_payment(
        self, institution_code: str, student_id: str, amount_mwk: float, purpose: str
    ) -> PaymentTransactionRecord:
        """Initiates a payment request for credential renewal or issuance fee."""
        pass

    @abstractmethod
    def verify_payment_status(self, transaction_id: str) -> Optional[PaymentTransactionRecord]:
        """Checks the settlement status of a specific payment transaction."""
        pass


class SimulatedPaymentAdapter(PaymentIntegrationAdapter):
    """
    Simulated implementation of PaymentIntegrationAdapter.
    Clearly marks transactions as synthetic without moving real funds.
    """

    def __init__(self):
        self._transactions: dict[str, PaymentTransactionRecord] = {}

    def initiate_fee_payment(
        self, institution_code: str, student_id: str, amount_mwk: float, purpose: str
    ) -> PaymentTransactionRecord:
        tx_id = f"SIM-PAY-{uuid.uuid4().hex[:8].upper()}"
        record = PaymentTransactionRecord(
            transaction_id=tx_id,
            institution_code=institution_code,
            student_id=student_id,
            amount_mwk=amount_mwk,
            purpose=purpose,
            status="PAID",  # In simulation mode, immediately mark as paid for demonstration
            is_simulation=True,
        )
        self._transactions[tx_id] = record
        return record

    def verify_payment_status(self, transaction_id: str) -> Optional[PaymentTransactionRecord]:
        return self._transactions.get(transaction_id)
