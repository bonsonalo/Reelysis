from pydantic_settings import BaseSettings, SettingsConfigDict
from app.core.logger import logger

class Settings(BaseSettings):
    DB_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    model_config= SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")



try:
    settings= Settings()
    logger.info("env validated")

except Exception as e:
    logger.error(str(e))