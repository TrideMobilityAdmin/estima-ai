from fastapi import APIRouter, Depends, HTTPException, status,UploadFile,File, Form
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import ORJSONResponse
from app.models.user import UserResponse,UserCreate, UserLogin, Token, UserInDB
from typing import List, Optional,Dict, Any
from fastapi import APIRouter, Depends, Query
from app.middleware.auth import get_current_user
import logging
from typing import List
import shutil
from datetime import datetime
from app.services.upload_docs import ExcelUploadService
from app.models.task_models import UpdateRemarksRequest,SkillsAnalysisRequest,ProbabilityWiseManhrsSpareCost,CappingData
from app.models.estimates import Estimate, EstimateRequest,ConfigurationsResponse,ValidTasks,ValidRequest,EstimateStatusResponse,ValidRequestCheckCategory,ModelTasksRequest
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
    startDate:datetime,
    endDate:datetime,
    current_user: dict = Depends(get_current_user),
    task_service: TaskService = Depends()
):
    """
    Get  parts usage for a part_id.
    """
    parts_usage=await task_service.get_parts_usage(part_id,startDate,endDate)
    logging.info("Parts usage data: %s", parts_usage)
    return parts_usage
@router.post("/multiple/parts/usage", response_model=Dict) 
async def get_multiple_parts_usage(
    part_ids: List[str],  
    startDate: datetime,
    endDate: datetime,
    current_user: dict = Depends(get_current_user),
    task_service: TaskService = Depends()
):
    """
    Get parts usage for multiple part IDs.
    """
    parts_usage = await task_service.multiple_parts_usage(part_ids, startDate, endDate)
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

# @router.post("/estimate_status",response_model=EstimateStatus)
# async def estimate_status(
#     estimate_request: EstimateRequest,
#      current_user: dict = Depends(get_current_user),
#     task_service: TaskService = Depends()
# ):
#      return await task_service.estimate_status(estimate_request,current_user)
# @router.post("/estimates/", response_model=EstimateResponse, status_code=201)
# async def create_estimate(
#     estimate_request: EstimateRequest,
#      current_user: dict = Depends(get_current_user),
#     task_service: TaskService = Depends()
# ):
#     return await task_service.create_estimate(estimate_request,current_user)


@router.get("/estimates/{estimate_id}")
async def get_estimate_by_id(
    estimate_id: str,
    current_user: dict = Depends(get_current_user),
    task_service: TaskService = Depends()
):
    return  task_service.get_estimate_by_id(estimate_id)

excel_service = ExcelUploadService()
# @router.post("/upload/excel/")
# async def estimate_excel(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
#     """
#     Endpoint to handle Excel file uploads
#     """
#     return await excel_service.upload_excel(file)

@router.post("/estimates/{estimate_id}/compare")
async def compare_estimates(estimate_id: str, files: List[UploadFile] = File(...), current_user: dict = Depends(get_current_user)):
    """
    Compare uploaded Excel file with existing estimate
    """
    return await excel_service.compare_estimates(estimate_id, files)


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


@router.post("/operators_list", response_model= Dict[str, str])
async def upload_operators_list(
    current_user: dict = Depends(get_current_user),
    task_service: TaskService = Depends()
):
    """
    Get a list of operators based on the current user's role.
    """
    return await task_service.upload_operator_list(current_user)


@router.get("/operators_list", response_model=List[str])
async def get_operators_list(
    current_user: dict = Depends(get_current_user),
    task_service: TaskService = Depends()
):
    """
    Get a list of operators based on the current user's role.
    """
    return await task_service.get_operator_list(current_user)

@router.get("/filtered_tasks/{estID}", response_model=Dict)
async def get_filtered_tasks(
    estID: str,
    current_user: dict = Depends(get_current_user),
    task_service: TaskService = Depends()
):
    """
    Get filtered tasks based on the estimate ID.
    """
    return await task_service.get_filtered_tasks(estID, current_user)
@router.post("/validate_tasks_checkbased",response_model=List[ValidTasks])
async def validate_tasks_checkbased(
    estimate_request: ValidRequestCheckCategory,
     current_user: dict = Depends(get_current_user),
    task_service: TaskService = Depends()
):
    
    return await task_service.validate_tasks_checkcategory(estimate_request,current_user)

@router.post("/upload-estimate/")
async def upload_estimate(
    estimate_request: str = Form(...),
    current_user: dict = Depends(get_current_user),
    file: UploadFile = File(...)
) -> Dict[str, Any]:
    
    try:
        estimate_request_data = EstimateRequest.parse_raw(estimate_request)
        logger.info("Request received successfully")

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid estimate request: {str(e)}")

    return await excel_service.upload_estimate(estimate_request_data, file)

@router.get("/estimate_file_status",response_model=List[EstimateStatusResponse])
async def get_estimate_status(
    current_user: dict = Depends(get_current_user)
):
    return await excel_service.estimate_status()
@router.put("/estimates/{estID}/remarks", response_model=Dict[str, Any])
async def update_remarks(
    estID: str,
    request: UpdateRemarksRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Update remarks for a specific estimate
    """
    return await excel_service.update_estimate_status_remarks(estID, remark=request.remark,current_user=current_user)

@router.get("/probability_wise_manhrs_sparecost/{estimate_id}",response_model=ProbabilityWiseManhrsSpareCost)
async def get_probability_wise_manhrs_sparecost(estimate_id: str,current_user:dict=Depends(get_current_user), task_service: TaskService = Depends()):
    return task_service.get_probability_wise_manhrsspareparts(estimate_id)

@router.get("/capping_data/", response_model=List[CappingData])
async def get_all_capping_data(
    current_user: dict = Depends(get_current_user)
):
    return await config_service.get_all_capping_data()

@router.get("/file_upload_estimate/{estimate_id}")
async def get_upload_estimate_byId(
    estimate_id: str,
    current_user: dict = Depends(get_current_user)
):
    file_upload=await excel_service.get_upload_estimate_byId(estimate_id)
    return file_upload

@router.get("/historical_estimate_file_status",response_model=dict)
async def get_historical_estimate_status(
    status: Optional[str] = None,
    estID: Optional[str] = None,
    aircraftRegNo: Optional[str] = None,
    date: Optional[datetime] = None,
    page: int = Query(1, ge=1),  # Default page = 1
    page_size: int = Query(5, ge=1), # Default page size = 5
      
    current_user: dict = Depends(get_current_user)
):
    return await excel_service.historical_estimate_status(status,estID,aircraftRegNo,date,page, page_size)

@router.post("/model_tasks_validate")
async def model_tasks_validate(
    request: ModelTasksRequest,
    current_user: dict = Depends(get_current_user),
    task_service: TaskService = Depends()
):

    print(request.ADD_TASKS)
    return await task_service.model_tasks_validate(
        request.MPD_TASKS,
        request.ADD_TASKS,
        request.aircraft_age,
        request.aircraft_model,
        request.customer_name_consideration,
        request.check_category,
        request.customer_name,
        request.age_cap,
        current_user
    )