from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    password: bytes
    createdAt: datetime = datetime.utcnow()
    isActive: bool = True

class UserResponse(UserBase):
    id: str
    createdAt: datetime

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    userID: str
    username: str
    email: str
    accessToken: str
    tokenType: str = "bearer"

class TokenData(BaseModel):
    username: Optional[str] = None

