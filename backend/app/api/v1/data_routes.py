import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from pydantic import ValidationError
from pymongo.errors import OperationFailure, DuplicateKeyError
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.services.task_analytics_service import TaskAnalyticsService
from app.models.task_models import TaskProbabilityModel, TaskManHoursModel, SparePartsModel
from app.models.user import UserCreate, UserLogin, Token, UserInDB
from app.core.dependencies import get_task_service, get_current_user,validate_permissions
from app.utils.database_connection import DatabaseConnection
from app.core.config import Settings
from app.core.auth import auth_handler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer()
# Initialize database connection and router
db = DatabaseConnection()
router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Custom error responses
ERROR_RESPONSES = {
    400: {"description": "Bad Request"},
    401: {"description": "Unauthorized"},
    403: {"description": "Forbidden"},
    404: {"description": "Not Found"},
    500: {"description": "Internal Server Error"}
}

async def validate_source_task(source_task: str) -> str:
    """Validate source task parameter."""
    if not source_task or not isinstance(source_task, str):
        logger.error(f"Invalid source_task parameter: {source_task}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid source task parameter"
        )
    return source_task

# Task Analytics Endpoints
@router.get(
    "/analytics/findings/{source_task}",
    response_model=TaskProbabilityModel,
    responses=ERROR_RESPONSES,
    tags=["Analytics"]
)
async def task_probability(
    source_task: str = Depends(validate_source_task),
    service: TaskAnalyticsService = Depends(get_task_service),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Fetch task probabilities for the given source task.
    
    Args:
        source_task: Source task identifier
        service: Task analytics service instance
        current_user: Authenticated user
        
    Returns:
        TaskProbabilityModel: Task probability data
    """
    try:
        logger.info(f"Fetching findings for source_task: {source_task}, user: {current_user.username}")
        return service.get_findings(source_task)
    except Exception as e:
        logger.error(f"Error fetching findings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching task findings"
        )

@router.get(
    "/estimation/man_hours/{source_task}",
    response_model=TaskManHoursModel,
    responses=ERROR_RESPONSES,
    tags=["Estimation"]
)
async def task_man_hours(
    source_task: str = Depends(validate_source_task),
    service: TaskAnalyticsService = Depends(get_task_service),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Fetch task man-hours estimation for the given source task.
    
    Args:
        source_task: Source task identifier
        service: Task analytics service instance
        current_user: Authenticated user
        
    Returns:
        TaskManHoursModel: Man hours estimation data
    """
    try:
        logger.info(f"Fetching man hours for source_task: {source_task}, user: {current_user.username}")
        return service.get_man_hours(source_task)
    except Exception as e:
        logger.error(f"Error fetching man hours: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching man hours estimation"
        )

@router.get(
    "/estimation/spare_parts/{source_task}",
    response_model=SparePartsModel,
    responses=ERROR_RESPONSES,
    tags=["Estimation"]
)
async def spare_parts(
    source_task: str = Depends(validate_source_task),
    service: TaskAnalyticsService = Depends(get_task_service),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Fetch spare parts estimation for the given source task.
    
    Args:
        source_task: Source task identifier
        service: Task analytics service instance
        current_user: Authenticated user
        
    Returns:
        SparePartsModel: Spare parts estimation data
    """
    try:
        logger.info(f"Fetching spare parts for source_task: {source_task}, user: {current_user.username}")
        return service.get_spare_parts(source_task)
    except Exception as e:
        logger.error(f"Error fetching spare parts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching spare parts estimation"
        )

# User Authentication Endpoints
@router.post(
    "/register",
    response_model=UserCreate,
    responses=ERROR_RESPONSES,
    tags=["Authentication"]
)
async def register_user(user: UserCreate):
    """
    Register a new user.
    
    Args:
        user: User creation data
        
    Returns:
        UserCreate: Created user data
    """
    try:
        logger.info(f"Registering new user: {user.username}")
        user_collection = db.get_collection("gmr-mro", "users")

        # Check for existing user
        existing_user = user_collection.find_one({"username": user.username})
        if existing_user:
            logger.warning(f"Username already exists: {user.username}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )

        # Check for existing email
        existing_email = user_collection.find_one({"email": user.email})
        if existing_email:
            logger.warning(f"Email already exists: {user.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Hash password and create user
        hashed_password = hash_password(user.password)
        user_dict = user.dict()
        user_dict["password"] = hashed_password

        # Create user with unique indexes
        user_collection.create_index("username", unique=True)
        user_collection.create_index("email", unique=True)
        user_collection.insert_one(user_dict)

        logger.info(f"Successfully registered user: {user.username}")
        return user

    except DuplicateKeyError as e:
        logger.error(f"Duplicate key error during registration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already exists"
        )
    except Exception as e:
        logger.error(f"Error during user registration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error during registration"
        )

@router.post(
    "/login",
    response_model=Token,
    responses=ERROR_RESPONSES,
    tags=["Authentication"]
)
async def login(user: UserLogin):
    """
    Authenticate user and return a JWT token.
    
    Args:
        user: User login credentials
        
    Returns:
        Token: JWT access token
    """
    try:
        logger.info(f"Login attempt for user: {user.username}")
        user_collection = db.get_collection("gmr-mro", "users")
        db_user = user_collection.find_one({"username": user.username})

        if not db_user or not auth_handler.verify_password(user.password, db_user['password']):
            logger.warning(f"Invalid login attempt for user: {user.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        access_token = auth_handler.create_access_token(data={"sub": user.username})
        logger.info(f"Successful login for user: {user.username}")
        return {"access_token": access_token, "token_type": "bearer"}

    except JWTError as e:
        logger.error(f"JWT error during login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not create access token"
        )
    except Exception as e:
        logger.error(f"Error during login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error during login"
        )
@router.get(
    "/protected",dependencies=[Depends(validate_permissions(["read:items"]))],
    responses=ERROR_RESPONSES,
    tags=["Protected"]
)
async def get_protected_data(current_user: UserInDB = Depends(get_current_user)):
    """
    Protected route requiring authentication.
    
    Args:
        current_user: Authenticated user
        
    Returns:
        dict: Protected data
    """
    try:
        logger.info(f"Accessing protected route: user={current_user.username}")
        return {
            "message": f"Hello {current_user.username}, you have access!",
            "user_id": str(current_user.id)
        }
    except Exception as e:
        logger.error(f"Error accessing protected route: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error accessing protected data"
        )