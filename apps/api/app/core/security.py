"""Password hashing, opaque session tokens, and login throttling utilities."""

import hashlib
import hmac
import secrets
import threading
import time
from collections import defaultdict, deque

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

from app.core.config import settings

_password_hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)


def normalize_email(email: str) -> str:
    return email.strip().casefold()


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _password_hasher.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def new_session_token() -> str:
    return secrets.token_urlsafe(48)


def hash_session_token(token: str) -> str:
    return hmac.new(settings.SESSION_SECRET.encode(), token.encode(), hashlib.sha256).hexdigest()


class LoginRateLimiter:
    """Process-local throttle. A shared limiter is required before multi-instance deployment."""

    def __init__(self) -> None:
        self._attempts: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def _prune(self, key: str, now: float) -> deque[float]:
        attempts = self._attempts[key]
        cutoff = now - settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS
        while attempts and attempts[0] < cutoff:
            attempts.popleft()
        return attempts

    def is_limited(self, key: str) -> bool:
        with self._lock:
            return len(self._prune(key, time.monotonic())) >= settings.LOGIN_RATE_LIMIT_ATTEMPTS

    def record_failure(self, key: str) -> None:
        with self._lock:
            self._prune(key, time.monotonic()).append(time.monotonic())

    def reset(self, key: str) -> None:
        with self._lock:
            self._attempts.pop(key, None)


login_rate_limiter = LoginRateLimiter()


class VerificationRateLimiter:
    """Sliding window process-local rate limiter for public verification attempts."""

    def __init__(self) -> None:
        self._attempts: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def _prune(self, key: str, now: float) -> deque[float]:
        attempts = self._attempts[key]
        cutoff = now - settings.VERIFICATION_RATE_LIMIT_WINDOW_SECONDS
        while attempts and attempts[0] < cutoff:
            attempts.popleft()
        return attempts

    def is_limited(self, key: str) -> bool:
        with self._lock:
            return len(self._prune(key, time.monotonic())) >= settings.VERIFICATION_RATE_LIMIT_ATTEMPTS

    def record_attempt(self, key: str) -> None:
        with self._lock:
            self._prune(key, time.monotonic()).append(time.monotonic())

    def reset(self, key: str) -> None:
        with self._lock:
            self._attempts.pop(key, None)


verification_rate_limiter = VerificationRateLimiter()
