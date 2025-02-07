from fastapi import APIRouter, Depends, HTTPException, status,UploadFile,File
from app.models.user import UserResponse,UserCreate, UserLogin, Token, UserInDB
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from app.middleware.auth import get_current_user
import logging
from typing import List
from app.services.upload_docs import ExcelUploadService
from app.models.task_models import TaskManHoursModel,FindingsManHoursModel
from app.models.estimates import Estimate, EstimateRequest, EstimateResponse,SpareParts,SpareResponse
from app.services.task_analytics_service import TaskService
from app.log.logs import logger
from fastapi.responses import StreamingResponse
from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
# logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["API's"])

# @router.get("/auth", response_model=UserResponse)
# async def auth(current_user: dict = Depends(get_current_user)):
#     return {
#         "id": str(current_user["_id"]),
#         "username": current_user["username"],
#         "email": current_user["email"],
#         "createAt": current_user["createAt"]
#     }

# @router.get(
#     "/estimation/man_hours/{source_task}",
#     response_model=List[FindingsManHoursModel],
#     responses={
#         404: {"description": "Source task not found"},
#         500: {"description": "Internal server error"}
#     }
# )

# async def get_task_man_hours(
#     source_task: str,
#     current_user: dict = Depends(get_current_user)
# ) -> List[FindingsManHoursModel]:
#     """
#     Get man hours estimation for a specific source task.
#     """
#     try:
#         task_service = TaskService()
#         result = await task_service.get_man_hours_findings(source_task)
#         return result
#     except HTTPException as he:
#         raise he
#     except Exception as e:
#         logger.error(f"Error processing request: {str(e)}")
#         raise HTTPException(
#             status_code=500,
#             detail="Internal server error"
#         )
@router.get("/estimates/", response_model=List[Estimate])
async def get_all_estimates(
    current_user: dict = Depends(get_current_user),
    task_service: TaskService = Depends()
):
    return await task_service.get_all_estimates()

# @router.get("/spare_parts/{task_id}", response_model=List[SpareResponse])
# async def get_spare_parts(
#     task_id: str,
#     current_user: dict = Depends(get_current_user),
#     task_service: TaskService = Depends()
# ):
#     """
#     Get spare parts for a specific task.
#     """
#     return await task_service.get_spare_parts_findings(task_id)


@router.get("/api/v1/parts/usage")

async def get_parts_usage(
    part_id: str,
    current_user: dict = Depends(get_current_user),
    task_service: TaskService = Depends()
):
    """
    Get  parts usage for a part_id.
    """
    parts_usage=await task_service.get_parts_usage(part_id)
    logging.info("Parts usage data: %s", parts_usage)
    print(parts_usage)
    return parts_usage

@router.get("/api/v1/skills/analysis")
async def get_skills_analysis(
    Source_Tasks:str = Query(..., description="source task"),
    current_user: dict = Depends(get_current_user),
    task_service: TaskService = Depends()
):
    skills_analysis = await task_service.get_skills_analysis(Source_Tasks)

    return skills_analysis


@router.post("/estimates/", response_model=EstimateResponse, status_code=201)
async def create_estimate(
    estimate_request: EstimateRequest,
     current_user: dict = Depends(get_current_user),
    task_service: TaskService = Depends()
):
    return await task_service.create_estimate(estimate_request,current_user)


@router.get("/estimates/{estimate_id}", response_model=EstimateResponse)
async def get_estimate_by_id(
    estimate_id: str,
    current_user: dict = Depends(get_current_user),
    task_service: TaskService = Depends()
):
    return await task_service.get_estimate_by_id(estimate_id)

excel_service = ExcelUploadService()
@router.post("/upload/excel/")
async def estimate_excel(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """
    Endpoint to handle Excel file uploads
    """
    return await excel_service.upload_excel(file)


@router.get("/estimates/{estimate_id}/download", summary="Download estimate as PDF")
async def download_estimate_pdf(estimate_id: str, current_user: dict = Depends(get_current_user), task_service: TaskService = Depends()):
    """
    Download estimate as PDF
    """
    estimate = await task_service.get_estimate_by_id(estimate_id)
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")
    response = StreamingResponse(media_type="application/pdf")
    response.headers["Content-Disposition"] = f"attachment; filename={estimate_id}.pdf"
    return response
        
