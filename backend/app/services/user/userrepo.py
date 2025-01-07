from typing import Optional
from pymongo import MongoClient
from bson import ObjectId
from app.models.user import UserCreate, UserInDB
from app.utils.database_connection import DatabaseConnection
from datetime import datetime

class UserRepository:
    def __init__(self):
        self.db = DatabaseConnection().get_database()
        self.collection = self.db["user"]

    def create_user(self, user: UserCreate) -> str:
        user_dict = user.dict()
        user_dict["hashed_password"] = hash_password(user.password)
        user_dict["created_at"] = datetime.utcnow()
        user_dict["updated_at"] = datetime.utcnow()
        result = self.collection.insert_one(user_dict)
        return str(result.inserted_id)

    def update_user(self, user_id: str, user: UserCreate) -> bool:
        user_dict = user.dict()
        user_dict["hashed_password"] = hash_password(user.password)
        user_dict["updated_at"] = datetime.utcnow()
        result = self.collection.update_one({"_id": ObjectId(user_id)}, {"$set": user_dict})
        return result.modified_count > 0

def hash_password(password: str) -> str:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return pwd_context.hash(password)