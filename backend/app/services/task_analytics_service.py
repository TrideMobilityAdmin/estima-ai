from app.models.task_models import TaskManHoursModel
from statistics import mean
from fastapi import HTTPException
import logging
from typing import List
from datetime import datetime
from app.models.estimates import (
    Estimate,
    EstimateResponse,
    EstimateRequest,
    TaskDetailsWithParts,
    AggregatedTasks,
    SparePart
)
from app.log.logs import logger
from app.db.database_connection import MongoDBClient
# logger = logging.getLogger(__name__)
class TaskService:
    def __init__(self):
        self.mongo_client = MongoDBClient()
        self.collection = self.mongo_client.get_collection("spares-costing")
        self.estimates_collection = self.mongo_client.get_collection("estimates")
        self.spareparts_collection=self.mongo_client.get_collection("spares-qty")
        # self.tasks_collection = self.mongo_client.get_collection("tasks")
        self.taskdescription_collection=self.mongo_client.get_collection("task_description")

    async def get_man_hours(self, source_task: str) -> TaskManHoursModel:
        """
        Get man hours statistics for a specific source task
        """
        logger.info(f"Fetching man hours for source task: {source_task}")

        try:
            # Modify the pipeline to extract the nested "ActualManHrs.value"
            pipeline = [
                {"$match": {"SourceTask": source_task}},
                {"$project": {"_id": 0, "ActualManHrs": "$ActualManHrs.value"}},
            ]

            logger.debug(f"Aggregation pipeline: {pipeline}")
            results = list(self.collection.aggregate(pipeline))
            logger.debug(f"Aggregation results: {results}")

            if not results:
                logger.warning(f"No data found for source task: {source_task}")
                raise HTTPException(
                    status_code=404,
                    detail=f"No data found for source task: {source_task}"
                )
            manhours = []
            for result in results:
                value = result.get("ActualManHrs")
                if isinstance(value, str):
                    try:
                        manhours.append(float(value))
                    except ValueError:
                        logger.warning(f"Invalid ActualManHrs value: {value}")

            if not manhours:
                logger.error(f"No valid manhours data for source task: {source_task}")
                raise HTTPException(
                    status_code=404,
                    detail=f"No valid manhours data for source task: {source_task}"
                )

            # Calculate max, min, avg, and estimated values
            return TaskManHoursModel(
                Source_Task=source_task,
                Max=max(manhours),
                Min=min(manhours),
                Avg=mean(manhours),
                Est=mean(manhours)
            )

        except Exception as e:
            logger.error(f"Error fetching man hours: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Error fetching man hours: {str(e)}"
            )

    async def get_all_estimates(self) -> List[Estimate]:
        """
        Get all estimate documents from the estimates collection
        """
        logger.info("Fetching all estimates")

        try:
            estimates_cursor = self.estimates_collection.find()

            estimates = []
            for estimate in estimates_cursor:
                estimates.append(Estimate(
                    id=str(estimate["_id"]),
                    description=estimate.get("description", ""),
                    createdBy=estimate.get("createdBy", "Unknown"),
                    createdAt=estimate.get("createdAt"),
                    lastUpdated=estimate.get("lastUpdated")
                ))

            return estimates

        except Exception as e:
            logger.error(f"Error fetching estimates: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error fetching estimates: {str(e)}"
            )

    async def create_estimate(self, estimate_request: EstimateRequest) -> EstimateResponse:
        """
        Create a new estimate based on the provided tasks and parameters.
        """
        logger.info("Creating new estimate")
        try:
            current_time = datetime.utcnow()

            processed_tasks = []
            total_min_hours = 0
            total_max_hours = 0
            total_avg_hours = 0
            total_parts_cost = 0
            for task_id in estimate_request.tasks:
                task_mhs = await self.get_man_hours(task_id)
                spare_parts = await self.get_spare_parts(task_id)

                task_parts_cost = sum(part.price * part.qty for part in spare_parts)
                total_parts_cost += task_parts_cost

                total_min_hours += task_mhs.Min
                total_max_hours += task_mhs.Max
                total_avg_hours += task_mhs.Avg

                task_desc = await self._get_task_description(task_id)

                task_details = TaskDetailsWithParts(
                    id=task_id,
                    desc=task_desc,
                    TaskManHours=task_mhs,
                    spareParts=spare_parts
                )
                processed_tasks.append(task_details)

            aggregated_tasks = AggregatedTasks(
                aggregatedMhs=TaskManHoursModel(
                    Min=float(total_min_hours),
                    Max=float(total_max_hours),
                    Avg=float(total_avg_hours),
                    Est=total_avg_hours
                ),
                totalPartsCost=float(total_parts_cost)
            )

            estimate_doc = {
                "description": await self._get_task_description(estimate_request.tasks),
                "tasks": [task.dict() for task in processed_tasks],
                "aggregatedTasks": aggregated_tasks.dict(),
                "probability": estimate_request.probability,
                "operator": estimate_request.operator,
                "aircraftAge": estimate_request.aircraftAge,
                "aircraftFlightHours": estimate_request.aircraftFlightHours,
                "aircraftFlightCycles": estimate_request.aircraftFlightCycles,
                "createdAt": current_time,
                "lastUpdated": current_time
            }

            result = await self.estimates_collection.insert_one(estimate_doc)

            response = EstimateResponse(
                id=str(result.inserted_id),
                description=estimate_doc["description"],
                tasks=processed_tasks,
                aggregatedTasks=aggregated_tasks,
                createdBy=estimate_doc["createdBy"],
                createdAt=current_time,
                lastUpdated=current_time
            )

            return response

        except Exception as e:
            logger.error(f"Error creating estimate: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error creating estimate: {str(e)}"
            )

    async def get_spare_parts(self, task_id: str) -> List[SparePart]:
        """
        Helper method to get spare parts for a task
        """
        try:
            logger.info(f"Fetching spare parts for task_id: {task_id}")
            pipeline = [
                {"$match": {"SourceTask": task_id}},
                {
                    "$group": {
                        "_id": "$SourceTask",
                        "spare": {
                            "$push": {
                                "partId": "$IssuedPart",
                                "desc": "$PartDescription",
                                "unit": "$Unit",
                                "qty": "$MovAvgQtyRounded",
                                "price": "$MoVAvgPrice"
                            }
                        }
                    }
                },
                {"$project": {"_id": 0, "spare": 1}}
            ]
            results = list(self.spareparts_collection.aggregate(pipeline))
            if not results:
                logger.warning(f"No spare parts found for task_id: {task_id}")
                return []
            spare_parts = [
                # SparePart(
                #     # partId=part.get("partId", ""),
                #     # desc=part.get("desc", ""),
                #     # qty=float(part.get("qty",0.0)),
                #     # unit=part.get("unit", ""),
                #     # price=float(part.get("price", 0.0))
                #     )
                SparePart(**part)
                for part in results[0]["spare"] 
            ]
            return spare_parts
    
        except Exception as e:
            logger.error(f"Error fetching spare parts: {str(e)}")
            return []
    

    async def _get_task_description(self, task_id: str) -> str:
        """
        Helper method to get task description
        """
        try:
            task_doc = await self.taskdescription_collection.find_one(
                {"SourceTask": task_id},
                {"id":1,"Description": 1}
            )
            if task_doc:
                return {
                    "id": task_doc.get("id", ""),
                    "description": task_doc.get("description", "")
                }
            else:
                return {"id": "", "description": ""}
        except Exception as e:
            logger.error(f"Error fetching task description: {str(e)}")
            return {"id": "", "description": ""}

    # async def _generate_description(self, tasks: List[str]) -> str:
    #     """
    #     Helper method to generate a description for the estimate based on tasks
    #     """
    #     try:
    #         descriptions = []
    #         for task_id in tasks:
    #             desc = await self._get_task_description(task_id)
    #             if desc:
    #                 descriptions.append(desc)
    #         return " | ".join(descriptions) if descriptions else "No descriptions available"
    #     except Exception as e:
    #         logger.error(f"Error generating description: {str(e)}")
    #         return "Error generating description"