from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All configuration comes from environment variables (or a local .env file)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    cors_origins: list[str] = ["http://localhost:5173"]
    ip_hash_salt: str
    trust_proxy_headers: bool = False
    # Number of trusted proxies in front of the app (each appends one X-Forwarded-For entry).
    trusted_proxy_hops: int = Field(default=1, ge=1)
    contact_limit_per_hour: int = 5


@lru_cache
def get_settings() -> Settings:
    return Settings()
