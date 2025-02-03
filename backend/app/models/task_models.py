from pydantic import BaseModel
from typing import Optional,List,Any,Dict

class ManHrs(BaseModel):
    max: float
    min: float
    avg: float
    est:float
    
class TaskManHoursModel(BaseModel):
    sourceTask: str
    desciption: str
    mhs :ManHrs
class FindingsManHoursModel(BaseModel):
    logItem: str
    desciption: str
    mhs :ManHrs


class Package(BaseModel):
    packageId: str
    quantity: Any  # Adjust type based on actual data (int/float)


class Task(BaseModel):
    taskId: str
    taskDescription: str
    partDescription: str
    packages: Package


class Finding(BaseModel):
    taskId: str
    taskDescription: str
    packageId: str
    date: str
    quantity: Any  # Adjust type based on actual data (int/float)
    stockStatus: Optional[str] = None
    priceUSD: Optional[float] = None


class Usage(BaseModel):
    tasks: List[Task]
    findings: List[Finding]


class PartsUsageResponse(BaseModel):
    partId: str
    partDescription: str
    usage: Usage



# Pydantic Models
class ManHours(BaseModel):
    min: float
    avg: float
    max: float

class SkillDetail(BaseModel):
    skill: str
    manHours: ManHours

class TaskAnalysis(BaseModel):
    taskId: str
    taskDescription: Optional[str] = None
    skills: List[SkillDetail]

class SkillAnalysisResponse(BaseModel):
    skillAnalysis: Dict[str, List[TaskAnalysis]]
