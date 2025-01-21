from pydantic import BaseModel
from typing import Optional

class TaskManHoursModel(BaseModel):
    Source_Task: str
    Max: float
    Min: float
    Avg: float
    Est:float

