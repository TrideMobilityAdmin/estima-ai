from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str ="mongodb://admin:admin%40123@10.100.12.82:27017/"  
    DB_NAME: str = "gmr-mro-staging-5y"
    SECRET_KEY: str = "AIzaSyBtLc5L8WECfgz6i1NzzNU7uFfhIig7DyQ"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 24*60

    class Config:
        env_file = ".env"

settings = Settings()
