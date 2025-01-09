from pymongo import MongoClient
from app.core.config import settings

client = MongoClient(settings.DATABASE_URL)
db = client[settings.DB_NAME]
users_collection = db["users"]