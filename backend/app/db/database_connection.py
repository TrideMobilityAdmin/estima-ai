from pymongo import MongoClient
from app.config.config import settings

class MongoDBClient:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.client = MongoClient(settings.DATABASE_URL)
            cls._instance.db = cls._instance.client[settings.DB_NAME]
        return cls._instance

    def get_collection(self, collection_name):
        return self.db[collection_name]

# Usage
mongo_client = MongoDBClient()
users_collection = mongo_client.get_collection("users")
user_login_collection=mongo_client.get_collection("userlogin")

