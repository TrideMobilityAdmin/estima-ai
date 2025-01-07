from fastapi import APIRouter, Depends, HTTPException, status
from app.models.user import UserCreate, UserInDB
from app.services.user.userrepo import UserRepository

router = APIRouter()

@router.post("/", response_model=UserInDB)
def create_user(user: UserCreate, repo: UserRepository = Depends()):
    user_id = repo.create_user(user)
    return UserInDB(**user.dict(), hashed_password=repo.hash_password(user.password))

@router.put("/{user_id}", response_model=UserInDB)
def update_user(user_id: str, user: UserCreate, repo: UserRepository = Depends()):
    if not repo.update_user(user_id, user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserInDB(**user.dict(), hashed_password=repo.hash_password(user.password))