from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "sqlite:///./product_tracker.db"
    secret_key: str = "dev-secret-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_minutes: int = 10080
    frontend_url: str = "http://localhost:5173"
    environment: str = "development"

    smtp_server: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""

    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_starter: str = ""
    stripe_price_pro: str = ""
    stripe_price_business: str = ""

    rate_limit_login: str = "10/minute"
    rate_limit_signup: str = "5/minute"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        base = self.frontend_url.rstrip("/")
        origins = {base, f"{base}/"}
        if self.environment == "development":
            origins.update(
                {
                    "http://localhost:5173",
                    "http://localhost:5174",
                    "http://127.0.0.1:5173",
                    "http://127.0.0.1:5174",
                }
            )
        return list(origins)

    @property
    def stripe_enabled(self) -> bool:
        return bool(self.stripe_secret_key)


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
