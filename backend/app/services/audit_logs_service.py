from app.db.database_connection import MongoDBClient
from datetime import datetime, timezone
from app.models.audit_logs import AuditLog
from typing import List

class AuditLogService:
    def __init__(self):
        self.mongo_client = MongoDBClient()
        self.audit_collection = self.mongo_client.get_collection("audit_logs")
    

    async def log_action(self, log: AuditLog) -> None:
        """
        Insert an audit log document
        """
        log_dict = log.dict(by_alias=True,exclude_none=True)
        self.audit_collection.insert_one(log_dict)

    async def get_logs(self, start_date: datetime, end_date: datetime, page: int = 1, page_size: int = 20):
        skip = (page - 1) * page_size
        filter_query = {
            "timestamp": {"$gte": start_date, "$lte": end_date}
        }
        total = self.audit_collection.count_documents(filter_query)
        cursor = self.audit_collection.find(filter_query).sort("timestamp", -1).skip(skip).limit(page_size)
        logs = await cursor.to_list(length=page_size)
        return logs, total
