from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import List,Optional
from app.models.task_models import TaskManHoursModel
# get all estimates
class Estimate(BaseModel):
    id: str
    description: str=""
    createdBy: str="Unknown"
    createdAt: datetime|None=None
    lastUpdated: datetime|None=None
# create estimate
class EstimateRequest(BaseModel):
     tasks: List[str]
     probability: float
     operator: str
     aircraftAge: int 
     aircraftFlightHours: int 
     aircraftFlightCycles: int 
class SparePart(BaseModel):
    partId: str
    desc: str = ""
    qty: float = 0.0
    unit: str = ""
    price: float = 0.0
class TaskDetailsWithParts(BaseModel):
    id: str
    desc: str = ""
    TaskManHours:Optional[TaskManHoursModel]=None
    spareParts: List[SparePart] = []
class AggregatedTasks(BaseModel):
    aggregatedMhs: Optional[TaskManHoursModel] = None
    totalPartsCost: float = 0.0
class EstimateResponse(BaseModel):
    id: str
    description: str = ""
    tasks: List[TaskDetailsWithParts] = []
    aggregatedTasks: Optional[AggregatedTasks] = None
    createdBy: str = "Unknown"
    createdAt:  datetime
    lastUpdated:  datetime
