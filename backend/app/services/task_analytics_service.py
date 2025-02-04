from app.models.task_models import TaskManHoursModel,ManHrs,FindingsManHoursModel,PartsUsageResponse,Task,Package,Finding,Usage,SkillAnalysisResponse,TaskAnalysis,ManHours,SkillDetail
from statistics import mean
from fastapi import HTTPException,Depends
import logging
from typing import List , Dict,Optional
import pandas as pd
from app.middleware.auth import get_current_user
from typing import List
from datetime import datetime
from fastapi import UploadFile, File
from app.models.estimates import (
    Estimate,
    EstimateResponse,
    EstimateRequest,
    TaskDetailsWithParts,
    AggregatedTasks,
    SpareParts,
    SpareResponse,
    Details,
    FindingsDetailsWithParts,
    AggregatedFindingsByTask,
    AggregatedFindings
)
from app.log.logs import logger
from app.db.database_connection import MongoDBClient
# logger = logging.getLogger(__name__)
class TaskService:
    def __init__(self):
        self.mongo_client = MongoDBClient()
        # self.collection = self.mongo_client.get_collection("spares-costing")
        self.estimates_collection = self.mongo_client.get_collection("estimates")
        self.task_spareparts_collection=self.mongo_client.get_collection("task_parts")
        self.tasks_collection = self.mongo_client.get_collection("tasks")
        self.spareparts_collection=self.mongo_client.get_collection("spares-qty")
        self.taskparts_collection=self.mongo_client.get_collection("task_parts")
        self.subtaskparts_collection=self.mongo_client.get_collection("sub_task_parts")
        self.tasks_collection = self.mongo_client.get_collection("tasks")
        self.tasks_collection=self.mongo_client.get_collection("task_description")
        self.tasks_collection = self.mongo_client.get_collection("estima_input_upload")
        self.taskdescription_collection=self.mongo_client.get_collection("task_description")
        self.sub_task_collection=self.mongo_client.get_collection("predicted_data")

    async def get_man_hours(self, source_task: str) -> TaskManHoursModel:
        """
        Get man hours statistics for a specific source task
        """
        logger.info(f"Fetching man hours for source task: {source_task}")

        try:
            pipeline = [
                {"$match": {"Task": source_task}},
                {
                    "$group": {
                        "_id": "$Task",
                        "description": {"$first": "$Description"},
                        "min": {"$min": "$ActualManHrs"},
                        "max": {"$max": "$ActualManHrs"},
                        "avg": {"$avg": "$ActualManHrs"},
                        "est": {"$avg": "$EstManHrs"}
                    }
                }
            ]

            results = list(self.taskdescription_collection.aggregate(pipeline))
            logger.info(f"Aggregation results: len={len(results)}")

            if not results:
                logger.warning(f"No data found for source task: {source_task}")
                raise HTTPException(
                    status_code=404,
                    detail=f"No data found for source task: {source_task}"
                )
            task = results[0]
            task_man_hours = TaskManHoursModel(
                sourceTask=task["_id"],
                desciption=task["description"],
                mhs=ManHrs(
                min=task["min"],
                max=task["max"],
                avg=task["avg"],
                est=task["est"]
            )
            )
            return task_man_hours

        except Exception as e:
            logger.error(f"Error fetching man hours: {str(e)}")
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
                    createdBy=estimate.get("createdBy",""),
                    createdAt=estimate.get("createdAt"),
                    lastUpdated=estimate.get("lastUpdated")
                ))
            logger.info(f"Found {len(estimates)} estimates")
            return estimates

        except Exception as e:
            logger.error(f"Error fetching estimates: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error fetching estimates: {str(e)}"
            )

    async def create_estimate(self, estimate_request: EstimateRequest,current_user:dict=Depends(get_current_user)) -> EstimateResponse:
        """
        Create a new estimate based on the provided tasks and parameters.
        """
        logger.info("Creating new estimate")
        try:
            current_time = datetime.utcnow()

            processed_tasks = []
            total_task_mhs=0
            total_parts_cost = 0

            findings_list=[]
            aggregated_findings_by_task=[]
            toatal_findings_mhs=0
            toatal_findings_parts_cost=0

            for task_id in estimate_request.tasks:
                task_mhs = await self.get_man_hours(task_id)
                total_task_mhs+=task_mhs.mhs.avg

                spare_parts = await self.get_spare_parts(task_id)
                task_parts_cost = sum(part.price * part.qty for part in spare_parts)
                total_parts_cost += task_parts_cost

                task_details = TaskDetailsWithParts(
                    sourceTask=task_mhs.sourceTask,
                    desciption=task_mhs.desciption,
                    mhs=task_mhs.mhs,
                    spareParts=spare_parts
                )
                processed_tasks.append(task_details)

            aggregated_tasks=AggregatedTasks(
                totalMhs=float(total_task_mhs),
                totalPartsCost=float(total_parts_cost)
            )

            # findings level implementation
            findings_man_hours = await self.get_man_hours_findings(task_id)
            findings_spare_parts = await self.get_spare_parts_findings(task_id)

            findings_details = []
            task_findings_mhs = 0
            task_findings_parts_cost = 0

            spare_parts_by_log_item = {}
            for spare_part in findings_spare_parts:
                if spare_part.logItem not in spare_parts_by_log_item:
                    spare_parts_by_log_item[spare_part.logItem] = []
                spare_parts_by_log_item[spare_part.logItem].append(spare_part)

            for mh in findings_man_hours:
                log_item_parts = spare_parts_by_log_item.get(mh.logItem, [])
                parts_cost = sum(part.price * part.qty for part in log_item_parts)
                task_findings_mhs += mh.mhs.avg
                task_findings_parts_cost += parts_cost

                details = Details(
                    logItem=mh.logItem,
                    desciption=mh.desciption,
                    mhs=mh.mhs,
                    spareParts=log_item_parts
                )
                findings_details.append(details)
            if findings_details:
                findings_list.append(FindingsDetailsWithParts(
                    taskId=task_id,
                    details=findings_details
                    
                ))
            aggregated_findings_by_task.append(AggregatedFindingsByTask(
                taskId=task_id,
                aggregatedMhs=ManHrs(
                    min=min(d.mhs.min for d in findings_details),
                    max=max(d.mhs.max for d in findings_details),
                    avg=sum(d.mhs.avg for d in findings_details) / len(findings_details),
                    est=sum(d.mhs.est for d in findings_details) / len(findings_details)
                ),
                totalPartsCost=task_findings_parts_cost
            ))
            toatal_findings_mhs += task_findings_mhs
            toatal_findings_parts_cost += task_findings_parts_cost

            aggregated_tasks=AggregatedTasks(
                totalMhs=float(total_task_mhs),
                totalPartsCost=float(total_parts_cost)
            )
            aggregated_findings=AggregatedFindings(
                totalMhs=float(toatal_findings_mhs),
                totalPartsCost=float(toatal_findings_parts_cost)
            )

                     
            estimate_id = await self._generate_estimate_id()
            description = await self._get_estimate_description(estimate_request.tasks)
            logger.info(f'description at task level: {description}')
            estimate_doc = {
                "id":estimate_id,
                "description": description,
                "tasks": [task.dict() for task in processed_tasks],
                "aggregatedTasks": aggregated_tasks.dict(),
                "findings": [finding.dict() for finding in findings_list],
                "aggregatedFindingsByTask": [agg.dict() for agg in aggregated_findings_by_task],
                "aggregatedFindings": aggregated_findings.dict(),
                "userID":current_user["_id"],
                "createdAt": current_time,
                "lastUpdated": current_time,
                "createdBy":current_user["email"],
                "updatedBy":current_user["_id"],
                "originalFilename":description
                
            }

            result = self.estimates_collection.insert_one(estimate_doc)
            response = EstimateResponse(
                id=estimate_id,
                description=description,
                tasks=processed_tasks,
                aggregatedTasks=aggregated_tasks,
                findings=findings_list,
                aggregatedFindingsByTask=aggregated_findings_by_task,
                aggregatedFindings=aggregated_findings,
                userID=estimate_doc["userID"],
                createdAt=current_time,
                lastUpdated=current_time,
                createdBy=estimate_doc["createdBy"],
                updatedBy=estimate_doc["updatedBy"],
                originalFilename=description

            )

            return response

        except Exception as e:
            logger.error(f"Error creating estimate: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error creating estimate: {str(e)}"
            )

    async def get_spare_parts(self, task_id: str) -> List[SpareParts]:
        """
        Helper method to get spare parts for a task
        """
        try:
            logger.info(f"Fetching spare parts for task_id: {task_id}")
            pipeline = [
                {"$match": {"Task": task_id}},
                {
                    "$group": {
                         "_id": "$Task",
                        "spareParts": {
                            "$push": {
                                "partId": "$RequestedPart",
                                "desc": "$PartDescription",
                                "unit": "$UOM",
                                "qty": "$RequestedQty",
                                "price": {"$ifNull": ["$MaterialCost", 0.0]}
                            }
                        }
                    }
                },
                {"$project": {"_id": 0,  "spareParts": 1}}
            ]
            results = list(self.task_spareparts_collection.aggregate(pipeline))
            if not results:
                logger.warning(f"No spare parts found for task_id: {task_id}")
                return []
            spare_parts = [
                SpareParts(**part)
                for part in results[0]["spareParts"] 
            ]
            return spare_parts
    
        except Exception as e:
            logger.error(f"Error fetching spare parts: {str(e)}")
            return []
    

    async def _get_estimate_description(self, tasks: List[str]) -> str:
        try:
            logger.info(f"Fetching estimate description for tasks: {tasks}")
            estimate_doc = self.tasks_collection.find_one(
                {"Task": {"$all": tasks}},
                {"original_filename": 1}
            )
            if estimate_doc:
                original_filename = estimate_doc.get("original_filename")
                logger.info(f"Found estimate description: {original_filename}")
                return original_filename
            logger.warning("no matching document found in task_coolection")
            return "no matching description found"
            
        except Exception as e:
            logger.error(f"Error fetching estimate description: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error fetching estimate description: {str(e)}"
            )
    async def _generate_estimate_id(self) -> str:
        logger.info("Generating estimate ID")
        try:
            logger.info("finding count of estimates")
            count = self.estimates_collection.count_documents({})
            logger.info(f"Count of estimates: {count}")
            if count == 0:
                print("No estimates found, starting with EST-001")
                return "EST-001"
            last_estimate = self.estimates_collection.find_one(
                {},
                sort=[("createdAt",-1)],
                projection={"id":1}
            )
            if last_estimate is None:
                return "EST-001"
            last_id_str = last_estimate.get("id", "EST-000")
            last_id = int(last_id_str.split("-")[1])
            new_id = f"EST-{last_id + 1:03d}"
            
            return new_id
        except Exception as e:
            logger.error(f"Error generating estimate ID: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error generating estimate ID: {str(e)}")
        
        # findings level spare parts
    async def get_spare_parts_findings(self, task_id: str) -> List[SpareResponse]:
        """
        Helper method to get spare parts for a task
        """
        try:
            logger.info(f"Fetching spare parts for task_id: {task_id}")
            pipeline = [
                {"$match": {"SourceTaskDiscrep": task_id}},
                {'$lookup': {
                    'from': 'sub_task_parts', 
                    'localField': 'LogItem', 
                    'foreignField': 'Task', 
                    'as': 'spare'
                    }},
                {'$unwind': {
                        'path': '$spare'
                          }},
                {
                    "$group": {
                         "_id": "$LogItem",
                        "spareParts": {
                            "$push": {
                                "partId": "$spare.IssuedPart",
                                "desc": "$spare.PartDescription",
                                "unit": "$spare.IssuedUOM",
                                "qty": "$spare.UsedQty",
                                "price": {"$ifNull": ["$spare.TotalBillablePrice", 0.0]}
                            }
                        }
                    }
                },
                {"$project": {"logItem": "$_id", "spareParts": 1,"_id": 0,}}
            ]
            results = list(self.sub_task_collection.aggregate(pipeline))
            if not results:
                logger.warning(f"No spare parts found for task_id: {task_id}")
                return []
            spareParts=[]
            for result in results:
                log_item=result["logItem"]
                for spare in result["spareParts"]:
                    spareParts.append(SpareResponse(
                         logItem=log_item,**spare))

            
            
            return spareParts
    
        except Exception as e:
            logger.error(f"Error fetching spare parts: {str(e)}")
            return []      

    # mahhrs at findings level
    async def get_man_hours_findings(self, source_task: str) -> List[FindingsManHoursModel]:
        """
        Get man hours statistics for a specific source task
        """
        logger.info(f"Fetching man hours for source task: {source_task}")

        try:
            pipeline = [
                {"$match": {"SourceTaskDiscrep": source_task}},
                {
                    "$group": {
                        "_id": "$LogItem",
                        "description": {"$first": "$Description"},
                        "probability": {"$first": "$prob"}, 
                        "min": {"$min": "$ActualManHrs"},
                        "max": {"$max": "$ActualManHrs"},
                        "avg": {"$avg": "$ActualManHrs"},
                        "est": {"$avg": "$EstManHrs"}
                    }
                }
            ]

            results = list(self.sub_task_collection.aggregate(pipeline))
            logger.info(f"Aggregation results: len={len(results)}")

            if not results:
                logger.warning(f"No data found for source task: {source_task}")
                raise HTTPException(
                    status_code=404,
                    detail=f"No data found for source task: {source_task}"
                )
            # task = results[0]
            task_man_hours = [
                FindingsManHoursModel(
                    logItem=task["_id"],
                    desciption=task["description"],
                    mhs=ManHrs(
                        min=task["min"],
                        max=task["max"],
                        avg=task["avg"],
                        est=task["est"]
            )
            )
            for task in results
            ]
            return task_man_hours

        except Exception as e:
            logger.error(f"Error fetching man hours: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error fetching man hours: {str(e)}"
            )


            

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
    


    async def get_parts_usage(self, part_id: str) -> Dict:
        """
        Get parts usage for a specific part_id within a date range.
        """
        try:
            logger.info(f"Fetching parts usage for part_id: {part_id}")

            # Convert date strings to ISODate format
            #start_date_iso = datetime.strptime(start_date, "%d-%m-%Y")
            #end_date_iso = datetime.strptime(end_date, "%d-%m-%Y")

            # Pipeline for task_parts
            task_parts_pipeline = [
                {
                    "$match": {
                        "RequestedPart": part_id
                    }
                },
                {
                    "$lookup": {
                        "from": "task_description",
                        "localField": "Task",
                        "foreignField": "Task",
                        "as": "task_details"
                    }
                },
                {
                    "$unwind": "$task_details"
                },
                {
                    "$group": {
                        "_id": "$RequestedPart",
                        "tasks": {
                            "$push": {
                                "taskId": "$Task",
                                "taskDescription": "$task_details.Description",
                                "partDescription": "$PartDescription",
                                "packages": [
                                    {
                                        "packageId": "$Folder_Name",
                                        "quantity": "$RequestedQty"
                                    }
                                ]
                            }
                        }
                    }
                }
            ]


            # Pipeline for sub_task_parts
            sub_task_parts_pipeline = [
                {"$match": {"IssuedPart": part_id}},
                {"$group": {
                    "_id": "$IssuedPart",
                    "findings": {
                        "$push": {
                            "taskId": "$Task",
                            "taskDescription": "$TaskDescription",
                            "packageId": "$Package",
                            "date": "$IssueDate",
                            "quantity": "$UsedQty",
                            "stockStatus": "$StockStatus",
                            "priceUSD": "$BillableValueUSD"
                        }
                    }
                }}
            ]
            """            # Execute pipelines
            task_parts_result = list(self.taskparts_collection.aggregate(task_parts_pipeline))
            sub_task_parts_result = list(self.subtaskparts_collection.aggregate(sub_task_parts_pipeline))

            logger.info(f"Results of parts usage for part_id: {task_parts_result} and {sub_task_parts_result}")

            if not task_parts_result and not sub_task_parts_result:
                logger.warning(f"No parts usage found for part_id: {part_id}")
                return None

            # Parse results into data models
            tasks = [
                Task(
                    taskId=t["taskId"],
                    taskDescription=t["taskDescription"],
                    partDescription=t["partDescription"],
                    packages=[Package(**pkg) for pkg in t["packages"]]
                )
                for t in (task_parts_result[0].get("tasks", []) if task_parts_result else [])
            ]

            findings = [
                Finding(
                    taskId=f["taskId"],
                    taskDescription=f["taskDescription"],
                    packageId=f["packageId"],
                    date=f["date"],
                    quantity=f["quantity"],
                    stockStatus=f.get("stockStatus"),
                    priceUSD=f.get("priceUSD")
                )
                for f in (sub_task_parts_result[0].get("findings", []) if sub_task_parts_result else [])
            ]

            # Construct final response
            response = PartsUsageResponse(
                partId=part_id,
                partDescription=tasks[0].partDescription if tasks else "",
                usage=Usage(tasks=tasks, findings=findings)
            )
            logger.info(f"the response is {response}")

            return task_parts_result"""
            
            # Execute pipelines
            task_parts_result = list(self.taskparts_collection.aggregate(task_parts_pipeline))
            sub_task_parts_result = list(self.subtaskparts_collection.aggregate(sub_task_parts_pipeline))
            logger.info(f"Results of parts usage for part_id: {task_parts_result} and {sub_task_parts_result}")

            if not task_parts_result and not sub_task_parts_result:
                logger.warning(f"No parts usage found for part_id: {part_id}")
                return {}

            # Construct final output
            output = {
                "partId": part_id,
                "partDescription": task_parts_result[0].get("tasks", [{}])[0].get("PartDescription", "") if task_parts_result else "",
                "usage": {
                "tasks": task_parts_result[0]["tasks"] if task_parts_result else [],
                "findings": sub_task_parts_result[0]["findings"] if sub_task_parts_result else []
            }
            }


            return output

        except Exception as e:
            logger.error(f"Error fetching parts usage: {str(e)}")
            return None
        

    async def get_skills_analysis(self, source_tasks: str) :
        """
        Analyzes skills required for tasks from an uploaded Excel file.
        Returns required skills and man-hours at both task and findings levels.
        """
        try:
            """
            # Ensure source_tasks is a list of strings
            if not isinstance(source_tasks, list) or not all(isinstance(task, str) for task in source_tasks):
                logger.error("Invalid source_tasks format. Expected a list of strings.")
                return None
            """

            logger.info(f"Extracted Source Tasks: {source_tasks}")

            # MongoDB pipeline for tasks
            task_skill_pipeline = [
                {"$match": {"Task": source_tasks}},
                {
                    "$group": {
                        "_id": "$Task",
                        "taskDescription": {"$first": "$Description"},
                        "skills": {
                            "$push": {
                                "skill": "$Skill",
                                "manHours": {
                                    "min": {"$min": "$ActualManHrs"},
                                    "avg": {"$avg": "$ActualManHrs"},
                                    "max": {"$max": "$ActualManHrs"}
                                }
                            }
                        }
                    }
                }
            ]

            # MongoDB pipeline for sub-task findings
            sub_tasks_skill_pipeline = [
                {"$match": {"SourceTaskDiscrep": source_tasks}},
                {
                    "$group": {
                        "_id": "$SourceTaskDiscrep",
                        "skills": {
                            "$push": {
                                "skill": "$Skill",
                                "manHours": {
                                    "min": {"$min": "$ActualManHrs"},
                                    "avg": {"$avg": "$ActualManHrs"},
                                    "max": {"$max": "$ActualManHrs"}
                                }
                            }
                        }
                    }
                }
            ]

            # Execute MongoDB queries
            task_skill_results = list(self.tasks_collection.aggregate(task_skill_pipeline))
            sub_task_skill_results = list(self.sub_task_collection.aggregate(sub_tasks_skill_pipeline))
            logger.info(f"the skill analysis of Source Tasks: {task_skill_results} and {sub_task_skill_results}")
            
            """


            # Process results into response format
            tasks = [
                TaskAnalysis(
                    taskId=task["_id"],
                    taskDescription=task.get("taskDescription", ""),
                    skills=[SkillDetail(**skill) for skill in task["skills"]]
                )
                for task in task_skill_results
            ]

            findings = [
                TaskAnalysis(
                    taskId=sub_task["_id"],
                    skills=[SkillDetail(**skill) for skill in sub_task["skills"]]
                )
                for sub_task in sub_task_skill_results
            ]
            logger.info(f"the processed skill analysis of Source Tasks:{tasks} and {findings}")

            # Construct final response
            response = SkillAnalysisResponse(
                skillAnalysis={
                    "tasks": tasks,
                    "findings": findings
                }
            )
            """
        # Convert results into required format (as a dictionary)
            tasks = [
                {
                    "taskId": task["_id"],
                    "taskDescription": task.get("taskDescription", ""),
                    "skills": [
                        {
                            "skill": skill["skill"],
                            "manHours": skill["manHours"]
                        }
                        for skill in task["skills"]
                    ]
                }
                for task in task_skill_results
            ]

            findings = [
                {
                    "taskId": sub_task["_id"],
                    "skills": [
                        {
                            "skill": skill["skill"],
                            "manHours": skill["manHours"]
                        }
                        for skill in sub_task["skills"]
                    ]
                }
                for sub_task in sub_task_skill_results
            ]

            logger.info(f"Processed skill analysis for Source Tasks: {tasks} and Findings: {findings}")

            # Construct final response as a dictionary
            response = {
                "skillAnalysis": {
                    "tasks": tasks,
                    "findings": findings
                }
            }

            return response

        except Exception as e:
            logger.error(f"Error fetching skills analysis: {str(e)}")
            return {"error": "An error occurred while processing the request."}


    async def get_estimate_by_id(self, estimate_id: str) -> Estimate:
        """
        Get estimate by ID
        """
        logger.info(f"Fetching estimate by ID: {estimate_id}")

        try:
            estimate_doc = self.estimates_collection.find_one(
                {"id": estimate_id}
            )
            if estimate_doc is None:
                logger.warning(f"No estimate found for ID: {estimate_id}")
                raise HTTPException(
                    status_code=404,
                    detail=f"No estimate found for ID: {estimate_id}"
                )
            return estimate_doc
        except Exception as e:
            logger.error(f"Error fetching estimate: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error fetching estimate: {str(e)}"
            )
           