from pydantic import BaseModel
from typing import List

class TaskProbabilityModel(BaseModel):
    Source_Task: str
    Findings: List[str]
    Probs: List[float]

class TaskManHoursModel(BaseModel):
    Source_Task: str
    Max: float
    Min: float
    Avg: float

class SparePartsModel(BaseModel):
    Source_Task: str
    Parts: List[str]
    Price: List[int]
