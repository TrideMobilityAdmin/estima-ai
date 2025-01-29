from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import List,Optional
from app.models.task_models import TaskManHoursModel,FindingsManHoursModel,ManHrs
# get all estimates
class Estimate(BaseModel):
    id: str
    description: str=""
    createdBy: str=""
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
class SpareParts(BaseModel):
    partId: str=""
    desc: str = ""
    qty: float = 0.0
    unit: str = ""
    price: float = 0.0

class SpareResponse(BaseModel):
    logItem: str=""
    partId: str=""
    desc: str = ""
    qty: float = 0.0
    unit: str = ""
    price: float = 0.0

class Details(FindingsManHoursModel):
    spareParts: List[SpareResponse] = []

class FindingsDetailsWithParts(BaseModel):
    taskId: str=""
    details:List[Details]=[]

class TaskDetailsWithParts(TaskManHoursModel):
    # TaskManHours:Optional[TaskManHoursModel]=None
    spareParts: List[SpareParts] = []

class AggregatedTasks(BaseModel):
    totalMhs: float = 0.0
    totalPartsCost: float = 0.0
class AggregatedFindingsByTask(BaseModel):
   taskId: str=""
   aggregatedMhs:Optional[ManHrs]=None
   totalPartsCost: float = 0.0
class AggregatedFindings(BaseModel):
    totalMhs: float = 0.0
    totalPartsCost: float = 0.0
   
#estimate response schema
class EstimateResponse(BaseModel):
    id: str
    description: str = ""
    tasks: List[TaskDetailsWithParts] = []
    aggregatedTasks: Optional[AggregatedTasks] = None

    findings:List[FindingsDetailsWithParts]=[]
    aggregatedFindingsByTask:Optional[AggregatedFindingsByTask]=None
    aggregatedFindings:Optional[AggregatedFindings]=None
    createdBy: str = "Unknown"
    createdAt:  datetime
    lastUpdated:  datetime

