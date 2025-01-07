# from app.utils.database_connection import DatabaseConnection
# from app.models.task_models import TaskProbabilityModel, TaskManHoursModel, SparePartsModel
# from fastapi import HTTPException

# class TaskAnalyticsService:
#     def __init__(self, db: DatabaseConnection):
#         self.db = db

#     def get_task_probability(self, source_task: str) -> TaskProbabilityModel:
#         query = 'SELECT Findings, Probs FROM Mro_data WHERE SourceTask = ?'
#         results = self.db.execute_query(query, (source_task,))

#         if not results:
#             raise HTTPException(status_code=404, detail=f"No data found for Source_Task: {source_task}")

#         findings = [row[0] for row in results]
#         probs = [row[1] for row in results]
#         return TaskProbabilityModel(Source_Task=source_task, Findings=findings, Probs=probs)

#     def get_task_man_hours(self, source_task: str) -> TaskManHoursModel:
#         query = 'SELECT manhours FROM Mro_data WHERE SourceTask = ?'
#         results = self.db.execute_query(query, (source_task,))

#         manhours = [row[0] for row in results]
#         if not manhours:
#             raise HTTPException(status_code=404, detail=f"No data found for Source_Task: {source_task}")

#         return TaskManHoursModel(
#             Source_Task=source_task,
#             Max=max(manhours),
#             Min=min(manhours),
#             Avg=sum(manhours) / len(manhours)
#         )

#     def get_spare_parts(self, source_task: str) -> SparePartsModel:
#         query = 'SELECT parts, price FROM Mro_data WHERE SourceTask = ?'
#         results = self.db.execute_query(query, (source_task,))

#         if not results:
#             raise HTTPException(status_code=404, detail=f"No spare parts found for Source_Task: {source_task}")

#         parts = [row[0] for row in results]
#         prices = [row[1] for row in results]

#         return SparePartsModel(Source_Task=source_task, Parts=parts, Price=prices)
