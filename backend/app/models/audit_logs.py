from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ChangeLog(BaseModel):
    field: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None

class AuditLog(BaseModel):
    estimate_id:Optional[str]=None
    user_id: str
    username: str
    module: str
    action: str
    # changes: Optional[List[ChangeLog]] = []
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    class Config:
        exclude_none = True
