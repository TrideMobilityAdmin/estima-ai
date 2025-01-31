from fastapi import APIRouter, HTTPException, status, Depends,Response
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from app.models.user import UserCreate,UserResponse,Token,UserLogin
from app.middleware.auth import hash_password,verify_password,get_current_user
from app.db.database_connection import users_collection,user_login_collection
from app.pyjwt.jwt import create_access_token
from app.config.config import settings
from app.log.logs import logger

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
        "createdAt": datetime.utcnow(),
        "isActive": True
    }
    
    result = users_collection.insert_one(user_dict)
    
    return {
        "id": str(result.inserted_id),
        "username": user.username,
        "email": user.email,
        "createdAt": user_dict["createdAt"]
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
    
    login_history = {
        "userID": str(user_found["_id"]),
        "login": datetime.utcnow(),
        "logout": "",
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
        "createdBy": str(user_found["_id"]),
        "updatedBy": str(user_found["_id"])
    }
    user_login_collection.insert_one(login_history)

    return {
        "accessToken": access_token,
        "tokenType": "bearer",
        "userID": str(user_found["_id"]),
        "username": user_found["username"],
        "email": user_found["email"]
    }
@router.post("/logout")
async def User_logout(response: Response, current_user: dict = Depends(get_current_user)):
    try:
        current_time = datetime.utcnow()
        
        # Find the most recent login record for this user
        latest_login = user_login_collection.find_one(
            {"userID": str(current_user["_id"]), "logout": ""},
            sort=[("createdAt", -1)]
        )
        
        if latest_login:
            # Update the logout time
            update_result=user_login_collection.update_one(
                {"_id": latest_login["_id"]},
                {
                    "$set": {
                        "logout": current_time,
                        "updatedAt": current_time,
                        "updatedBy": str(current_user["_id"])
                    }
                }
            )
            if update_result.modified_count == 1:
                return {"message": "User logged out successfully"}
            else:
                raise HTTPException(status_code=500, detail="Failed to update logout time")
        else:
            raise HTTPException(status_code=404, detail="Login record not found")
        
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error during logout"
        )