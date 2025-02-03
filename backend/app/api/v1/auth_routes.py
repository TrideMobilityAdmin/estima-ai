from fastapi import APIRouter, HTTPException, status, Depends,Response
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from app.models.user import UserCreate,UserResponse,Token,UserLogin
from app.middleware.auth import hash_password,verify_password,get_current_user
from app.db.database_connection import users_collection
from app.pyjwt.jwt import create_access_token
from app.config.config import settings

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
async def User_register(user: UserCreate):
    existing_user = users_collection.find_one({
        "$or": [{"username": user.username}, {"email": user.email}]
    })
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username or email already registered"
        )
    
    hashed_password = hash_password(user.password)
    user_dict = {
        "username": user.username,
        "email": user.email,
        "password": hashed_password,
         "createAt": datetime.utcnow(),
        "is_active": True
    }
    
    result = users_collection.insert_one(user_dict)
    
    return {
        "id": str(result.inserted_id),
        "username": user.username,
        "email": user.email,
        "createAt": user_dict["createAt"]
    }

@router.post("/login", response_model=Token)
async def User_login(user: UserLogin):
    user_found = users_collection.find_one({"username": user.username})
    if not user_found or not verify_password(user.password, user_found["password"]):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password"
        )
    
    access_token = create_access_token(
        data={"sub": user_found["username"]},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}
@router.post("/logout")
async def User_logout(response: Response, current_user: dict = Depends(get_current_user)):
    """
    User logout endpoint that invalidates the JWT token
    """
    try:
        # Clear the token cookie if using cookies
        response.delete_cookie(key="access_token")
        return {"message": "Logout successful"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error during logout"
        )