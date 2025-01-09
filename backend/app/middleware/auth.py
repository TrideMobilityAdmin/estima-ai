from fastapi import HTTPException,Depends
from app.pyjwt.jwt import verify_token
from fastapi.security import OAuth2PasswordBearer
import bcrypt
from app.db.database_connection import users_collection

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def hash_password(password: str) -> str:
    hashed= bcrypt.hashpw(password.encode(), bcrypt.gensalt())
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())

async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = verify_token(token)
    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = users_collection.find_one({"username": username})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user