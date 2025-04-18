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
    estID: str
    description: str=""
    createdBy: str=""
    createdAt: datetime|None=None
    lastUpdated: datetime|None=None
# create estimate

class SparePart(BaseModel):
    partID:str
    quantity:float
    description:str
    unit:str
    price:float
class MiscLaborTask(BaseModel):
    taskID: str
    taskDescription: str
    manHours: float
    spareParts:List[SparePart]
    skill:str
class AdditionalTasks(BaseModel):
    taskID: str
    taskDescription: str
class Capping(BaseModel):
    cappingTypeManhrs: str=""
    cappingManhrs: float
    cappingTypeSpareCost: str=""
    cappingSpareCost: float

class EstimateRequest(BaseModel):
     tasks: List[str]
     probability: float
     aircraftAge: float 
     aircraftFlightHours: int 
     aircraftFlightCycles: int
     areaOfOperations: str
     cappingDetails:Optional[Capping]=None
     typeOfCheck: List[str]
     typeOfCheckID:str
     operator: str 
     aircraftRegNo:str
     aircraftModel:str  
     additionalTasks: List[AdditionalTasks]
     miscLaborTasks: List[MiscLaborTask]
     
     
     
     def to_dict(self):
        return {
            "tasks":self.tasks,
            "probability": self.probability,
            "operator": self.operator,
            "aircraftAge": self.aircraftAge,
            "aircraftFlightHours": self.aircraftFlightHours,  # Convert datetime to ISO format
            "aircraftFlightCycles": self.aircraftFlightCycles  # Convert datetime to ISO format

        }

class ValidRequest(BaseModel):
     tasks: List[str]
class ValidTasks(BaseModel):
    taskid: str
    status: bool
    description:str=""
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
class EstimateStatus(BaseModel):
    estID:str
    status:str
#estimate response schema

class RemarkItem(BaseModel):
    remark: str
    updatedAt: datetime
    createdAt: datetime
    updatedBy: str= "Unknown"
    active: bool
    
class EstimateStatusResponse(BaseModel):
    estID:str
    tasks: List[str]
    descriptions:List[str]
    totalMhs:float
    totalPartsCost:float
    status:str
    # tatTime:float=0.0
    aircraftRegNo:str
    probability:float
    operator:str
    aircraftModel:str
    aircraftAge:float
    typeOfCheck:List[str]
    typeOfCheckID:str
    aircraftFlightHours: int
    aircraftFlightCycles: int
    areaOfOperations: str
    cappingDetails:Optional[Capping]=None
    additionalTasks: List[AdditionalTasks]
    miscLaborTasks: List[MiscLaborTask]
    
    createdAt:datetime
    remarks: List[RemarkItem] = []
class EstimateResponse(BaseModel):
    estID: str
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
    downloadEstimate: str
    model_config = {
        "arbitrary_types_allowed": True,
        "populate_by_name": True,
    }

class DownloadResponse(BaseModel):
    estID: str
    description: str = ""
    tasks: List[TaskDetailsWithParts] = []
    aggregatedTasks: Optional[AggregatedTasks] = None

    findings:List[FindingsDetailsWithParts]=[]
    # aggregatedFindingsByTask:List[AggregatedFindingsByTask]=None
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

class Thresholds(BaseModel):
    tatThreshold: float
    manHoursThreshold: float

class ConfigurationsResponse(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    defaultProbability: float
    thresholds: Thresholds
    miscLaborTasks: List[MiscLaborTask]

    model_config = {
        "arbitrary_types_allowed": True,
        "populate_by_name": True,
    }


class MyModel(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

class ComparisonResult(BaseModel):
    metric: str
    estimated:float=0.0
    actual:float=0.0
class ComparisonResponse(BaseModel):
    estimateID: str
    comparisonResults:List[ComparisonResult]


class EstimateIDResponse(BaseModel):
    estID: str
    description: str = ""
    tasks: List[TaskDetailsWithParts] = []
    aggregatedTasks: Optional[AggregatedTasks] = None

    findings:List[FindingsDetailsWithParts]=[]
    # aggregatedFindingsByTask:List[AggregatedFindingsByTask]=None
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
