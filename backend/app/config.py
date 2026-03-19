from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    database_url: str = "sqlite:///./product_tracker.db"
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    frontend_url: str = "http://localhost:5173"
    
    # SMTP Configuration
    smtp_server: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding='utf-8',
        case_sensitive=False
    )

@lru_cache()
def get_settings():
    s = Settings()
    print(f"DEBUG: Configuracion cargada.")
    print(f"DEBUG: DATABASE_URL: {s.database_url}")
    return s

settings = get_settings()
