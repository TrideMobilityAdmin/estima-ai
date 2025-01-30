from pydantic import BaseModel
from typing import Optional

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
