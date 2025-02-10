from fastapi import APIRouter, Depends, HTTPException, status,UploadFile,File
from app.models.user import UserResponse,UserCreate, UserLogin, Token, UserInDB
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from app.middleware.auth import get_current_user
import logging
from typing import List
from app.services.upload_docs import ExcelUploadService
from app.models.task_models import TaskManHoursModel,FindingsManHoursModel
from app.models.estimates import Estimate, EstimateRequest, EstimateResponse,SpareParts,SpareResponse,ComparisonResponse
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

@router.post("/estimates/{estimate_id}/compare",response_model=ComparisonResponse)
async def compare_estimates(estimate_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """
    Compare uploaded Excel file with existing estimate
    """
    return await excel_service.compare_estimates(estimate_id, file)


@router.get("/estimates/{estimate_id}/download", summary="Download estimate as PDF")
async def download_estimate_pdf(estimate_id: str, current_user: dict = Depends(get_current_user), task_service: TaskService = Depends()):
    """
    Download estimate as PDF
    """
    logger.info(f"Fetching estimate with ID: {estimate_id}")
    estimate_dict = await task_service.get_estimate_by_id(estimate_id)
    if not estimate_dict:
        raise HTTPException(status_code=404, detail="Estimate not found")

    # Convert dictionary to EstimateResponse model
    estimate = EstimateResponse(**estimate_dict)

    # Create a PDF buffer
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # Helper function to draw wrapped text
    def draw_wrapped_text(x, y, text, max_width):
        lines = []
        words = text.split(' ')
        current_line = ''
        for word in words:
            if p.stringWidth(current_line + word, 'Helvetica', 12) < max_width:
                current_line += word + ' '
            else:
                lines.append(current_line)
                current_line = word + ' '
        lines.append(current_line)

        for line in lines:
            p.drawString(x, y, line.strip())
            y -= 15  # Move down for the next line
            if y < 50:  # Check if we need to create a new page
                p.showPage()
                p.setFont("Helvetica", 12)
                y = height - 50  # Reset y position for new page

        return y

   
    p.setFont("Helvetica", 12)
    y_position = height - 50

    # Add content to the PDF in structured format
    y_position = draw_wrapped_text(100, y_position, f"estID: {estimate.estID}", width - 200)
    y_position = draw_wrapped_text(100, y_position, f"description: {estimate.description}", width - 200)
    
    # Add tasks
    y_position = draw_wrapped_text(100, y_position, "tasks:", width - 200)
    for task in estimate.tasks:
        y_position = draw_wrapped_text(120, y_position, f"- sourceTask: {task.sourceTask}", width - 200)
        y_position = draw_wrapped_text(140, y_position, f"  desc: {task.desciption}", width - 200)
        y_position = draw_wrapped_text(140, y_position, "  mhs:", width - 200)
        y_position = draw_wrapped_text(160, y_position, f"    min: {task.mhs.min}", width - 200)
        y_position = draw_wrapped_text(160, y_position, f"    max: {task.mhs.max}", width - 200)
        y_position = draw_wrapped_text(160, y_position, f"    avg: {task.mhs.avg}", width - 200)
        y_position = draw_wrapped_text(160, y_position, f"    est: {task.mhs.est}", width - 200)
        
        if task.spareParts:
            y_position = draw_wrapped_text(140, y_position, "  spareParts:", width - 200)
            for spare in task.spareParts:
                y_position = draw_wrapped_text(160, y_position, f"- partId: {spare.partId}", width - 200)
                y_position = draw_wrapped_text(160, y_position, f"  desc: {spare.desc}", width - 200)
                y_position = draw_wrapped_text(160, y_position, f"  qty: {spare.qty}", width - 200)
                y_position = draw_wrapped_text(160, y_position, f"  unit: {spare.unit}", width - 200)
                y_position = draw_wrapped_text(160, y_position, f"  price: {spare.price}", width - 200)

   
    y_position = draw_wrapped_text(100, y_position, "aggregatedTasks:", width - 200)
    y_position = draw_wrapped_text(120, y_position, f"  totalMhs: {estimate.aggregatedTasks.totalMhs}", width - 200)
    y_position = draw_wrapped_text(120, y_position, f"  totalPartsCost: {estimate.aggregatedTasks.totalPartsCost}", width - 200)

    # Add findings
    y_position = draw_wrapped_text(100, y_position, "findings:", width - 200)
    for finding in estimate.findings:
        y_position = draw_wrapped_text(120, y_position, f"- taskId: {finding.taskId}", width - 200)
        y_position = draw_wrapped_text(120, y_position, "  details:", width - 200)
        for detail in finding.details:
            y_position = draw_wrapped_text(140, y_position, f"- logItem: {detail.logItem}", width - 200)
            y_position = draw_wrapped_text(140, y_position, f"  desc: {detail.desciption}", width - 200)
            y_position = draw_wrapped_text(140, y_position, "  mhs:", width - 200)
            y_position = draw_wrapped_text(160, y_position, f"    min: {detail.mhs.min}", width - 200)
            y_position = draw_wrapped_text(160, y_position, f"    max: {detail.mhs.max}", width - 200)
            y_position = draw_wrapped_text(160, y_position, f"    avg: {detail.mhs.avg}", width - 200)
            y_position = draw_wrapped_text(160, y_position, f"    est: {detail.mhs.est}", width - 200)

            if detail.spareParts:
                y_position = draw_wrapped_text(140, y_position, "  spareParts:", width - 200)
                for spare in detail.spareParts:
                    y_position = draw_wrapped_text(160, y_position, f"- partId: {spare.partId}", width - 200)
                    y_position = draw_wrapped_text(160, y_position, f"  desc: {spare.desc}", width - 200)
                    y_position = draw_wrapped_text(160, y_position, f"  qty: {spare.qty}", width - 200)
                    y_position = draw_wrapped_text(160, y_position, f"  unit: {spare.unit}", width - 200)
                    y_position = draw_wrapped_text(160, y_position, f"  price: {spare.price}", width - 200)

    y_position = draw_wrapped_text(100, y_position, "aggregatedFindingsByTask:", width - 200)
    for aggregated_finding in estimate.aggregatedFindingsByTask:
        y_position = draw_wrapped_text(120, y_position, f"- taskId: {aggregated_finding.taskId}", width - 200)
        y_position = draw_wrapped_text(120, y_position, "  aggregatedMhs:", width - 200)
        y_position = draw_wrapped_text(140, y_position, f"    min: {aggregated_finding.aggregatedMhs.min}", width - 200)
        y_position = draw_wrapped_text(140, y_position, f"    max: {aggregated_finding.aggregatedMhs.max}", width - 200)
        y_position = draw_wrapped_text(140, y_position, f"    avg: {aggregated_finding.aggregatedMhs.avg}", width - 200)
        y_position = draw_wrapped_text(140, y_position, f"    est: {aggregated_finding.aggregatedMhs.est}", width - 200)
        y_position = draw_wrapped_text(120, y_position, f"  totalPartsCost: {aggregated_finding.totalPartsCost}", width - 200)

    
    y_position = draw_wrapped_text(100, y_position, "aggregatedFindings:", width - 200)
    y_position = draw_wrapped_text(120, y_position, f"  totalMhs: {estimate.aggregatedFindings.totalMhs}", width - 200)
    y_position = draw_wrapped_text(120, y_position, f"  totalPartsCost: {estimate.aggregatedFindings.totalPartsCost}", width - 200)


    y_position = draw_wrapped_text(100, y_position, f"createdBy: {estimate.createdBy}", width - 200)
    y_position = draw_wrapped_text(100, y_position, f"createdAt: '{estimate.createdAt.strftime('%Y-%m-%dT%H:%M:%SZ')}'", width - 200)
    y_position = draw_wrapped_text(100, y_position, f"lastUpdated: '{estimate.lastUpdated.strftime('%Y-%m-%dT%H:%M:%SZ')}'", width - 200)

    p.showPage()
    p.save()

    # Move the buffer position to the beginning
    buffer.seek(0)

    # Create a StreamingResponse with the PDF content
    logger.info("Creating PDF response")
    response = StreamingResponse(buffer, media_type="application/pdf")
    response.headers["Content-Disposition"] = f"attachment; filename={estimate_id}.pdf"
    return response
