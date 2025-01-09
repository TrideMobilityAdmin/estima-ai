from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str ="mongodb://admin:Tride%401234@telematics-mongo1.evrides.in:22022,telematics-mongo2.evrides.in:22022,telematics-mongo3.evrides.in:22022/?authSource=admin&replicaSet=trideRepl"  
    DB_NAME: str = "gmr-mro"
    SECRET_KEY: str = "AIzaSyBtLc5L8WECfgz6i1NzzNU7uFfhIig7DyQ"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"

settings = Settings()
