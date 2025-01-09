from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from app.models.user import UserCreate,UserResponse,Token
from app.middleware.auth import hash_password,verify_password,get_current_user
from app.db.database_connection import users_collection
from app.pyjwt.jwt import create_access_token
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate):
    if users_collection.find_one({"$or": [
        {"username": user.username}, 
        {"email": user.email}
    ]}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    
    hashed_password = hash_password(user.password)
    user_dict = {
        "username": user.username,
        "email": user.email,
        "hashed_password": hashed_password,
         "created_at": datetime.utcnow(),
        "is_active": True
    }
    
    result = users_collection.insert_one(user_dict)
    
    return {
        "id": str(result.inserted_id),
        "username": user.username,
        "email": user.email,
        "created_at": user_dict["created_at"]
    }

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = users_collection.find_one({"username": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    access_token = create_access_token(
        data={"sub": user["username"]},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}
