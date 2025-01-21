from fastapi import APIRouter, Depends, HTTPException, status
from app.models.user import UserResponse,UserCreate, UserLogin, Token, UserInDB
from app.middleware.auth import get_current_user
import logging
from app.models.task_models import TaskManHoursModel
from app.services.task_analytics_service import TaskService
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["API's"])

@router.get("/auth", response_model=UserResponse)
async def auth(current_user: dict = Depends(get_current_user)):
    return {
        "id": str(current_user["_id"]),
        "username": current_user["username"],
        "email": current_user["email"],
        "createAt": current_user["createAt"]
    }

@router.get(
    "/estimation/man_hours/{source_task}",
    response_model=TaskManHoursModel,
    responses={
        404: {"description": "Source task not found"},
        500: {"description": "Internal server error"}
    }
)
async def get_task_man_hours(
    source_task: str,
    current_user: dict = Depends(get_current_user)
) -> TaskManHoursModel:
    """
    Get man hours estimation for a specific source task.
    """
    try:
        task_service = TaskService()
        result = await task_service.get_man_hours(source_task)
        return result
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )