from datetime import datetime, timedelta
from pydantic import BaseModel,Field,ConfigDict,BeforeValidator
from typing import List,Optional,Annotated,Any
from bson import ObjectId
from app.models.task_models import TaskManHoursModel,FindingsManHoursModel,ManHrs
from typing_extensions import Annotated
from pydantic.json_schema import GenerateJsonSchema, JsonSchemaValue
from pydantic_core import core_schema
class PyObjectId:
    """Custom type to handle MongoDB ObjectId in Pydantic v2."""

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v: Any,field: Any) -> ObjectId:
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str) and ObjectId.is_valid(v):
            return ObjectId(v)
        raise ValueError("Invalid ObjectId format")

    @classmethod
    def __get_pydantic_json_schema__(cls, schema: core_schema.CoreSchema, handler: Any) -> JsonSchemaValue:
        return {"type": "string"} 
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type: Any, handler: Any) -> core_schema.CoreSchema:
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.general_plain_validator_function(cls.validate),
            serialization=core_schema.plain_serializer_function_ser_schema(str),
        )
    
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
    aggregatedFindingsByTask:List[AggregatedFindingsByTask]=None
    aggregatedFindings:Optional[AggregatedFindings]=None
    userID: PyObjectId = Field(alias="user_id")
    createdBy: str = "Unknown"
    createdAt:  datetime
    lastUpdated:  datetime
    updatedBy:  PyObjectId = Field(alias="updated_by")
    originalFilename: str = ""
    model_config = {
        "arbitrary_types_allowed": True,
        "populate_by_name": True,
    }