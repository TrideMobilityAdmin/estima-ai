import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv  # Correct import for python-dotenv

# Load environment variables from a .env file
load_dotenv()

class Settings(BaseSettings):
    SECRET_KEY: str = os.getenv("SECRET_KEY")  # Optional default
    DATABASE_URL: str = os.getenv("DATABASE_URL")  # Optional default
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 24*60

# Instantiate settings
settings = Settings()

