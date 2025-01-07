from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "mongodb://admin:Tride%401234@telematics-mongo1.evrides.in:22022,telematics-mongo2.evrides.in:22022,telematics-mongo3.evrides.in:22022/?authSource=admin&replicaSet=trideRepl")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "gmr-mro")
    DATABASE_PORT: int = int(os.getenv("DATABASE_PORT", 5432))

settings = Settings()