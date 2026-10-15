"""Application configuration settings validated using Pydantic Settings."""

import json
from typing import List, Union
from pydantic import Field, field_validator
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

    def safe_summary(self) -> dict:
        """Returns a non-sensitive summary of settings for startup logging."""
        return {
            "project_name": self.PROJECT_NAME,
            "environment": self.ENVIRONMENT,
            "api_v1_str": self.API_V1_STR,
            "simulation_mode": self.SIMULATION_MODE,
            "log_level": self.LOG_LEVEL,
            "cors_origins": self.BACKEND_CORS_ORIGINS,
            "db_host": self.POSTGRES_HOST,
            "db_port": self.POSTGRES_PORT,
            "db_name": self.POSTGRES_DB,
            "db_user": self.POSTGRES_USER,
        }


settings = Settings()
