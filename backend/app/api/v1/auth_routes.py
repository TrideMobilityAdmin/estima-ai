from fastapi import APIRouter, HTTPException, status, Depends,Response
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta,timezone
from app.models.user import UserCreate,UserResponse,Token,UserLogin,PasswordChangeRequest
from app.middleware.auth import hash_password,verify_password,get_current_user,validate_password
from app.db.database_connection import users_collection,user_login_collection
from app.pyjwt.jwt import create_access_token
from app.config.config import settings
from app.log.logs import logger
from bson import ObjectId   

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
    if not validate_password(user.password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 12 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character"
        )

    
    hashed_password = hash_password(user.password)
    user_dict = {
        "username": user.username,
        "email": user.email,
        "password": hashed_password,
        "createdAt": datetime.now(timezone.utc),
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
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    access_token = create_access_token(
        data={"sub": user_found["username"]},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    login_history = {
        "userID": str(user_found["_id"]),
        "login": datetime.now(timezone.utc),
        "logout": "",
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
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
        current_time = datetime.now(timezone.utc)
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
                raise HTTPException(status_code=400, detail="Failed to update logout time")
        else:
            raise HTTPException(status_code=404, detail="Login record not found")
        
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error during logout"
        )
@router.get("/user/{user_id}", response_model=UserResponse)
async def get_user_by_id(user_id: str,current_user: dict = Depends(get_current_user)):
    """
    Get user details by ID
    """
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid ObjectId format")
    user_found = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user_found:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": str(user_found["_id"]),
        "username": user_found["username"],
        "email": user_found["email"],
        "createdAt": user_found.get("createdAt")
    }


@router.post("/change_password", response_model=dict)
async def change_password(
    password_data: PasswordChangeRequest,
    current_user: dict = Depends(get_current_user)
):
    # Check if new_password and confirm_password match
    if password_data.new_password != password_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and confirm password do not match"
        )
    
    # Validate new password strength
    if not validate_password(password_data.new_password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 12 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character"
        )
    
    # Verify old password matches the one in database
    if not verify_password(password_data.old_password, current_user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect old password"
        )
    
    # Hash new password
    hashed_password = hash_password(password_data.new_password)
    
    # Update user record in database
    result = users_collection.update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {
                "password": hashed_password,
                "updatedAt": datetime.now(timezone.utc)
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password"
        )
    
    return {
        "status": "success",
        "message": "Password updated successfully"
    }