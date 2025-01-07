import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv  # Correct import for python-dotenv

# Load environment variables from a .env file
load_dotenv()

class Settings(BaseSettings):
    SECRET_KEY: str = os.getenv("SECRET_KEY")  # Optional default
    DATABASE_URL: str = os.getenv("DATABASE_URL")  # Optional default

# Instantiate settings
settings = Settings()

