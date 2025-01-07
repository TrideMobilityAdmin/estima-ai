from fastapi import APIRouter, Depends, HTTPException
from app.services.task_analytics_service import TaskAnalyticsService
from app.models.task_models import TaskProbabilityModel, TaskManHoursModel, SparePartsModel
from app.core.dependencies import get_task_service, get_current_user
from app.models.user import UserCreate, UserLogin, Token, UserInDB
from app.core.auth import hash_password, verify_password, create_access_token
from app.utils.database_connection import DatabaseConnection
from typing import List

# Initialize database connection
db = DatabaseConnection()

# Create API router
router = APIRouter()


@router.get("/")
async def home():
    """
    Root endpoint to indicate the service is running.
    """
    return {"message": "This page is under development!"}


# Task Analytics Endpoints
@router.get("/analytics/task_probability/{source_task}", response_model=TaskProbabilityModel)
def task_probability(source_task: str, service: TaskAnalyticsService = Depends(get_task_service)):
    """
    Fetch task probabilities for the given source task.
    """
    return service.get_task_probability(source_task)


@router.get("/estimation/task_man_hours/{source_task}", response_model=TaskManHoursModel)
def task_man_hours(source_task: str, service: TaskAnalyticsService = Depends(get_task_service)):
    """
    Fetch task man-hours estimation for the given source task.
    """
    return service.get_task_man_hours(source_task)


@router.get("/estimation/spare_parts/{source_task}", response_model=SparePartsModel)
def spare_parts(source_task: str, service: TaskAnalyticsService = Depends(get_task_service)):
    """
    Fetch spare parts estimation for the given source task.
    """
    return service.get_spare_parts(source_task)


# User Authentication Endpoints
@router.post("/register", response_model=UserCreate)
async def register_user(user: UserCreate):
    """
    Register a new user.
    """
    user_collection = db.get_collection("gmr-mro", "users")
    existing_user = user_collection.find_one({"username": user.username})

    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    hashed_password = hash_password(user.password)
    user_collection.insert_one({
        "username": user.username,
        "email": user.email,
        "password": hashed_password
    })

    return user


@router.post("/login", response_model=Token)
async def login(user: UserLogin):
    """
    Authenticate user and return a JWT token.
    """
    user_collection = db.get_collection("gmr-mro", "users")
    db_user = user_collection.find_one({"username": user.username})

    if not db_user or not verify_password(user.password, db_user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/protected")
async def get_protected_data(current_user: UserInDB = Depends(get_current_user)):
    """
    Example of a protected route requiring authentication.
    """
    return {"message": f"Hello {current_user.username}, you have access!"}
