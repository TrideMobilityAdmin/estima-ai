
from app.models.task_models import TaskManHoursModel 
from statistics import mean
from fastapi import HTTPException
import logging
from app.db.database_connection import MongoDBClient
logger = logging.getLogger(__name__)
class TaskService:
    def __init__(self):
        self.mongo_client = MongoDBClient()
        self.collection = self.mongo_client.get_collection("spares-costing")

    async def get_man_hours(self, source_task: str) -> TaskManHoursModel:
        """
        Get man hours statistics for a specific source task
        """
        logger.info(f"Fetching man hours for source task: {source_task}")
        
        try:
            # Aggregate pipeline to get man hours data
            pipeline = [
                {
                    "$match": {
                        "SourceTask": source_task
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "max_hours": {"$max": "$MHTMax"},
                        "min_hours": {"$min": "$MHTMin"},
                        "avg_hours": {"$avg": "$MHTEst"}
                    }
                }
            ]

            # Execute aggregation
            result = list(self.collection.aggregate(pipeline))

            if not result:
                logger.warning(f"No data found for source task: {source_task}")
                raise HTTPException(
                    status_code=404,
                    detail=f"No data found for source task: {source_task}"
                )

            stats = result[0]  # Get the first (and only) result
            
            return TaskManHoursModel(
                Source_Task=source_task,
                Max=float(stats["max_hours"]),
                Min=float(stats["min_hours"]),
                Avg=float(stats["avg_hours"])
            )

        except Exception as e:
            logger.error(f"Error fetching man hours: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error fetching man hours: {str(e)}"
            )
