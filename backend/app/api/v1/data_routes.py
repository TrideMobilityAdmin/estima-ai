from fastapi import APIRouter, Depends, HTTPException, status,UploadFile,File, Form
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from app.models.user import UserResponse,UserCreate, UserLogin, Token, UserInDB
from typing import List, Optional,Dict, Any
from fastapi import APIRouter, Depends, Query
from app.middleware.auth import get_current_user
import logging
from typing import List
import shutil
from app.services.upload_docs import ExcelUploadService
from app.models.task_models import TaskManHoursModel,FindingsManHoursModel,SkillsAnalysisRequest
from app.models.estimates import Estimate,EstimateResponseSchema, EstimateRequest, EstimateResponse,SpareParts,SpareResponse,ComparisonResponse,ConfigurationsResponse,ValidTasks,ValidRequest,EstimateStatus
from app.services.task_analytics_service import TaskService
from app.log.logs import logger
from app.services.configurations import ConfigurationService
import json

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


@router.get("/parts/usage")

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
    return parts_usage

@router.post("/skills/analysis")
async def post_skills_analysis(
    request: SkillsAnalysisRequest,
    current_user: dict = Depends(get_current_user),
    task_service: TaskService = Depends()
):
    """
    Endpoint to analyze skills based on a list of source tasks.

    Args:
        request: Request body containing the list of task identifiers to analyze
        current_user: Current authenticated user
        task_service: Injected task service dependency

    Returns:
        Analysis results for the provided tasks
    """
    # Pass the entire list to the service method
    skills_analysis = await task_service.get_skills_analysis(request.source_tasks)
    
    return skills_analysis

@router.post("/estimate_status",response_model=EstimateStatus)
async def estimate_status(
    estimate_request: EstimateRequest,
     current_user: dict = Depends(get_current_user),
    task_service: TaskService = Depends()
):
     return await task_service.estimate_status(estimate_request,current_user)
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

@router.post("/estimates/{estimate_id}/compare",response_model=ComparisonResponse)
async def compare_estimates(estimate_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """
    Compare uploaded Excel file with existing estimate
    """
    return await excel_service.compare_estimates(estimate_id, file)


@router.get("/estimates/{estimate_id}/download", summary="Download estimate as PDF")
async def download_estimate_pdf(estimate_id: str, current_user: dict = Depends(get_current_user)):
    """
    Download estimate as PDF
    """
    return await excel_service.download_estimate_pdf(estimate_id)

config_service = ConfigurationService()
@router.get("/configurations/", response_model=List[ConfigurationsResponse])
async def get_all_configurations(
    current_user: dict = Depends(get_current_user)
):
    return await config_service.get_all_configurations()

@router.post("/configurations/", response_model=ConfigurationsResponse, status_code=201)
async def create_configurations(
    config_req: ConfigurationsResponse,
    current_user: dict = Depends(get_current_user)
):
    return await config_service.create_configurations(config_req)

@router.put("/configurations/{config_id}", response_model=ConfigurationsResponse)
async def update_configurations(
    config_id: str,
    config_req: ConfigurationsResponse,
    current_user: dict = Depends(get_current_user)
):
    return await config_service.update_configurations(config_id, config_req)


@router.post("/validate",response_model=List[ValidTasks])
async def validate_tasks(
    estimate_request: ValidRequest,
     current_user: dict = Depends(get_current_user),
    task_service: TaskService = Depends()
):
    print("validate_tasks")
    return await task_service.validate_tasks(estimate_request,current_user)

@router.post("/upload-estimate/")
async def upload_estimate(
    estimate_request: str = Form(...),
    file: UploadFile = File(...)
) -> Dict[str, Any]:
    
    try:
        estimate_request_data = EstimateRequest.parse_raw(estimate_request)
        print("Request received successfully")

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid estimate request: {str(e)}")

    return await excel_service.upload_estimate(estimate_request_data, file)


# @router.post("/uploadfile/")
# async def create_upload_file(file: UploadFile = File(...)):
#     # Save uploaded file to a directory
#     with open(f"uploaded_files/{file.filename}", "wb") as buffer:
#         shutil.copyfileobj(file.file, buffer)
#     #return await excel_service.upload_estimate(estimate_request_data, file)
#     return {"filename": file.filename}
