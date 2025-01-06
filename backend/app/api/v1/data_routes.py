from fastapi import APIRouter, Depends
from app.services.task_analytics_service import TaskAnalyticsService
from app.models.task_models import TaskProbabilityModel, TaskManHoursModel, SparePartsModel
from app.core.dependencies import get_task_service
from fastapi import APIRouter, Depends, HTTPException
from models.user import UserCreate, UserLogin, Token
from core.auth import hash_password, verify_password, create_access_token
from core.dependencies import get_current_user
from typing import List

# Simulating a database with in-memory storage
fake_users_db = {}
router = APIRouter()

@router.get("/analytics/task_probability/{source_task}", response_model=TaskProbabilityModel)
def task_probability(source_task: str, service: TaskAnalyticsService = Depends(get_task_service)):
    return service.get_task_probability(source_task)

@router.get("/estimation/task_man_hours/{source_task}", response_model=TaskManHoursModel)
def task_man_hours(source_task: str, service: TaskAnalyticsService = Depends(get_task_service)):
    return service.get_task_man_hours(source_task)

@router.get("/estimation/spare_parts/{source_task}", response_model=SparePartsModel)
def spare_parts(source_task: str, service: TaskAnalyticsService = Depends(get_task_service)):
    return service.get_spare_parts(source_task)

# Register new user
@router.post("/register", response_model=UserCreate)
async def register_user(user: UserCreate):
    if user.username in fake_users_db:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = hash_password(user.password)
    fake_users_db[user.username] = {"username": user.username, "email": user.email, "password": hashed_password}
    
    return user

# Login to get token
@router.post("/login", response_model=Token)
async def login(user: UserLogin):
    db_user = fake_users_db.get(user.username)
    if db_user is None or not verify_password(user.password, db_user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

# Protected route example
@router.get("/protected")
async def get_protected_data(current_user: UserInDB = Depends(get_current_user)):
    return {"message": f"Hello {current_user.username}, you have access!"}
