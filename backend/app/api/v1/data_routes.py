from fastapi import APIRouter, Depends, HTTPException, status
from app.models.user import UserResponse,UserCreate, UserLogin, Token, UserInDB
from app.middleware.auth import get_current_user
import logging
from typing import List
from app.models.task_models import TaskManHoursModel
from app.models.estimates import Estimate, EstimateRequest, EstimateResponse,SparePart
from app.services.task_analytics_service import TaskService
from app.log.logs import logger
# logger = logging.getLogger(__name__)

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
@router.get("/estimates/", response_model=List[Estimate])
async def get_all_estimates(
    current_user: dict = Depends(get_current_user),
    task_service: TaskService = Depends()
):
    return await task_service.get_all_estimates()

@router.get("/spare_parts/{task_id}", response_model=List[SparePart])
async def get_spare_parts(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    task_service: TaskService = Depends()
):
    """
    Get spare parts for a specific task.
    """
    return await task_service.get_spare_parts(task_id)


@router.get("/api/v1/parts/usage")

async def get_parts_usage(
    part_id: str,start_date: str, end_date: str,
    current_user: dict = Depends(get_current_user),
    task_service: TaskService = Depends()
):
    """
    Get  parts usage for a part_id.
    """
    parts_usage=await task_service.get_parts_usage(part_id,start_date,end_date)
    logging.info("Parts usage data: %s", parts_usage)
    return parts_usage

@router.get("/api/v1/skills/analysis")

async def get_parts_usage(
    Source_Tasks: List,
    current_user: dict = Depends(get_current_user),
    task_service: TaskService = Depends()
):
    """
    Get  parts usage for a part_id.
    """
    skills_analysis=await task_service.get_skills_analysis(Source_Tasks)
    logging.info("skills analysis data: %s", skills_analysis)
    return skills_analysis



@router.post("/estimates/", response_model=EstimateResponse, status_code=201)
async def create_estimate(
    estimate_request: EstimateRequest,
     current_user: dict = Depends(get_current_user),
    task_service: TaskService = Depends()
):
    return await task_service.create_estimate(estimate_request)