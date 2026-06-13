from pydantic_settings import BaseSettings, SettingsConfigDict
from app.core.logger import logger

class Settings(BaseSettings):
    DB_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    META_APP_ID: str
    META_APP_SECRET: str
    META_REDIRECT_URI: str
    TOKEN_ENCRYPTION_KEY: str
    META_GRAPH_API_VERSION: str
    REDIS_URL: str
    GEMINI_API_KEY: str
    BRIGHT_DATA_API_KEY: str = ""
    AI_MODEL_FLASH: str = "gemini-1.5-flash"
    AI_MODEL_PRO: str = "gemini-1.5-pro"
    AI_SIMULATION_MODE: bool = False

    model_config= SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        str_strip_whitespace=True
    )



try:
    settings= Settings()
    logger.info("env validated")

except Exception as e:
    logger.error(str(e))