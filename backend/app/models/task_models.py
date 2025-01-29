from pydantic import BaseModel
from typing import Optional

class TaskManHoursModel(BaseModel):
    Source_Task: str
    Max: float
    Min: float
    Avg: float
    Est:float
    

class PartsUsageResponseModel(BaseModel):
    Part_Id: str
    PartDescription: str
    Usage: dict

class SkillsAnalysisModel(BaseModel):
    Source_Task: list
    
class ManHours(BaseModel):
    min: float
    avg: float
    max: float

class SkillAnalysis(BaseModel):
    skill: str
    manHours: ManHours

class TaskSkillAnalysis(BaseModel):
    taskId: str
    taskDescription: str
    skills: list[SkillAnalysis]

class FindingsSkillAnalysis(BaseModel):
    taskId: str
    skills: list[SkillAnalysis]
    
    

