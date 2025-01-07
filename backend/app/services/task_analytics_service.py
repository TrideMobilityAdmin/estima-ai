from app.utils.database_connection import DatabaseConnection
from app.models.task_models import TaskProbabilityModel, TaskManHoursModel, SparePartsModel
from fastapi import HTTPException


class TaskAnalyticsService:
    def __init__(self, db: DatabaseConnection):
        self.db = db

    def get_task_probability(self, source_task: str) -> TaskProbabilityModel:
        """
        Retrieves task probability data from the MongoDB collection.
        """
        query = {"SourceTask": source_task}
        results = self.db.execute_query("gmr-mro", "Mro_data", query)

        if not results:
            raise HTTPException(status_code=404, detail=f"No data found for Source_Task: {source_task}")

        findings = [result["Findings"] for result in results]
        probs = [result["Probs"] for result in results]
        return TaskProbabilityModel(Source_Task=source_task, Findings=findings, Probs=probs)

    def get_task_man_hours(self, source_task: str) -> TaskManHoursModel:
        """
        Retrieves task man-hours data from the MongoDB collection.
        """
        query = {"SourceTask": source_task}
        results = self.db.execute_query("gmr-mro", "Mro_data", query)

        if not results:
            raise HTTPException(status_code=404, detail=f"No data found for Source_Task: {source_task}")

        manhours = [result["manhours"] for result in results if "manhours" in result]
        if not manhours:
            raise HTTPException(status_code=404, detail=f"No manhours data available for Source_Task: {source_task}")

        return TaskManHoursModel(
            Source_Task=source_task,
            Max=max(manhours),
            Min=min(manhours),
            Avg=sum(manhours) / len(manhours)
        )

    def get_spare_parts(self, source_task: str) -> SparePartsModel:
        """
        Retrieves spare parts data from the MongoDB collection.
        """
        query = {"SourceTask": source_task}
        results = self.db.execute_query("gmr-mro", "Mro_data", query)

        if not results:
            raise HTTPException(status_code=404, detail=f"No spare parts found for Source_Task: {source_task}")

        parts = [result["parts"] for result in results if "parts" in result]
        prices = [result["price"] for result in results if "price" in result]

        return SparePartsModel(Source_Task=source_task, Parts=parts, Price=prices)
