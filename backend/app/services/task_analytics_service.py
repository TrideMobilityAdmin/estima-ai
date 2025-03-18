from app.models.task_models import TaskManHoursModel,ManHrs,FindingsManHoursModel,ProbabilityWiseManhrsSpareCost
from statistics import mean
from fastapi import HTTPException,Depends,status
from typing import List , Dict,Optional,Any
import pandas as pd
from app.middleware.auth import get_current_user
from typing import List
from datetime import datetime
from fastapi import UploadFile, File
from app.models.estimates import ValidTasks,ValidRequest,EstimateStatus
from datetime import datetime,timezone
import re
from collections import defaultdict
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
    AggregatedFindings,
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
        self.estimates_collection = self.mongo_client.get_collection("estima_output")
        self.task_spareparts_collection=self.mongo_client.get_collection("task_parts")
        # self.tasks_collection = self.mongo_client.get_collection("tasks")
        self.spareparts_collection=self.mongo_client.get_collection("spares-qty")
        self.taskparts_collection=self.mongo_client.get_collection("task_parts")
        self.subtaskparts_collection=self.mongo_client.get_collection("sub_task_parts")
        # self.tasks_collection = self.mongo_client.get_collection("tasks")
        # self.tasks_collection=self.mongo_client.get_collection("task_description")
        self.tasks_collection = self.mongo_client.get_collection("estima_input_upload")
        self.taskdescription_collection=self.mongo_client.get_collection("task_description")
        self.sub_task_collection=self.mongo_client.get_collection("sub_task_description")
        self.estimates_status_collection=self.mongo_client.get_collection("estimates_status")
        self.configurations_collection=self.mongo_client.get_collection("configurations")
    
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
                    estID=str(estimate["estID"]),
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
    async def validate_tasks(self, estimate_request: ValidRequest, current_user: dict = Depends(get_current_user)) -> List[ValidTasks]:
        """
        Validate tasks by checking if they exist in the task_description collection.
        """
        try:
            task_ids = estimate_request.tasks

            # Query MongoDB to check which tasks exist
            existing_tasks_list = self.taskdescription_collection.find(
                {"task_number": {"$in": task_ids}}, {"_id": 0, "task_number": 1}
            )
            existing_tasks_list = list(existing_tasks_list)  
            existing_tasks = list(doc["task_number"] for doc in existing_tasks_list)
            validated_tasks = [
                ValidTasks(taskid=task, status=(task in existing_tasks))
                for task in task_ids
            ]
            return validated_tasks

        except Exception as e:
            logger.error(f"Error validating tasks: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error validating tasks: {str(e)}"
            )
    
    
    # async def estimate_status(self,estimate_request:EstimateRequest,current_user:dict=Depends(get_current_user))->EstimateStatus:
    #     """
    #     Create a estimate status based on the provided tasks and parameters.
    #     """
    #     try:
    #         estimate_id = await self._generate_estimateid()
    #         estimate_status_doc = {
    #             "estID": estimate_id,
    #             "status":"Initiated"
    #         }
    #         self.estimates_status_collection.insert_one(estimate_status_doc)
    #         response = EstimateStatus(estID=estimate_id, status="Estimate status created successfully")
    #         return response
    #     except Exception as e:
    #         logger.error(f"Error creating estimate status: {str(e)}")
    #         raise HTTPException(status_code=422, detail=f"Error creating estimate status: {str(e)}")

    async def create_estimate(self, estimate_request: EstimateRequest,current_user:dict=Depends(get_current_user)) -> EstimateResponse:
        """
        Create a new estimate based on the provided tasks and parameters.
        """
        logger.info("Creating new estimate")
        try:
            current_time = datetime.now(timezone.utc)

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

                     
            try:
                estimate_id = await self._generate_estimate_id()
                description = await self._get_estimate_description(estimate_request.tasks)
                logger.info(f'description at task level: {description}')
            except Exception as e: 
                logger.error(f"Error generating estimate ID or description: {str(e)}")
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Failed to generate estimate ID or description")
            estimate_doc = {
                "estID":estimate_id,
                "description": description,
                "tasks": [task.model_dump() for task in processed_tasks],
                "aggregatedTasks": aggregated_tasks.model_dump(),
                "findings": [finding.model_dump() for finding in findings_list],
                "aggregatedFindingsByTask": [agg.model_dump() for agg in aggregated_findings_by_task],
                "aggregatedFindings": aggregated_findings.model_dump(),
                "userID":current_user["_id"],
                "createdAt": current_time,
                "lastUpdated": current_time,
                "createdBy":current_user["email"],
                "updatedBy":current_user["_id"],
                "originalFilename":description
                
            }

            result = self.estimates_collection.insert_one(estimate_doc)
            download_link = f"/estimates/{estimate_id}/download"
            
            response = EstimateResponse(
                estID=estimate_id,
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
                originalFilename=description,
                downloadEstimate=download_link

            )

            return response

        except Exception as e:
            logger.error(f"Error creating estimate: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
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
            logger.info("Finding count of estimates")
            count = self.estimates_collection.count_documents({})  # Await count
            logger.info(f"Count of estimates: {count}")

            if count == 0:
                logger.info("No estimates found, starting with EST-001")
                return "EST-001"

        # Fetch the last inserted estimate
            last_estimate = self.estimates_collection.find_one(
                {},
                sort=[("_id", -1)],  # Ensure we get the latest inserted document
                projection={"estID": 1}
            )

            logger.info(f"Last estimate found: {last_estimate}")  # Debugging log

            if not last_estimate or "estID" not in last_estimate:
                logger.warning("No estID found in the last estimate, defaulting to EST-001")
                return "EST-001"

            last_id_str = last_estimate["estID"]
            last_id = int(last_id_str.split("-")[1])
            new_id = f"EST-{last_id + 1:03d}"
        
            logger.info(f"Generated new estimate ID: {new_id}")
            return new_id

        except Exception as e:
            logger.error(f"Error generating estimate ID: {str(e)}")
            raise HTTPException(status_code=422, detail=f"Error generating estimate ID: {str(e)}")
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
    
    async def get_parts_usage(self, part_id: str, startDate: datetime, endDate: datetime) -> Dict:
        logger.info(f"startDate and endDate are:\n{startDate,endDate}")
        """
        Get parts usage for a specific part_id within a date range.
        """
        
        try:
            logger.info(f"Fetching parts usage for part_id: {part_id}")
            # Pipeline for task_parts
            task_parts_pipeline =[
    {
        '$match': {
            'requested_part_number': part_id, 
            'requested_stock_status': {
                '$ne': 'Owned'
            }
        }
    }, {
        '$lookup': {
            'from': 'task_description', 
            'let': {
                'package_number': '$package_number', 
                'task_number': '$task_number'
            }, 
            'pipeline': [
                {
                    '$match': {
                        '$expr': {
                            '$and': [
                                {
                                    '$eq': [
                                        '$package_number', '$$package_number'
                                    ]
                                }, {
                                    '$eq': [
                                        '$task_number', '$$task_number'
                                    ]
                                }
                            ]
                        }
                    }
                }, {
                    '$project': {
                        'package_number': '$package_number', 
                        'actual_start_date': 1, 
                        'actual_end_date': 1, 
                        'description': 1, 
                        '_id': 0
                    }
                }
            ], 
            'as': 'task_info'
        }
    }, {
        '$unwind': {
            'path': '$task_info', 
            'preserveNullAndEmptyArrays': True
        }
    }, {
        '$match': {
            '$expr': {
                '$and': [
                    {
                        '$gte': [
                            '$task_info.actual_start_date', startDate
                        ]
                    }, {
                        '$lt': [
                            '$task_info.actual_end_date', endDate
                        ]
                    }
                ]
            }
        }
    }, {
        '$lookup': {
            'from': 'aircraft_details', 
            'localField': 'package_number', 
            'foreignField': 'package_number', 
            'as': 'aircraft_info'
        }
    }, {
        '$unwind': {
            'path': '$aircraft_info', 
            'preserveNullAndEmptyArrays': True
        }
    }, {
        '$facet': {
            'mainData': [
                {
                    '$group': {
                        '_id': '$requested_part_number', 
                        'partDescription': {
                            '$first': '$part_description'
                        }, 
                        'tasks': {
                            '$push': {
                                'taskId': '$task_number', 
                                'taskDescription': '$task_info.description', 
                                'packages': [
                                    {
                                        'packageId': '$task_info.package_number', 
                                        'date': '$task_info.actual_start_date', 
                                        'quantity': '$requested_quantity', 
                                        'stockStatus': '$requested_stock_status', 
                                        'aircraftModel': '$aircraft_info.aircraft_model'
                                    }
                                ]
                            }
                        }
                    }
                }
            ], 
            'aircraftModels': [
                {
                    '$group': {
                        '_id': '$aircraft_info.aircraft_model', 
                        'count': {
                            '$sum': 1
                        }
                    }
                }, {
                    '$match': {
                        '_id': {
                            '$ne': None
                        }
                    }
                }, {
                    '$project': {
                        'aircraftModel': '$_id', 
                        'count': 1, 
                        '_id': 0
                    }
                }, {
                    '$sort': {
                        'count': -1
                    }
                }
            ], 
            'stockStatuses': [
                {
                    '$group': {
                        '_id': '$requested_stock_status', 
                        'count': {
                            '$sum': 1
                        }
                    }
                }, {
                    '$match': {
                        '_id': {
                            '$ne': None
                        }
                    }
                }, {
                    '$project': {
                        'statusCode': '$_id', 
                        'count': 1, 
                        '_id': 0
                    }
                }, {
                    '$sort': {
                        'count': -1
                    }
                }
            ]
        }
    }, {
        '$project': {
            'partData': {
                '$arrayElemAt': [
                    '$mainData', 0
                ]
            }, 
            'summary': {
                'aircraftModels': '$aircraftModels', 
                'stockStatuses': '$stockStatuses'
            }
        }
    }, {
        '$project': {
            '_id': '$partData._id', 
            'partDescription': '$partData.partDescription', 
            'tasks': '$partData.tasks', 
            'summary': 1
        }
    }
]

            # Pipeline for sub_task_parts
            sub_task_parts_pipeline = [
    {
        '$match': {
            'issued_part_number': part_id
        }
    }, {
        '$addFields': {
            'isHMV': {
                '$substr': [
                    '$task_number', 0, 3
                ]
            }
        }
    }, {
        '$facet': {
            'hmvTasks': [
                {
                    '$match': {
                        'isHMV': 'HMV'
                    }
                }, {
                    '$lookup': {
                        'from': 'aircraft_details', 
                        'localField': 'package_number', 
                        'foreignField': 'package_number', 
                        'as': 'aircraft_info'
                    }
                }, {
                    '$unwind': {
                        'path': '$aircraft_info', 
                        'preserveNullAndEmptyArrays': True
                    }
                }, {
                    '$lookup': {
                        'from': 'sub_task_description', 
                        'localField': 'task_number', 
                        'foreignField': 'log_item_number', 
                        'as': 'task_info', 
                        'pipeline': [
                            {
                                '$project': {
                                    'convertedPackage': '$package_number', 
                                    'actual_start_date': 1, 
                                    'actual_end_date': 1, 
                                    'source_task_discrepancy_number': 1, 
                                    'log_item_number': 1, 
                                    '_id': 0
                                }
                            }
                        ]
                    }
                }, {
                    '$unwind': {
                        'path': '$task_info', 
                        'preserveNullAndEmptyArrays': True
                    }
                }, {
                    '$match': {
                        '$expr': {
                            '$and': [
                                {
                                    '$gte': [
                                        '$task_info.actual_start_date', startDate
                                    ]
                                }, {
                                    '$lt': [
                                        '$task_info.actual_end_date', endDate
                                    ]
                                }
                            ]
                        }
                    }
                }, {
                    '$lookup': {
                        'from': 'task_description', 
                        'let': {
                            'source_task': '$task_info.source_task_discrepancy_number', 
                            'pkg_num': '$package_number'
                        }, 
                        'pipeline': [
                            {
                                '$match': {
                                    '$expr': {
                                        '$and': [
                                            {
                                                '$eq': [
                                                    '$task_number', '$$source_task'
                                                ]
                                            }, {
                                                '$eq': [
                                                    '$package_number', '$$pkg_num'
                                                ]
                                            }
                                        ]
                                    }
                                }
                            }, {
                                '$project': {
                                    'Description': {
                                        '$ifNull': [
                                            '$description', ''
                                        ]
                                    }, 
                                    '_id': 0
                                }
                            }
                        ], 
                        'as': 'task_desc'
                    }
                }, {
                    '$unwind': {
                        'path': '$task_desc', 
                        'preserveNullAndEmptyArrays': True
                    }
                }
            ], 
            'nonHmvTasks': [
                {
                    '$match': {
                        'isHMV': {
                            '$ne': 'HMV'
                        }
                    }
                }, {
                    '$lookup': {
                        'from': 'aircraft_details', 
                        'localField': 'package_number', 
                        'foreignField': 'package_number', 
                        'as': 'aircraft_info'
                    }
                }, {
                    '$unwind': {
                        'path': '$aircraft_info', 
                        'preserveNullAndEmptyArrays': True
                    }
                }, {
                    '$lookup': {
                        'from': 'task_description', 
                        'let': {
                            'task_num': '$task_number', 
                            'pkg_num': '$package_number'
                        }, 
                        'pipeline': [
                            {
                                '$match': {
                                    '$expr': {
                                        '$and': [
                                            {
                                                '$eq': [
                                                    '$task_number', '$$task_num'
                                                ]
                                            }, {
                                                '$eq': [
                                                    '$package_number', '$$pkg_num'
                                                ]
                                            }
                                        ]
                                    }
                                }
                            }, {
                                '$project': {
                                    'actual_start_date': 1, 
                                    'actual_end_date': 1, 
                                    'Description': {
                                        '$ifNull': [
                                            '$description', ''
                                        ]
                                    }, 
                                    '_id': 0
                                }
                            }
                        ], 
                        'as': 'task_desc1'
                    }
                }, {
                    '$unwind': {
                        'path': '$task_desc1', 
                        'preserveNullAndEmptyArrays': True
                    }
                }, {
                    '$match': {
                        '$expr': {
                            '$and': [
                                {
                                    '$gte': [
                                        '$task_desc1.actual_start_date', startDate
                                    ]
                                }, {
                                    '$lt': [
                                        '$task_desc1.actual_end_date',endDate
                                    ]
                                }
                            ]
                        }
                    }
                }, {
                    '$group': {
                        '_id': '$task_number', 
                        'taskId': {
                            '$first': '$task_number'
                        }, 
                        'taskDescription': {
                            '$first': '$task_desc1.Description'
                        }, 
                        'packages': {
                            '$push': {
                                'packageId': '$package_number', 
                                'logItem': '$task_number', 
                                'description': '$task_description', 
                                'date': '$task_desc1.actual_start_date', 
                                'stockStatus': '$stock_status', 
                                'quantity': '$used_quantity', 
                                'aircraftModel': '$aircraft_info.aircraft_model'
                            }
                        }
                    }
                }
            ], 
            'aircraftModels': [
                {
                    '$lookup': {
                        'from': 'aircraft_details', 
                        'localField': 'package_number', 
                        'foreignField': 'package_number', 
                        'as': 'aircraft_info'
                    }
                }, {
                    '$unwind': {
                        'path': '$aircraft_info', 
                        'preserveNullAndEmptyArrays': True
                    }
                }, {
                    '$group': {
                        '_id': '$aircraft_info.aircraft_model', 
                        'count': {
                            '$sum': 1
                        }
                    }
                }, {
                    '$match': {
                        '_id': {
                            '$ne': None
                        }
                    }
                }
            ], 
            'stockStatuses': [
                {
                    '$group': {
                        '_id': '$stock_status', 
                        'count': {
                            '$sum': 1
                        }
                    }
                }, {
                    '$match': {
                        '_id': {
                            '$ne': None
                        }
                    }
                }
            ]
        }
    }, {
        '$project': {
            'hmvFindings': {
                '$map': {
                    'input': '$hmvTasks', 
                    'as': 'hmvTask', 
                    'in': {
                        '_id': '$$hmvTask.issued_part_number', 
                        'findings': {
                            'taskId': '$$hmvTask.task_info.source_task_discrepancy_number', 
                            'taskDescription': '$$hmvTask.task_desc.Description', 
                            'packages': [
                                {
                                    'packageId': '$$hmvTask.package_number', 
                                    'logItem': '$$hmvTask.task_number', 
                                    'description': '$$hmvTask.task_description', 
                                    'date': {
                                        '$ifNull': [
                                            '$$hmvTask.task_info.actual_start_date',datetime(1, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
                                        ]
                                    }, 
                                    'stockStatus': '$$hmvTask.stock_status', 
                                    'quantity': '$$hmvTask.used_quantity', 
                                    'aircraftModel': '$$hmvTask.aircraft_info.aircraft_model'
                                }
                            ]
                        }
                    }
                }
            }, 
            'nonHmvFindings': {
                '$map': {
                    'input': '$nonHmvTasks', 
                    'as': 'nonHmvTask', 
                    'in': {
                        '_id': '$$nonHmvTask.issued_part_number', 
                        'findings': {
                            'taskId': '$$nonHmvTask.taskId', 
                            'taskDescription': '$$nonHmvTask.taskDescription', 
                            'packages': '$$nonHmvTask.packages'
                        }
                    }
                }
            }, 
            'aircraftModels': '$aircraftModels', 
            'stockStatuses': '$stockStatuses'
        }
    }, {
        '$project': {
            'findings': {
                'hmvTasks': '$hmvFindings', 
                'nonHmvTasks': '$nonHmvFindings'
            }, 
            'summary': {
                'aircraftModels': {
                    '$map': {
                        'input': '$aircraftModels', 
                        'as': 'model', 
                        'in': {
                            'aircraftModel': '$$model._id', 
                            'count': '$$model.count'
                        }
                    }
                }, 
                'stockStatuses': {
                    '$map': {
                        'input': '$stockStatuses', 
                        'as': 'status', 
                        'in': {
                            'statusCode': '$$status._id', 
                            'count': '$$status.count'
                        }
                    }
                }
            }
        }
    }
]
         
            task_parts_result = list(self.taskparts_collection.aggregate(task_parts_pipeline))
            sub_task_parts_result = list(self.subtaskparts_collection.aggregate(sub_task_parts_pipeline))

            logger.info(f"Results of task_parts: {len(task_parts_result)}\n")
            logger.info(f"Results of sub_task_parts: {len(sub_task_parts_result)}\n")

            if not task_parts_result and not sub_task_parts_result:
                logger.warning(f"No parts usage found for part_id: {part_id}")
                return {"data": {}, "response": {"statusCode": 404, "message": "No PartID found in the given Date range"}}
           
            # Initialize aircraft details with empty arrays as default
            task_parts_aircraft_details = {
                "aircraftModels": [],
                "stockStatuses": []
            }

            sub_task_parts_aircraft_details = {
                "aircraftModels": [],
                "stockStatuses": []
            }

            # Only update aircraft details if there are actual tasks
            if task_parts_result and len(task_parts_result[0].get("tasks", [])) > 0:
                task_parts_aircraft_details = {
                    "aircraftModels": task_parts_result[0].get("summary", {}).get("aircraftModels", []),
                    "stockStatuses": task_parts_result[0].get("summary", {}).get("stockStatuses", [])
                }

            # Only update sub_task aircraft details if there are actual findings and they're not empty
            findings = sub_task_parts_result[0].get("findings", {}) if sub_task_parts_result else {}
            hmv_tasks = findings.get("hmvTasks", [])
            non_hmv_tasks = findings.get("nonHmvTasks", [])
            
            if (sub_task_parts_result and 
                hmv_tasks and  # Check if hmvTasks is not empty
                (len(hmv_tasks) > 0 or len(non_hmv_tasks) > 0)):
                sub_task_parts_aircraft_details = {
                    "aircraftModels": sub_task_parts_result[0].get("summary", {}).get("aircraftModels", []),
                    "stockStatuses": sub_task_parts_result[0].get("summary", {}).get("stockStatuses", [])
                }

            output = {
                "partId": part_id,
                "partDescription": task_parts_result[0].get("partDescription", "") if task_parts_result else "",
                "usage": {
                    "tasks": [
                        {
                            "taskId": t.get("taskId",""),
                            "taskDescription": t.get("taskDescription",""),
                            "packages": [
                                {"packageId": pkg["packageId"],"stockStatus":pkg["stockStatus"],"date": pkg.get("date", "0001-01-01T00:00:00Z"), "quantity": pkg["quantity"],"aircraftModel":pkg["aircraftModel"]}
                                for pkg in t.get("packages", [])
                            ]
                        }
                        for t in (task_parts_result[0].get("tasks", []) if task_parts_result else [])
                    ],
                    "findings": {
                        "hmvTasks": [
                            {
                                "taskId": task.get("findings", {}).get("taskId", ""),
                                "taskDescription": task.get("findings", {}).get("taskDescription", ""),
                                "packages": [
                                    {
                                        "packageId": pkg["packageId"],
                                        "logItem": pkg.get("logItem", ""),
                                        "description": pkg.get("description", ""),
                                        "date": pkg.get("date", "0001-01-01T00:00:00Z"),
                                        "stockStatus": pkg.get("stockStatus", ""),
                                        "quantity": pkg["quantity"]
                                    }
                                    for pkg in task.get("findings", {}).get("packages", [])
                                ]
                            }
                            for task in sub_task_parts_result[0].get("findings", {}).get("hmvTasks", [])
                        ] if sub_task_parts_result else [],
                        "nonHmvTasks": [
                            {
                                "taskId": task.get("findings", {}).get("taskId", ""),
                                "taskDescription": task.get("findings", {}).get("taskDescription", ""),
                                "packages": [
                                    {
                                        "packageId": pkg["packageId"],
                                        "logItem": pkg.get("logItem", ""),
                                        "description": pkg.get("description", ""),
                                        "date": pkg.get("date", "0001-01-01T00:00:00Z"),
                                        "stockStatus": pkg.get("stockStatus", ""),
                                        "quantity": pkg["quantity"],
                                        "aircraftModel": pkg.get("aircraftModel", "")
                                    }
                                    for pkg in task.get("findings", {}).get("packages", [])
                                ]
                            }
                            for task in sub_task_parts_result[0].get("findings", {}).get("nonHmvTasks", [])
                        ] if sub_task_parts_result else []
                    }
                },
                "aircraftDetails": {
                    "task_parts_aircraft_details": task_parts_aircraft_details,
                    "sub_task_parts_aircraft_details": sub_task_parts_aircraft_details
                }    
            }

            date_qty = defaultdict(lambda: {"tasksqty": 0, "findingsqty": 0})
            logger.info("Processing tasks to calculate date-wise quantities.")
            for task in output["usage"]["tasks"]:
                logger.info(f"Processing task: {task['taskId']} - {task['taskDescription']}")
                for pkg in task["packages"]:
                    date_key = pkg["date"].strftime("%Y-%m-%d") if isinstance(pkg["date"], datetime) else pkg["date"]  # Extract date only
                    date_qty[date_key]["tasksqty"] += pkg["quantity"]  # Sum the quantities
                    logger.info(f"Added {pkg['quantity']} to tasksqty for date {date_key}. Current total: {date_qty[date_key]['tasksqty']}")

            logger.info("Processing findings to calculate date-wise quantities.")
            for finding_type in ["hmvTasks", "nonHmvTasks"]:
                for task in output["usage"]["findings"].get(finding_type, []):
                    logger.info(f"Processing finding: {task.get('taskId', '')} - {task.get('taskDescription', '')}")
                    for pkg in task.get("packages", []):
                        date_key = pkg["date"].strftime("%Y-%m-%d") if isinstance(pkg["date"], datetime) else pkg["date"]
                        date_qty[date_key]["findingsqty"] += pkg["quantity"]
                        logger.info(f"Added {pkg['quantity']} to findingsqty for date {date_key}. Current total: {date_qty[date_key]['findingsqty']}")

            output["dateWiseQty"] = [{"date": date, **counts} for date, counts in date_qty.items()]
            logger.info(f"Final date-wise quantities:length={len(output['dateWiseQty'])}")

            return {"data": output, "response": {"statusCode": 200, "message": "Parts usage retrieved successfully"}}
        except Exception as e:
            logger.error(f"Error fetching parts usage for this api: {str(e)}")
            return {"data": {}, "response": {"statusCode": 404, "message": "No PartID found"}}
    
            

    async def get_skills_analysis(self, source_tasks: list[str]):
        """
        Analyzes skills required for multiple tasks.
        Returns required skills and man-hours at both task and findings levels.
        
        Args:
            source_tasks: List of task IDs to analyze
        """
        try:
            logger.info(f"Analyzing skills for tasks: {source_tasks}")
            logger.info(f"Analyzing skills for tasks: len={len(source_tasks)}")

            # MongoDB pipeline for tasks
            task_skill_pipeline = [
                {"$match": {"task_number": {"$in": source_tasks}}},  
                {
        '$group': {
            '_id': {
                'task_number': '$task_number', 
                'skill_number': '$skill_number'
            }, 
            'taskDescription': {
                '$first': '$description'
            }, 
            'actual_man_hours': {
                '$push': '$actual_man_hours'
            }
        }
    }, {
        '$group': {
            '_id': '$_id.task_number', 
            'taskDescription': {
                '$first': '$taskDescription'
            }, 
            'skills': {
                '$push': {
                    'skill': '$_id.skill_number', 
                    'manhours': {
                        'min': {
                            '$min': '$actual_man_hours'
                        }, 
                        'max': {
                            '$max': '$actual_man_hours'
                        }, 
                        'avg': {
                            '$avg': '$actual_man_hours'
                        }
                    }
                }
            }
        }
    }, {
        '$project': {
            '_id': 1, 
            'taskDescription': 1, 
            'skills': {
                '$map': {
                    'input': '$skills', 
                    'as': 'skill', 
                    'in': {
                        'skill': '$$skill.skill', 
                        'manhours': {
                            'min': {
                                '$round': [
                                    '$$skill.manhours.min', 2
                                ]
                            }, 
                            'max': {
                                '$round': [
                                    '$$skill.manhours.max', 2
                                ]
                            }, 
                            'avg': {
                                '$round': [
                                    '$$skill.manhours.avg', 2
                                ]
                            }
                        }
                    }
                }
            }
        }
    }
            ]

            # MongoDB pipeline for sub-task findings
            sub_tasks_skill_pipeline = [
                {"$match": {"source_task_discrepancy_number": {"$in": source_tasks}}},  # Modified to use $in operator
                {
        '$group': {
            '_id': {
                'task_number': '$source_task_discrepancy_number', 
                'skill_number': '$skill_number'
            }, 
            'actual_man_hours': {
                '$push': '$actual_man_hours'
            }
        }
    }, {
        '$group': {
            '_id': '$_id.task_number', 
            'skills': {
                '$push': {
                    'skill': '$_id.skill_number', 
                    'manhours': {
                        'min': {
                            '$min': '$actual_man_hours'
                        }, 
                        'max': {
                            '$max': '$actual_man_hours'
                        }, 
                        'avg': {
                            '$avg': '$actual_man_hours'
                        }
                    }
                }
            }
        }
    }, {
        '$project': {
            '_id': 1, 
            'skills': {
                '$map': {
                    'input': '$skills', 
                    'as': 'skill', 
                    'in': {
                        'skill': '$$skill.skill', 
                        'manhours': {
                            'min': {
                                '$round': [
                                    '$$skill.manhours.min', 2
                                ]
                            }, 
                            'max': {
                                '$round': [
                                    '$$skill.manhours.max', 2
                                ]
                            }, 
                            'avg': {
                                '$round': [
                                    '$$skill.manhours.avg', 2
                                ]
                            }
                        }
                    }
                }
            }
        }
    }
            ]

            # Execute MongoDB queries
            task_skill_results = list(self.taskdescription_collection.aggregate(task_skill_pipeline))
            sub_task_skill_results = list(self.sub_task_collection.aggregate(sub_tasks_skill_pipeline))
            
            logger.info(f"Retrieved skill analysis for tasks: len={len(task_skill_results)}")
            logger.info(f"Retrieved skill analysis for sub-tasks: len={len(sub_task_skill_results)}")
            if not task_skill_results and not sub_task_skill_results:
                logger.info("No data found for both tasks and sub-tasks")
                return {
                    "skillAnalysis": {},
                    "response": {"statusCode": 404, "message": "No data found for the specified tasks"}
                }

            # Process results into response format
            tasks = [
                {
                    "taskId": task["_id"],
                    "taskDescription": task.get("taskDescription", ""),
                    "skills": [
                        {
                            "skill": skill["skill"],
                            "manHours": skill["manhours"]
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
                            "manHours": skill["manhours"]
                        }
                        for skill in sub_task["skills"]
                    ]
                }
                for sub_task in sub_task_skill_results
            ]

            logger.info(f"Processed skill analysis for tasks: len={len(tasks)}")
            logger.info(f"Processed skill analysis for findings: len={len(findings)}")

            # Construct final response
            response = {
                "skillAnalysis": {
                    "tasks": tasks,
                    "findings": findings
                }
            }
            return response 
            # return {"data": response, "response": {"statusCode": 200, "message": "skill_analysis processed successfully"}}

        except Exception as e:
            logger.error(f"Error fetching skills analysis: {str(e)}")
            return {
                "skillAnalysis": {},
            "response": {"statusCode": 404, "message": f"An error occurred while processing the request: {str(e)}"}
            }
            # return {"data": {}, "response": {"statusCode": 404, "message": "An error occurred while processing the request"}}

   

    def get_estimate_by_id(self, estimate_id: str) -> Dict[str, Any]:
        """
        Get estimate by ID with filtered findings based on probability comparison
        Returns raw aggregation result directly from MongoDB
        """
        logger.info(f"Fetching estimate by ID: {estimate_id}")
        configurations = self.configurations_collection.find_one()
        man_hours_threshold = configurations.get('thresholds', {}).get('manHoursThreshold', 0)
        # valid_tasks_response =self.validate_tasks(current_user)
        # valid_task_ids = [task.taskid for task in valid_tasks_response if task.status]

        try:
            pipeline =[
    {
        '$match': {
            'estID': estimate_id
        }
    }, {
        '$lookup': {
            'from': 'estimate_file_upload', 
            'localField': 'estID', 
            'foreignField': 'estID', 
            'as': 'estimate'
        }
    }, {
        '$unwind': {
            'path': '$estimate', 
            'preserveNullAndEmptyArrays': True
        }
    }, {
        '$addFields': {
            'filteredFindings': {
                '$filter': {
                    'input': {
                        '$ifNull': [
                            '$findings', []
                        ]
                    }, 
                    'as': 'finding', 
                    'cond': {
                        '$gt': [
                            {
                                '$max': {
                                    '$map': {
                                        'input': {
                                            '$ifNull': [
                                                '$$finding.details', []
                                            ]
                                        }, 
                                        'as': 'detail', 
                                        'in': {
                                            '$ifNull': [
                                                '$$detail.prob', 0
                                            ]
                                        }
                                    }
                                }
                            }, {
                                '$ifNull': [
                                    '$estimate.probability', 0
                                ]
                            }
                        ]
                    }
                }
            }
        }
    }, {
        '$addFields': {
            'aggregatedFilteredFindings': {
                'totalMhs': {
                    '$sum': {
                        '$map': {
                            'input': '$filteredFindings', 
                            'as': 'finding', 
                            'in': {
                                '$sum': {
                                    '$map': {
                                        'input': '$$finding.details', 
                                        'as': 'detail', 
                                        'in': '$$detail.mhs.avg'
                                    }
                                }
                            }
                        }
                    }
                }, 
                'totalSpareCost': {
                    '$sum': {
                        '$map': {
                            'input': '$filteredFindings', 
                            'as': 'finding', 
                            'in': {
                                '$sum': {
                                    '$map': {
                                        'input': '$$finding.details', 
                                        'as': 'detail', 
                                        'in': {
                                            '$sum': {
                                                '$map': {
                                                    'input': '$$detail.spare_parts', 
                                                    'as': 'sparePart', 
                                                    'in': {
                                                        '$multiply': [
                                                            '$$sparePart.price', '$$sparePart.qty'
                                                        ]
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }, {
        '$addFields': {
            'estimate_manhrs': {
                'min': {
                    '$sum': [
                        {
                            '$sum': {
                                '$map': {
                                    'input': '$tasks', 
                                    'as': 'task', 
                                    'in': {
                                        '$ifNull': [
                                            '$$task.mhs.min', 0
                                        ]
                                    }
                                }
                            }
                        }, {
                            '$sum': {
                                '$map': {
                                    'input': '$filteredFindings', 
                                    'as': 'finding', 
                                    'in': {
                                        '$sum': {
                                            '$map': {
                                                'input': '$$finding.details', 
                                                'as': 'detail', 
                                                'in': {
                                                    '$ifNull': [
                                                        '$$detail.mhs.min', 0
                                                    ]
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    ]
                }, 
                'max': {
                    '$sum': [
                        {
                            '$sum': {
                                '$map': {
                                    'input': '$tasks', 
                                    'as': 'task', 
                                    'in': {
                                        '$ifNull': [
                                            '$$task.mhs.max', 0
                                        ]
                                    }
                                }
                            }
                        }, {
                            '$sum': {
                                '$map': {
                                    'input': '$filteredFindings', 
                                    'as': 'finding', 
                                    'in': {
                                        '$sum': {
                                            '$map': {
                                                'input': '$$finding.details', 
                                                'as': 'detail', 
                                                'in': {
                                                    '$ifNull': [
                                                        '$$detail.mhs.max', 0
                                                    ]
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    ]
                }, 
                'avg': {
                    '$sum': [
                        {
                            '$sum': {
                                '$map': {
                                    'input': '$tasks', 
                                    'as': 'task', 
                                    'in': {
                                        '$ifNull': [
                                            '$$task.mhs.avg', 0
                                        ]
                                    }
                                }
                            }
                        }, {
                            '$sum': {
                                '$map': {
                                    'input': '$filteredFindings', 
                                    'as': 'finding', 
                                    'in': {
                                        '$sum': {
                                            '$map': {
                                                'input': '$$finding.details', 
                                                'as': 'detail', 
                                                'in': {
                                                    '$ifNull': [
                                                        '$$detail.mhs.avg', 0
                                                    ]
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    ]
                }, 
                'est': {
                    '$sum': [
                        {
                            '$sum': {
                                '$map': {
                                    'input': '$tasks', 
                                    'as': 'task', 
                                    'in': {
                                        '$ifNull': [
                                            '$$task.mhs.est', 0
                                        ]
                                    }
                                }
                            }
                        }, {
                            '$sum': {
                                '$map': {
                                    'input': '$filteredFindings', 
                                    'as': 'finding', 
                                    'in': {
                                        '$sum': {
                                            '$map': {
                                                'input': '$$finding.details', 
                                                'as': 'detail', 
                                                'in': {
                                                    '$ifNull': [
                                                        '$$detail.mhs.est', 0
                                                    ]
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        }
    }, {
        '$addFields': {
            'tatTime': {
                '$divide': [
                    {
                        '$add': [
                            {
                                '$ifNull': [
                                    '$aggregatedTasks.totalMhs', 0
                                ]
                            }, {
                                '$ifNull': [
                                    '$aggregatedFilteredFindings.totalMhs', 0
                                ]
                            }
                        ]
                    }, man_hours_threshold
                ]
            }, 
            'estimatedSpareCost': {
                '$add': [
                    {
                        '$ifNull': [
                            '$aggregatedTasks.totalPartsCost', 0
                        ]
                    }, {
                        '$ifNull': [
                            '$aggregatedFilteredFindings.totalSpareCost', 0
                        ]
                    }
                ]
            }
        }
    }, {
        '$project': {
            '_id': 0, 
            'estID': 1, 
            'description': 1, 
            'overallEstimateReport': {
                'estimatedTatTime': '$tatTime', 
                'estimatedSpareCost': '$estimatedSpareCost', 
                'estimateManhrs': '$estimate_manhrs', 
                'spareParts': {
                    '$filter': {
                        'input': '$totalConsumption.totalParts', 
                        'as': 'part', 
                        'cond': {
                            '$gt': [
                                '$$part.qty', 1
                            ]
                        }
                    }
                }
            }, 
            'tasks': {
                '$map': {
                    'input': '$tasks', 
                    'as': 'task', 
                    'in': {
                        '$mergeObjects': [
                            '$$task', {
                                '_id': '$$REMOVE'
                            }
                        ]
                    }
                }
            }, 
            'aggregatedTasks': 1, 
            'findings': '$filteredFindings', 
            'aggregatedFindings': '$aggregatedFilteredFindings', 
            'originalFilename': 1, 
            'userID': {
                '$toString': '$userID'
            }, 
            'createdAt': 1, 
            'lastUpdated': 1, 
            'createdBy': 1, 
            'updatedBy': {
                '$toString': '$updatedBy'
            }
        }
    }
]

            result = list(self.estimates_collection.aggregate(pipeline))
            if not result:
                logger.warning(f"No estimate found with ID: {estimate_id}")
                raise HTTPException(status_code=404, detail="Estimate not found")
            
            estimate_data = result[0]
            # part-wise qty,price for task,findings calculation
            # estimated_spare_parts = {}
            # for task in estimate_data.get('tasks', []):
            #     for spare_part in task.get('spareParts', []):
            #         part_id = spare_part['partId']
            #         if part_id not in estimated_spare_parts:
            #             estimated_spare_parts[part_id] = {
            #                 'desc': spare_part['desc'],
            #                 'unit': spare_part['unit'],
            #                 'qty': 0,
            #                 'price': 0
            #             }
            #         estimated_spare_parts[part_id]['qty'] += spare_part['qty']
            #         estimated_spare_parts[part_id]['price'] += spare_part['price'] * spare_part['qty']

            # for finding in estimate_data.get('filteredFindings', []):
            #     for detail in finding.get('details', []):
            #         for spare_part in detail.get('spareParts', []):
            #             part_id = spare_part['partId']
            #             if part_id not in estimated_spare_parts:
            #                 estimated_spare_parts[part_id] = {
            #                     'desc': spare_part['desc'],
            #                     'unit': spare_part['unit'],
            #                     'qty': 0,
            #                     'price': 0
            #                 }
            #             estimated_spare_parts[part_id]['qty'] += spare_part['qty']
            #             estimated_spare_parts[part_id]['price'] += spare_part['price'] * spare_part['qty']
            # estimated_spare_parts_list = [
            #     {
            #         'partID': part_id,
            #         'desc': data['desc'],
            #         'unit': data['unit'],
            #         'qty': data['qty'],
            #         'price': data['price']
            #     }
            #     for part_id, data in estimated_spare_parts.items()
            # ]
            # estimate_data['overallEstimateReport']['estimatedSpareParts'] = estimated_spare_parts_list
            logger.info("Estimated collection fetched successfully")
            return estimate_data


        except Exception as e:
            logger.error(f"Error fetching estimate {estimate_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


    def get_probability_wise_manhrsspareparts(self,estimate_id:str)->ProbabilityWiseManhrsSpareCost:
        """
        Get estimate by ID with filtered findings based on probability comparison
        Returns raw aggregation result directly from MongoDB
        """
        logger.info(f"Fetching estimate by ID: {estimate_id}")
        try:
            # Define the aggregation pipeline
            pipeline = [
            {
                '$match': {
                    'estID': estimate_id
                }
            }, {
                '$unwind': '$findings'
            }, {
                '$unwind': '$findings.details'
            }, {
                '$facet': {
                    'prob01': [
                        {
                            '$match': {
                                'findings.details.prob': {
                                    '$gte': 0.1
                                }
                            }
                        }, {
                            '$group': {
                                '_id': None, 
                                'totalMhs': {
                                    '$sum': '$findings.details.mhs.avg'
                                }, 
                                'totalSpareCost': {
                                    '$sum': {
                                        '$reduce': {
                                            'input': '$findings.details.spareParts', 
                                            'initialValue': 0, 
                                            'in': {
                                                '$add': [
                                                    '$$value', '$$this.price'
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    ], 
                    'prob02': [
                        {
                            '$match': {
                                'findings.details.prob': {
                                    '$gte': 0.2
                                }
                            }
                        }, {
                            '$group': {
                                '_id': None, 
                                'totalMhs': {
                                    '$sum': '$findings.details.mhs.avg'
                                }, 
                                'totalSpareCost': {
                                    '$sum': {
                                        '$reduce': {
                                            'input': '$findings.details.spareParts', 
                                            'initialValue': 0, 
                                            'in': {
                                                '$add': [
                                                    '$$value', '$$this.price'
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    ], 
                    'prob03': [
                        {
                            '$match': {
                                'findings.details.prob': {
                                    '$gte': 0.3
                                }
                            }
                        }, {
                            '$group': {
                                '_id': None, 
                                'totalMhs': {
                                    '$sum': '$findings.details.mhs.avg'
                                }, 
                                'totalSpareCost': {
                                    '$sum': {
                                        '$reduce': {
                                            'input': '$findings.details.spareParts', 
                                            'initialValue': 0, 
                                            'in': {
                                                '$add': [
                                                    '$$value', '$$this.price'
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    ], 
                    'prob04': [
                        {
                            '$match': {
                                'findings.details.prob': {
                                    '$gte': 0.4
                                }
                            }
                        }, {
                            '$group': {
                                '_id': None, 
                                'totalMhs': {
                                    '$sum': '$findings.details.mhs.avg'
                                }, 
                                'totalSpareCost': {
                                    '$sum': {
                                        '$reduce': {
                                            'input': '$findings.details.spareParts', 
                                            'initialValue': 0, 
                                            'in': {
                                                '$add': [
                                                    '$$value', '$$this.price'
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    ], 
                    'prob05': [
                        {
                            '$match': {
                                'findings.details.prob': {
                                    '$gte': 0.5
                                }
                            }
                        }, {
                            '$group': {
                                '_id': None, 
                                'totalMhs': {
                                    '$sum': '$findings.details.mhs.avg'
                                }, 
                                'totalSpareCost': {
                                    '$sum': {
                                        '$reduce': {
                                            'input': '$findings.details.spareParts', 
                                            'initialValue': 0, 
                                            'in': {
                                                '$add': [
                                                    '$$value', '$$this.price'
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    ], 
                    'prob06': [
                        {
                            '$match': {
                                'findings.details.prob': {
                                    '$gte': 0.6
                                }
                            }
                        }, {
                            '$group': {
                                '_id': None, 
                                'totalMhs': {
                                    '$sum': '$findings.details.mhs.avg'
                                }, 
                                'totalSpareCost': {
                                    '$sum': {
                                        '$reduce': {
                                            'input': '$findings.details.spareParts', 
                                            'initialValue': 0, 
                                            'in': {
                                                '$add': [
                                                    '$$value', '$$this.price'
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    ], 
                    'prob07': [
                        {
                            '$match': {
                                'findings.details.prob': {
                                    '$gte': 0.7
                                }
                            }
                        }, {
                            '$group': {
                                '_id': None, 
                                'totalMhs': {
                                    '$sum': '$findings.details.mhs.avg'
                                }, 
                                'totalSpareCost': {
                                    '$sum': {
                                        '$reduce': {
                                            'input': '$findings.details.spareParts', 
                                            'initialValue': 0, 
                                            'in': {
                                                '$add': [
                                                    '$$value', '$$this.price'
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    ], 
                    'prob08': [
                        {
                            '$match': {
                                'findings.details.prob': {
                                    '$gte': 0.8
                                }
                            }
                        }, {
                            '$group': {
                                '_id': None, 
                                'totalMhs': {
                                    '$sum': '$findings.details.mhs.avg'
                                }, 
                                'totalSpareCost': {
                                    '$sum': {
                                        '$reduce': {
                                            'input': '$findings.details.spareParts', 
                                            'initialValue': 0, 
                                            'in': {
                                                '$add': [
                                                    '$$value', '$$this.price'
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    ], 
                    'prob09': [
                        {
                            '$match': {
                                'findings.details.prob': {
                                    '$gte': 0.9
                                }
                            }
                        }, {
                            '$group': {
                                '_id': None, 
                                'totalMhs': {
                                    '$sum': '$findings.details.mhs.avg'
                                }, 
                                'totalSpareCost': {
                                    '$sum': {
                                        '$reduce': {
                                            'input': '$findings.details.spareParts', 
                                            'initialValue': 0, 
                                            'in': {
                                                '$add': [
                                                    '$$value', '$$this.price'
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    ], 
                    'prob10': [
                        {
                            '$match': {
                                'findings.details.prob': {
                                    '$gte': 1.0
                                }
                            }
                        }, {
                            '$group': {
                                '_id': None, 
                                'totalMhs': {
                                    '$sum': '$findings.details.mhs.avg'
                                }, 
                                'totalSpareCost': {
                                    '$sum': {
                                        '$reduce': {
                                            'input': '$findings.details.spareParts', 
                                            'initialValue': 0, 
                                            'in': {
                                                '$add': [
                                                    '$$value', '$$this.price'
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    ]
                }
            }, {
                '$project': {
                    '_id': 0, 
                    'estID': estimate_id, 
                    'estProb': [
                        {
                            'prob': 0.1, 
                            'totalManhrs': {
                                '$ifNull': [
                                    {
                                        '$arrayElemAt': [
                                            '$prob01.totalMhs', 0
                                        ]
                                    }, 0.0
                                ]
                            }, 
                            'totalSpareCost': {
                                '$ifNull': [
                                    {
                                        '$arrayElemAt': [
                                            '$prob01.totalSpareCost', 0
                                        ]
                                    }, 0.0
                                ]
                            }
                        }, {
                            'prob': 0.2, 
                            'totalManhrs': {
                                '$ifNull': [
                                    {
                                        '$arrayElemAt': [
                                            '$prob02.totalMhs', 0
                                        ]
                                    }, 0.0
                                ]
                            }, 
                            'totalSpareCost': {
                                '$ifNull': [
                                    {
                                        '$arrayElemAt': [
                                            '$prob02.totalSpareCost', 0
                                        ]
                                    }, 0.0
                                ]
                            }
                        }, {
                            'prob': 0.3, 
                            'totalManhrs': {
                                '$ifNull': [
                                    {
                                        '$arrayElemAt': [
                                            '$prob03.totalMhs', 0
                                        ]
                                    }, 0.0
                                ]
                            }, 
                            'totalSpareCost': {
                                '$ifNull': [
                                    {
                                        '$arrayElemAt': [
                                            '$prob03.totalSpareCost', 0
                                        ]
                                    }, 0.0
                                ]
                            }
                        }, {
                            'prob': 0.4, 
                            'totalManhrs': {
                                '$ifNull': [
                                    {
                                        '$arrayElemAt': [
                                            '$prob04.totalMhs', 0
                                        ]
                                    }, 0.0
                                ]
                            }, 
                            'totalSpareCost': {
                                '$ifNull': [
                                    {
                                        '$arrayElemAt': [
                                            '$prob04.totalSpareCost', 0
                                        ]
                                    }, 0.0
                                ]
                            }
                        }, {
                            'prob': 0.5, 
                            'totalManhrs': {
                                '$ifNull': [
                                    {
                                        '$arrayElemAt': [
                                            '$prob05.totalMhs', 0
                                        ]
                                    }, 0.0
                                ]
                            }, 
                            'totalSpareCost': {
                                '$ifNull': [
                                    {
                                        '$arrayElemAt': [
                                            '$prob05.totalSpareCost', 0
                                        ]
                                    }, 0.0
                                ]
                            }
                        }, {
                            'prob': 0.6, 
                            'totalManhrs': {
                                '$ifNull': [
                                    {
                                        '$arrayElemAt': [
                                            '$prob06.totalMhs', 0
                                        ]
                                    }, 0.0
                                ]
                            }, 
                            'totalSpareCost': {
                                '$ifNull': [
                                    {
                                        '$arrayElemAt': [
                                            '$prob06.totalSpareCost', 0
                                        ]
                                    }, 0.0
                                ]
                            }
                        }, {
                            'prob': 0.7, 
                            'totalManhrs': {
                                '$ifNull': [
                                    {
                                        '$arrayElemAt': [
                                            '$prob07.totalMhs', 0
                                        ]
                                    }, 0.0
                                ]
                            }, 
                            'totalSpareCost': {
                                '$ifNull': [
                                    {
                                        '$arrayElemAt': [
                                            '$prob07.totalSpareCost', 0
                                        ]
                                    }, 0.0
                                ]
                            }
                        }, {
                            'prob': 0.8, 
                            'totalManhrs': {
                                '$ifNull': [
                                    {
                                        '$arrayElemAt': [
                                            '$prob08.totalMhs', 0
                                        ]
                                    }, 0.0
                                ]
                            }, 
                            'totalSpareCost': {
                                '$ifNull': [
                                    {
                                        '$arrayElemAt': [
                                            '$prob08.totalSpareCost', 0
                                        ]
                                    }, 0.0
                                ]
                            }
                        }, {
                            'prob': 0.9, 
                            'totalManhrs': {
                                '$ifNull': [
                                    {
                                        '$arrayElemAt': [
                                            '$prob09.totalMhs', 0
                                        ]
                                    }, 0.0
                                ]
                            }, 
                            'totalSpareCost': {
                                '$ifNull': [
                                    {
                                        '$arrayElemAt': [
                                            '$prob09.totalSpareCost', 0
                                        ]
                                    }, 0.0
                                ]
                            }
                        }, {
                            'prob': 1.0, 
                            'totalManhrs': {
                                '$ifNull': [
                                    {
                                        '$arrayElemAt': [
                                            '$prob10.totalMhs', 0
                                        ]
                                    }, 0.0
                                ]
                            }, 
                            'totalSpareCost': {
                                '$ifNull': [
                                    {
                                        '$arrayElemAt': [
                                            '$prob10.totalSpareCost', 0
                                        ]
                                    }, 0.0
                                ]
                            }
                        }
                    ]
                }
            }
        ]
            results = list(self.estimates_collection.aggregate(pipeline))
            if results:
                return ProbabilityWiseManhrsSpareCost(**results[0])
            else:
                raise HTTPException(status_code=404, detail="Estimate not found")
        except Exception as e:
            logger.error(f"Error fetching estimate: {e}")
            raise HTTPException(status_code=500, detail="Internal Server Error")
    async def multiple_parts_usage(self, part_ids: List[str], startDate: datetime, endDate: datetime) -> Dict:
        logger.info(f"startDate and endDate are:\n{startDate, endDate}")
        """
        Get parts usage for multiple part IDs
        """
        logger.info(f"Fetching parts usage for multiple part IDs: {part_ids}")

        task_parts_pipeline = [
    {
        '$match': {
            'requested_part_number': {
                '$in': part_ids
            }, 
            'requested_stock_status': {
                '$ne': 'Owned'
            }
        }
    }, {
        '$lookup': {
            'from': 'task_description', 
            'let': {
                'package_number': '$package_number', 
                'task_number': '$task_number'
            }, 
            'pipeline': [
                {
                    '$match': {
                        '$expr': {
                            '$and': [
                                {
                                    '$eq': [
                                        '$package_number', '$$package_number'
                                    ]
                                }, {
                                    '$eq': [
                                        '$task_number', '$$task_number'
                                    ]
                                }
                            ]
                        }
                    }
                }, {
                    '$project': {
                        'package_number': '$package_number', 
                        'actual_start_date': 1, 
                        'actual_end_date': 1, 
                        'description': 1, 
                        '_id': 0
                    }
                }
            ], 
            'as': 'task_info'
        }
    }, {
        '$unwind': {
            'path': '$task_info', 
            'preserveNullAndEmptyArrays': True
        }
    }, {
        '$match': {
            '$expr': {
                '$and': [
                    {
                        '$gte': [
                            '$task_info.actual_start_date', startDate
                        ]
                    }, {
                        '$lt': [
                            '$task_info.actual_end_date', endDate
                        ]
                    }
                ]
            }
        }
    }, {
        '$group': {
            '_id': {
                'partId': '$requested_part_number', 
                'partDescription': '$part_description'
            }, 
            'totalTasksQty': {
                '$sum': '$requested_quantity'
            }, 
            'taskNumbers': {
                '$push': '$task_number'
            }
        }
    }, {
        '$project': {
            '_id': 0, 
            'partId': '$_id.partId', 
            'partDescription': '$_id.partDescription', 
            'totalTasksQty': 1, 
            'totalTasks': {
                '$size': '$taskNumbers'
            }
        }
    }
]
        findings_HMV_parts_pipeline = [
    {
        '$match': {
            'issued_part_number': {
                '$in': part_ids
            }
        }
    }, {
        '$addFields': {
            'isHMV': {
                '$substr': [
                    '$task_number', 0, 3
                ]
            }
        }
    }, {
        '$match': {
            'isHMV': 'HMV'
        }
    }, {
        '$lookup': {
            'from': 'sub_task_description', 
            'localField': 'task_number', 
            'foreignField': 'log_item_number', 
            'as': 'task_info', 
            'pipeline': [
                {
                    '$project': {
                        'convertedPackage': '$package_number', 
                        'actual_start_date': 1, 
                        'actual_end_date': 1, 
                        'source_task_discrepancy_number': 1, 
                        'log_item_number': 1, 
                        '_id': 0
                    }
                }
            ]
        }
    }, {
        '$unwind': {
            'path': '$task_info', 
            'preserveNullAndEmptyArrays': True
        }
    }, {
        '$match': {
            '$expr': {
                '$and': [
                    {
                        '$gte': [
                            '$task_info.actual_start_date', startDate
                        ]
                    }, {
                        '$lt': [
                            '$task_info.actual_end_date', endDate
                        ]
                    }
                ]
            }
        }
    }, {
        '$group': {
            '_id': {
                'partId': '$issued_part_number', 
                'partDescription': {
                    '$replaceAll': {
                        'input': '$part_description', 
                        'find': ' ', 
                        'replacement': ''
                    }
                }
            }, 
            'totalFindingsQty': {
                '$sum': '$used_quantity'
            }, 
            'task_numbers': {
                '$addToSet': '$task_info.log_item_number'
            }
        }
    }, {
        '$project': {
            '_id': 0, 
            'partId': '$_id.partId', 
            'partDescription': '$_id.partDescription', 
            'totalFindingsQty': 1, 
            'totalFindings': {
                '$size': '$task_numbers'
            }
        }
    }
]
        findings_nonHMV_parts_pipeline = [
    {
        '$match': {
            'issued_part_number': {
                '$in': part_ids
            }
        }
    }, {
        '$addFields': {
            'isHMV': {
                '$substr': [
                    '$task_number', 0, 3
                ]
            }
        }
    }, {
        '$match': {
            'isHMV': {
                '$ne': 'HMV'
            }
        }
    }, {
        '$lookup': {
            'from': 'task_description', 
            'let': {
                'task_num': '$task_number', 
                'pkg_num': '$package_number'
            }, 
            'pipeline': [
                {
                    '$match': {
                        '$expr': {
                            '$and': [
                                {
                                    '$eq': [
                                        '$task_number', '$$task_num'
                                    ]
                                }, {
                                    '$eq': [
                                        '$package_number', '$$pkg_num'
                                    ]
                                }
                            ]
                        }
                    }
                }, {
                    '$project': {
                        'actual_start_date': 1, 
                        'actual_end_date': 1, 
                        '_id': 0
                    }
                }
            ], 
            'as': 'task_info'
        }
    }, {
        '$unwind': {
            'path': '$task_info', 
            'preserveNullAndEmptyArrays': True
        }
    }, {
        '$match': {
            '$expr': {
                '$and': [
                    {
                        '$gte': [
                            '$task_info.actual_start_date', startDate
                        ]
                    }, {
                        '$lt': [
                            '$task_info.actual_end_date', endDate
                        ]
                    }
                ]
            }
        }
    }, {
        '$group': {
            '_id': {
                'partId': '$issued_part_number', 
                'partDescription': {
                    '$replaceAll': {
                        'input': '$part_description', 
                        'find': ' ', 
                        'replacement': ''
                    }
                }
            }, 
            'totalTasksQty': {
                '$sum': '$used_quantity'
            }, 
            'task_numbers': {
                '$addToSet': '$task_number'
            }
        }
    }, {
        '$project': {
            '_id': 0, 
            'partId': '$_id.partId', 
            'partDescription': '$_id.partDescription', 
            'totalTasksQty': 1, 
            'totalTasks': {
                '$size': '$task_numbers'
            }
        }
    }
]
        task_parts_results = list(self.taskparts_collection.aggregate(task_parts_pipeline))
        logger.info(f"task_parts_results: {len(task_parts_results)}")
        findings_HMV_results = list(self.subtaskparts_collection.aggregate(findings_HMV_parts_pipeline))
        logger.info(f"findings_HMV_results: {len(findings_HMV_results)}")
        findings_nonHMV_results = (self.subtaskparts_collection.aggregate(findings_nonHMV_parts_pipeline))
        logger.info(f"findings_nonHMV_results fetched")
        
        combined_results = {
        "taskParts": task_parts_results,
        "findingsHMVParts": findings_HMV_results,
        "findingsNonHMVTasks": findings_nonHMV_results
    }
        logger.info(f"Combined results: {combined_results}")
        return combined_results
        