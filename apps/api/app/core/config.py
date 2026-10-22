"""Application configuration settings validated using Pydantic Settings."""

import json
from typing import List, Literal, Union
from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # General Project Information
    PROJECT_NAME: str = "AstraMind Digital Student ID"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = Field(default="development", description="development, testing, staging, production")
    LOG_LEVEL: str = Field(default="INFO", description="DEBUG, INFO, WARNING, ERROR, CRITICAL")
    SIMULATION_MODE: bool = Field(default=True, description="Enables explicit simulation mode for institutions and integrations")
    # A separate, opt-in presenter environment.  This is intentionally false
    # by default so synthetic LUANAR data cannot be enabled by a frontend flag.
    UNIID_DEMO_MODE: bool = Field(default=False, description="Enables the LUANAR synthetic end-to-end demo environment")

    # API Binding
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000

    # CORS Configuration
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v_stripped = v.strip()
            if v_stripped.startswith("[") and v_stripped.endswith("]"):
                try:
                    parsed = json.loads(v_stripped)
                    if isinstance(parsed, list):
                        return [str(item) for item in parsed]
                except json.JSONDecodeError:
                    pass
            # Fallback to comma-separated values
            return [i.strip() for i in v_stripped.split(",") if i.strip()]
        elif isinstance(v, list):
            return [str(i) for i in v]
        return ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Database Configuration
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5433
    POSTGRES_USER: str = "astramind"
    POSTGRES_PASSWORD: str = "astramind_dev_secret"
    POSTGRES_DB: str = "astramind_digital_id"
    DATABASE_URL: str | None = None

    # Authentication (development value is intentionally rejected in production)
    SESSION_SECRET: str = "development-only-session-secret-change-me"
    SESSION_COOKIE_NAME: str = "astramind_session"
    SESSION_TTL_MINUTES: int = Field(default=480, ge=5, le=43200)
    LOGIN_RATE_LIMIT_ATTEMPTS: int = Field(default=5, ge=1, le=100)
    LOGIN_RATE_LIMIT_WINDOW_SECONDS: int = Field(default=300, ge=10, le=3600)

    # OTP delivery. Local development defaults to the explicitly labelled
    # simulated mailbox; switch to SMTP before any real-user deployment.
    OTP_DELIVERY_MODE: Literal["smtp", "development"] = "development"
    OTP_DEV_MAILBOX_ENABLED: bool = True
    SMTP_HOST: str | None = None
    SMTP_PORT: int = Field(default=587, ge=1, le=65535)
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM_EMAIL: str | None = None
    SMTP_FROM_NAME: str = "AstraMind Digital ID"
    SMTP_USE_STARTTLS: bool = True
    SMTP_USE_SSL: bool = False
    SMTP_TIMEOUT_SECONDS: int = Field(default=15, ge=1, le=120)

    # Credential lifecycle demo policy. Per-institution policy configuration is future work.
    CREDENTIAL_VALIDITY_DAYS: int = Field(default=365, ge=1, le=3650)

    # Verification Configuration
    VERIFICATION_BASE_URL: str = Field(
        default="http://localhost:5173/verify",
        description="Canonical base URL for public verification",
    )
    VERIFICATION_RATE_LIMIT_ATTEMPTS: int = Field(default=30, ge=1, le=1000)
    VERIFICATION_RATE_LIMIT_WINDOW_SECONDS: int = Field(default=60, ge=1, le=3600)

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: str | None, values) -> str:
        if isinstance(v, str) and v.strip():
            return v.strip()
        data = values.data if hasattr(values, "data") else values
        host = data.get("POSTGRES_HOST", "localhost")
        port = data.get("POSTGRES_PORT", 5433)
        user = data.get("POSTGRES_USER", "astramind")
        pwd = data.get("POSTGRES_PASSWORD", "astramind_dev_secret")
        db = data.get("POSTGRES_DB", "astramind_digital_id")
        return f"postgresql+psycopg://{user}:{pwd}@{host}:{port}/{db}"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @model_validator(mode="after")
    def validate_security_settings(self) -> "Settings":
        if len(self.SESSION_SECRET) < 32:
            raise ValueError("SESSION_SECRET must contain at least 32 characters")
        if self.is_production and self.SESSION_SECRET == "development-only-session-secret-change-me":
            raise ValueError("SESSION_SECRET must be replaced in production")
        if self.is_production and not self.VERIFICATION_BASE_URL.startswith("https://"):
            raise ValueError("VERIFICATION_BASE_URL must use HTTPS in production")
        if self.is_production and self.UNIID_DEMO_MODE:
            raise ValueError("UNIID_DEMO_MODE cannot be enabled in production")
        if self.SMTP_USE_SSL and self.SMTP_USE_STARTTLS:
            raise ValueError("SMTP_USE_SSL and SMTP_USE_STARTTLS cannot both be enabled")
        return self

    def safe_summary(self) -> dict:
        """Returns a non-sensitive summary of settings for startup logging."""
        return {
            "project_name": self.PROJECT_NAME,
            "environment": self.ENVIRONMENT,
            "api_v1_str": self.API_V1_STR,
            "simulation_mode": self.SIMULATION_MODE,
            "uniid_demo_mode": self.UNIID_DEMO_MODE,
            "log_level": self.LOG_LEVEL,
            "cors_origins": self.BACKEND_CORS_ORIGINS,
            "db_host": self.POSTGRES_HOST,
            "db_port": self.POSTGRES_PORT,
            "db_name": self.POSTGRES_DB,
            "db_user": self.POSTGRES_USER,
            "session_cookie_name": self.SESSION_COOKIE_NAME,
            "session_ttl_minutes": self.SESSION_TTL_MINUTES,
            "otp_delivery_mode": self.OTP_DELIVERY_MODE,
            "otp_dev_mailbox_enabled": self.OTP_DEV_MAILBOX_ENABLED,
            "smtp_configured": bool(self.SMTP_HOST and self.SMTP_FROM_EMAIL),
            "verification_base_url": self.VERIFICATION_BASE_URL,
        }


settings = Settings()
