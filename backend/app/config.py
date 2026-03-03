from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+psycopg://postgres:ashish123@localhost:5432/skillnexus"

    # JWT
    SECRET_KEY: str = "skillnexus-dev-secret-key-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Gemini AI
    GEMINI_API_KEY: str = ""

    # App
    APP_NAME: str = "SkillNexus"
    DEBUG: bool = True

    class Config:
        env_file = ".env"
        extra = "allow"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
