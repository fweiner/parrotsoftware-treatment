"""Application configuration."""
import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # Supabase
    supabase_url: str
    supabase_secret_key: str

    # OpenAI
    openai_api_key: str

    # Google Cloud
    google_cloud_project: str
    google_application_credentials: str | None = None

    # Resend
    resend_api_key: str

    # Application
    environment: str = "development"
    allowed_origins: str = "http://localhost:3000"

    @property
    def cors_origins(self) -> List[str]:
        """Get CORS origins as a list."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]

    model_config = {
        "env_file": ".env",
        "case_sensitive": False,
    }


# Global settings instance
settings = Settings()
