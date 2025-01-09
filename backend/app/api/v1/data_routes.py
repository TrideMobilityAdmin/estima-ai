from fastapi import APIRouter, Depends, HTTPException, status
from app.models.user import UserResponse,UserCreate, UserLogin, Token, UserInDB
from app.middleware.auth import get_current_user
router = APIRouter(prefix="/users", tags=["users"])

@router.get("/auth", response_model=UserResponse)
async def auth(current_user: dict = Depends(get_current_user)):
    return {
        "id": str(current_user["_id"]),
        "username": current_user["username"],
        "email": current_user["email"],
        "createAt": current_user["createAt"]
    }