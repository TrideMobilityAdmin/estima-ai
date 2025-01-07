from fastapi import APIRouter, Depends, HTTPException, status
from app.models.user import UserCreate, UserLogin, Token, UserInDB
from app.services.user.userrepo import UserRepository
from app.pyjwt.jwt import create_access_token, validate_token
from app.core.dependencies import get_current_user
from typing import List
router = APIRouter()

# Register new user
@router.post("/register", response_model=UserInDB)
async def register_user(user: UserCreate, repo: UserRepository = Depends()):
    existing_user = repo.get_user_by_username(user.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    user_id = repo.create_user(user)
    return UserInDB(**user.dict(), hashed_password=repo.hash_password(user.password))

# Login to get token
@router.post("/login", response_model=Token)
async def login(user: UserLogin, repo: UserRepository = Depends()):
    db_user = repo.get_user_by_username(user.username)
    if db_user is None or not repo.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

# Protected route example
@router.get("/protected")
async def get_protected_data(current_user: UserInDB = Depends(get_current_user)):
    return {"message": f"Hello {current_user.username}, you have access!"}