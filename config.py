import uuid

from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    AZURE_AI_ENDPOINT: str
    AZURE_AI_KEY: str
    AZURE_AI_MODEL: str = "Kimi-K2.5"
    API_KEY: str = Field(default_factory=lambda: str(uuid.uuid4()), env="AUDITOR_API_KEY")
    ALLOWED_ORIGINS: str = "https://ed100084.github.io,http://localhost:8000"
    MAX_UPLOAD_SIZE_MB: int = 10
    MAX_CUSTOM_TEXT_CHARS: int = 50000

    class Config:
        env_file = ".env"


settings = Settings()
