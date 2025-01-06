from fastapi import APIRouter, Depends
from app.services.task_analytics_service import TaskAnalyticsService
from app.models.task_models import TaskProbabilityModel, TaskManHoursModel, SparePartsModel
from app.core.dependencies import get_task_service

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
