from pydantic_settings import BaseSettings, SettingsConfigDict
from app.core.logger import logger

class Settings(BaseSettings):
    APP_ENV: str = "development"
    FRONTEND_URL: str = "http://localhost:3000"
    # Comma-separated allowed browser origins (e.g. https://app.vercel.app). Falls back to FRONTEND_URL.
    CORS_ORIGINS: str = ""
    RUN_MIGRATIONS_ON_STARTUP: bool = True

    DB_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    IG_APP_ID: str
    IG_APP_SECRET: str
    IG_REDIRECT_URI: str
    TOKEN_ENCRYPTION_KEY: str
    REDIS_URL: str
    GEMINI_API_KEY: str
    BRIGHT_DATA_API_KEY: str = ""
    ASSEMBLYAI_API_KEY: str = ""
    AI_MODEL_FLASH: str = "gemini-2.5-flash"
    AI_MODEL_PRO: str = "gemini-2.5-flash"
    AI_SIMULATION_MODE: bool = False
    # Free-tier guard: cap Gemini calls/day so report generation can finish on real API.
    GEMINI_DAILY_BUDGET: int = 20
    GEMINI_REPORT_RESERVE: int = 1
    # Free-tier per-minute request limit for flash (5 rpm). Report generation paces calls to stay under it.
    GEMINI_MAX_RPM: int = 5
    # Max videos analyzed per report run (each = 1 Gemini call). Defaults fit free tier (~20/day).
    REPORT_MAX_OWN_VIDEOS: int = 2
    REPORT_MAX_COMPETITOR_VIDEOS: int = 3

    # HTTP rate limiting (slowapi + Redis). See app/core/rate_limit.py.
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_STORAGE: str = "redis"  # "redis" | "memory" (memory for local tests only)
    RATE_LIMIT_AUTH_SIGNUP_PER_HOUR: int = 5
    RATE_LIMIT_AUTH_LOGIN_PER_MINUTE: int = 10
    RATE_LIMIT_AUTH_REFRESH_PER_MINUTE: int = 30
    RATE_LIMIT_JOB_TRIGGERS_PER_HOUR: int = 15
    RATE_LIMIT_AI_TRIGGERS_PER_HOUR: int = 10

    model_config= SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        str_strip_whitespace=True
    )

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.strip().lower() == "production"

    def cors_origin_list(self) -> list[str]:
        origins: list[str] = []
        if self.CORS_ORIGINS.strip():
            origins = [o.strip().rstrip("/") for o in self.CORS_ORIGINS.split(",") if o.strip()]
        elif self.FRONTEND_URL.strip():
            origins = [self.FRONTEND_URL.strip().rstrip("/")]

        if not self.is_production:
            for local in ("http://localhost:3000", "http://127.0.0.1:3000"):
                if local not in origins:
                    origins.append(local)
        return origins


try:
    settings= Settings()
    logger.info("env validated")
    from app.core.db_url import describe_db_target
    logger.info("DB connection target: %s", describe_db_target(settings.DB_URL))

except Exception as e:
    logger.error(str(e))