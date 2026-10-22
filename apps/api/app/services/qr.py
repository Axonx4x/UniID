"""Cryptographic QR generation and canonical verification URL helpers."""

import io
import segno

from app.core.config import settings


def build_verification_url(reference: str) -> str:
    """Returns the canonical public verification URL for a given opaque reference."""
    base = settings.VERIFICATION_BASE_URL.rstrip("/")
    return f"{base}/{reference}"


def generate_qr_data_url(reference: str) -> str:
    """Generates an SVG Data URI encoding ONLY the canonical public verification URL."""
    url = build_verification_url(reference)
    qr = segno.make(url, error="M")
    return qr.svg_data_uri(scale=5, light="white", dark="#0f172a")


def generate_qr_svg_bytes(reference: str) -> bytes:
    """Generates standalone SVG bytes encoding ONLY the canonical verification URL."""
    url = build_verification_url(reference)
    qr = segno.make(url, error="M")
    buffer = io.BytesIO()
    qr.save(buffer, kind="svg", scale=5, light="white", dark="#0f172a")
    return buffer.getvalue()
