from pydantic import BaseSettings


class Settings(BaseSettings):
    AZURE_AI_ENDPOINT: str
    AZURE_AI_KEY: str
    AZURE_AI_MODEL: str = "Kimi-K2.5"
    ALLOWED_ORIGINS: str = "http://localhost:8000,http://127.0.0.1:8000"
    MAX_UPLOAD_SIZE_MB: int = 10
    MAX_CUSTOM_TEXT_CHARS: int = 50000

    class Config:
        env_file = ".env"


settings = Settings()
