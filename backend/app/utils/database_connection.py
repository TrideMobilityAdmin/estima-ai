from pymongo import MongoClient
from app.core.config import settings

class DatabaseConnection:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = MongoClient(settings.DATABASE_URL)
        return cls._instance

    def get_database(self):
        return self._instance[settings.DATABASE_NAME]