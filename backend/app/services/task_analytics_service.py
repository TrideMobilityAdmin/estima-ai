from app.models.task_models import TaskManHoursModel,ManHrs,FindingsManHoursModel,ProbabilityWiseManhrsSpareCost
from statistics import mean
from fastapi import HTTPException,Depends,status
from typing import List , Dict,Optional,Any
import math
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
   ValidRequestCheckCategory
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
        self.capping_data_collection=self.mongo_client.get_collection("capping_data")
        self.estimate_file_upload=self.mongo_client.get_collection("estimate_file_upload")
        self.RHLH_Tasks_collection=self.mongo_client.get_collection("RHLH_Tasks")
        self.lhrh_task_description=self.mongo_client.get_collection("task_description_max500mh_lhrh")
        self.aircraft_details_collection=self.mongo_client.get_collection("aircraft_details")
    
    
    async def get_man_hours(self, source_task: str) -> TaskManHoursModel:
        """
        Get man hours statistics for a specific source task
        """
        logger.info("Fetching man hours for source task")

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

            LhRhTasks = list(self.RHLH_Tasks_collection.find({},))
            logger.info("LhRhTasks fetched successfully")
        
            lrhTasks = updateLhRhTasks(LhRhTasks, task_ids)
        
            existing_tasks_list = self.lhrh_task_description.find(
                {"task_number": {"$in": lrhTasks}}, {"_id": 0, "task_number": 1, "description": 1}
            )
            existing_tasks_list = list(existing_tasks_list)

            cleaned_task_map = {}
            for doc in existing_tasks_list:
                task_number = doc["task_number"]
                description = doc["description"]
                if " (LH)" in task_number or " (RH)" in task_number:
                    task_number = task_number.split(" ")[0]  
                cleaned_task_map[task_number] = description

            logger.info(f"cleaned_task_map: {cleaned_task_map}")

            
            cleaned_lrhTasks = set()  
            for task in lrhTasks:
                if " (LH)" in task or " (RH)" in task:
                    task = task.split(" ")[0] 
                cleaned_lrhTasks.add(task)
            cleaned_lrhTasks = list(cleaned_lrhTasks)

            validated_tasks = [
                {
                    "taskid": task,
                    "status": task in cleaned_task_map,
                    "description": cleaned_task_map.get(task, " ") 
                }
                for task in cleaned_lrhTasks
            ]
            return validated_tasks

        except Exception as e:
            logger.error(f"Error validating tasks: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error validating tasks: {str(e)}"
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
    },
     {
        '$addFields': {
            'ceilUsedQuantity': {
                '$ceil': '$requested_quantity'
            }
        }
    },  {
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
                                        'quantity': '$ceilUsedQuantity', 
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
    }, 
    {
        '$addFields': {
            'ceilUsedQuantity': {
                '$ceil': '$used_quantity'
            }
        }
    },{
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
                }, 
                {
                    '$group': {
                        '_id': '$task_number', 
                        'doc': {
                            '$first': '$$ROOT'
                        }, 
                        'totalQty': {
                            '$sum': '$ceilUsedQuantity'
                        }
                    }
                }, {
                    '$replaceRoot': {
                        'newRoot': {
                            '$mergeObjects': [
                                '$doc', {
                                    'ceilUsedQuantity': '$totalQty'
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
                            }, 
                            {
                                '$limit': 1
                            },{
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
                                'quantity': '$ceilUsedQuantity', 
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
                                    'quantity': '$$hmvTask.ceilUsedQuantity', 
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
                                        "aircraftModel": pkg.get("aircraftModel", ""),
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
            skill_wise_tasks=[
    {
        '$match': {
            'task_number': {
                '$in': source_tasks
            }
        }
    }, {
        '$group': {
            '_id': {
                'skill_number': '$skill_number', 
                'task_number': '$task_number'
            }, 
            'actual_man_hours': {
                '$push': '$actual_man_hours'
            }, 
            'task_description': {
                '$first': '$description'
            }
        }
    }, {
        '$group': {
            '_id': '$_id.skill_number', 
            'totalMinHours': {
                '$min': {
                    '$min': '$actual_man_hours'
                }
            }, 
            'totalAvgHours': {
                '$avg': {
                    '$avg': '$actual_man_hours'
                }
            }, 
            'totalMaxHours': {
                '$max': {
                    '$max': '$actual_man_hours'
                }
            }, 
            'tasks': {
                '$push': {
                    'taskId': '$_id.task_number', 
                    'taskDescription': '$task_description', 
                    'manHours': {
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
            '_id': 0, 
            'skil': '$_id', 
            'totalMinHours': {
                '$round': [
                    '$totalMinHours', 2
                ]
            }, 
            'totalAvgHours': {
                '$round': [
                    '$totalAvgHours', 2
                ]
            }, 
            'totalMaxHours': {
                '$round': [
                    '$totalMaxHours', 2
                ]
            }, 
            'tasks': 1
        }
    }, {
        '$sort': {
            'skil': 1
        }
    }
]
            skill_wise_findings=[
    {
        '$match': {
            'source_task_discrepancy_number': {
                '$in':source_tasks
            }
        }
    }, {
        '$group': {
            '_id': {
                'skill_number': '$skill_number', 
                'task_number': '$source_task_discrepancy_number'
            }, 
            'actual_man_hours': {
                '$push': '$actual_man_hours'
            }, 
            'task_description': {
                '$first': '$task_description'
            }
        }
    }, {
        '$group': {
            '_id': '$_id.skill_number', 
            'totalMinHours': {
                '$min': {
                    '$min': '$actual_man_hours'
                }
            }, 
            'totalAvgHours': {
                '$avg': {
                    '$avg': '$actual_man_hours'
                }
            }, 
            'totalMaxHours': {
                '$max': {
                    '$max': '$actual_man_hours'
                }
            }, 
            'findings': {
                '$push': {
                    'taskId': '$_id.task_number', 
                    'taskDescription': '$task_description', 
                    'manHours': {
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
            '_id': 0, 
            'skil': '$_id', 
            'totalMinHours': {
                '$round': [
                    '$totalMinHours', 2
                ]
            }, 
            'totalAvgHours': {
                '$round': [
                    '$totalAvgHours', 2
                ]
            }, 
            'totalMaxHours': {
                '$round': [
                    '$totalMaxHours', 2
                ]
            }, 
            'findings': 1
        }
    }, {
        '$sort': {
            'skil': 1
        }
    }
]

            # Execute MongoDB queries
            task_skill_results = list(self.taskdescription_collection.aggregate(task_skill_pipeline))
            sub_task_skill_results = list(self.sub_task_collection.aggregate(sub_tasks_skill_pipeline))
            skill_wise_tasks_result = list(self.taskdescription_collection.aggregate(skill_wise_tasks))
            skill_wise_findings_result = list(self.sub_task_collection.aggregate(skill_wise_findings))
            
            logger.info(f"Retrieved skill analysis for tasks: len={len(task_skill_results)}")
            logger.info(f"Retrieved skill analysis for sub-tasks: len={len(sub_task_skill_results)}")
            logger.info(f"Retrieved skill-wise tasks: len={len(skill_wise_tasks_result)}")
            logger.info(f"Retrieved skill-wise findings: len={len(skill_wise_findings_result)}")
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
                            "skill": skill.get("skill"),
                            "manHours": skill["manhours"]
                        }
                        for skill in task["skills"]
                    ]
                }
                for task in task_skill_results
            ]
            logger.info(f"fetched tasks successfully: len={len(tasks)}")

            findings = [
                {
                    "taskId": sub_task["_id"],
                    "skills": [
                        {
                            "skill": skill.get("skill"),
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
            logger.info(f"response is {response}")
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
        configurations=replace_nan_inf(configurations)
        man_hours_threshold = configurations.get('thresholds', {}).get('manHoursThreshold', 0)

        capping_pipeline=[
            {
                '$match': {
                    'estID': estimate_id
                }
            }, {
                '$project': {
                    '_id': 0, 
                    'operator': 1, 
                    'aircraftAge': 1, 
                    'aircraftModel': 1, 
                    'aircraftRegNo': 1, 
                    'typeOfCheckID': {
                '$ifNull': [
                    '$typeOfCheckID', ''
                ]
            }, 
            'typeOfCheck': {
                '$ifNull': [
                    '$typeOfCheck', []
                ]
            }, 
                    'mh_type': '$cappingDetails.cappingTypeManhrs', 
                    'mhs': '$cappingDetails.cappingManhrs', 
                    'cost_type': '$cappingDetails.cappingTypeSpareCost', 
                    'mc': '$cappingDetails.cappingSpareCost'
                }
            }
        ]
        result = list(self.estimate_file_upload.aggregate(capping_pipeline))
        capping_result = replace_nan_inf(result[0] if result else {})
        logger.info(f"capping_result fetched: {capping_result}")

        # SCMH = 0
        # SCMC = 0
        # FMH = 0
        # FMC = 0
        # line_item = 0
        # # capping_type = "N/A"

        
        # if capping_result.get("mh_type")=="per_source_card" and capping_result.get("cost_type") == "per_source_card":
        #     SCMH = capping_result.get("mhs")
        #     SCMC = capping_result.get("mc")
        #     capping_type = "per_source_card"
        # elif capping_result.get("mh_type")=="per_IRC" and capping_result.get("cost_type") == "per_IRC":
        #     FMH = capping_result.get("mhs")
        #     FMC = capping_result.get("mc")
        #     capping_type = "per_IRC"
        # elif capping_result.get("cost_type") == "per_line_item":
        #     line_item = capping_result.get("mc")
        #     capping_type = "per_line_item"
        # elif capping_result.get("mh_type")=="per_source_card" and capping_result.get("cost_type")=="":
        #     SCMH = capping_result.get("mhs")
        #     capping_type="per_source_card_no_cost"
        # elif capping_result.get("mh_type")=="per_IRC" and capping_result.get("cost_type")=="":
        #     FMH = capping_result.get("mhs")
        #     FMC = 500
        #     capping_type="per_IRC_no_cost"
        # elif capping_result.get("cost_type")=="per_IRC" and capping_result.get("mh_type")=="":
        #     FMC = capping_result.get("mc")
        #     FMH=20
        #     capping_type="no_manhours_per_IRC"
        # elif capping_result.get("mh_type")=="" and capping_result.get("cost_type")=="per_source_card":
        #     SCMC = capping_result.get("mc")
        #     capping_type="no_manhours_per_source_card" 
        # elif capping_result.get("mh_type")=="" and capping_result.get("cost_type")=="":
        #     capping_type = "N/A"
        # elif capping_result.get("mh_type")=="per_source_card" and capping_result.get("cost_type")=="per_IRC":
        #     SCMH=capping_result.get("mhs")
        #     SCMC=500
        #     FMH=20
        #     FMC=capping_result.get("mc")
        #     capping_type="per_source_card_per_IRC"
        # elif capping_result.get("mh_type")=="per_IRC" and capping_result.get("cost_type")=="per_source_card":
        #     FMH=capping_result.get("mhs")
        #     FMC=500
        #     SCMC=capping_result.get("mc")
        #     SCMH=20
            # capping_type="per_IRC_per_source_card"

            
        # logger.info(f"capping_type fetched: {capping_type}")
        # logger.info(f"capping_manhrs fetched per_source_card: {SCMH}")
        # logger.info(f"capping_cost fetched per_source_card: {SCMC}")
        # logger.info(f"line_item_cost fetched per_line_item: {line_item}")
        # logger.info(f"capping_manhrs fetched per_IRC: {FMH}")
        # logger.info(f"capping_cost fetched per_IRC: {FMC}")
        

        try:
            pipeline =[
    {
        '$match': {
            'estID': estimate_id
        }
    }, 
    {
        '$addFields': {
            'aggregatedTasks': {
                'spareParts': {
                    '$reduce': {
                        'input': '$tasks.spare_parts', 
                        'initialValue': [], 
                        'in': {
                            '$concatArrays': [
                                '$$value', '$$this'
                            ]
                        }
                    }
                }
            },
            'aggregatedFindings': {
                'spareParts': {
                    '$reduce': {
                        'input': {
                            '$map': {
                                'input': '$findings', 
                                'as': 'finding', 
                                'in': {
                                    '$reduce': {
                                        'input': '$$finding.details.spare_parts', 
                                        'initialValue': [], 
                                        'in': {
                                            '$concatArrays': [
                                                '$$value', '$$this'
                                            ]
                                        }
                                    }
                                }
                            }
                        }, 
                        'initialValue': [], 
                        'in': {
                            '$concatArrays': [
                                '$$value', '$$this'
                            ]
                        }
                    }
                }
            }
        }
    },
      {
        '$project': {
            '_id': 0, 
            'estID': 1, 
            'description': 1, 
            
            'cappingValues': '$capping_values',
            'overallEstimateReport': {
                # 'estimatedTatTime': '$tatTime', 
                'estimatedSpareCost': '$totalConsumption.totalPartsCost', 
                'estimateManhrs': '$totalConsumption.mhs', 
                'spareParts': {
                    '$filter': {
                        'input': '$totalConsumption.totalParts', 
                        'as': 'part', 
                        'cond': {
                            '$gt': [
                                '$$part.price', 0.01
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
            'aggregatedTasks': {
                'spareParts': '$aggregatedTasks.spareParts', 
                'estimateManhrs': '$aggregatedTasks.mhs', 
                'totalMhs': '$aggregatedTasks.totalMhs', 
                'estimatedSpareCost': '$aggregatedTasks.totalPartsCost'
            },  
            'findings': '$findings', 
            'aggregatedFindings': {
                'spareParts': '$aggregatedFindings.spareParts', 
                'estimateManhrs': '$aggregatedFindings.mhs', 
                'totalMhs': '$aggregatedFindings.totalMhs', 
                'estimatedSpareCost': '$aggregatedFindings.totalPartsCost'
            },  
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
            
            estimate_data = replace_nan_inf(result[0] if result else {})
            estimate_data["operator"] = capping_result.get("operator")
            logger.info(f"operator fetched: {capping_result.get('operator')}")
            estimate_data["aircraftAge"] = capping_result.get("aircraftAge")
            estimate_data["aircraftModel"] = capping_result.get("aircraftModel")
            estimate_data["aircraftRegNo"] = capping_result.get("aircraftRegNo")
            estimate_data["typeOfCheckID"] = capping_result.get("typeOfCheckID")
            estimate_data["typeOfCheck"] = capping_result.get("typeOfCheck")
            logger.info("estimate_data fetched")
    #         findings_level_pipeline=[
    #                 {
    #                     '$match': {
    #                         'estID':estimate_id
    #                     }
    #                 }, {
    #                     '$unwind': '$findings'
    #                 }, {
    #                     '$unwind': '$findings.details'
    #                 }, {
    #                     '$group': {
    #                         '_id': '$findings.details.cluster', 
    #                         'totalAvgMhs': {
    #                             '$sum': {
    #                                 '$ifNull': [
    #                                     '$findings.details.mhs.avg', 0
    #                                 ]
    #                             }
    #                         }, 
    #                         'totalSpareCost': {
    #                             '$sum': {
    #                                 '$sum': {
    #                                     '$map': {
    #                                         'input': {
    #                                             '$ifNull': [
    #                                                 '$findings.details.spare_parts', []
    #                                             ]
    #                                         }, 
    #                                         'as': 'part', 
    #                                         'in': {
    #                                             '$ifNull': [
    #                                                 '$$part.price', 0
    #                                             ]
    #                                         }
    #                                     }
    #                                 }
    #                             }
    #                         }
    #                     }
    #                 }, {
    #                     '$project': {
    #                         'cluster': '$_id', 
    #                         'totalAvgMhs': 1, 
    #                         'totalSpareCost': 1, 
    #                         'billableMhs': {
    #                             '$cond': [
    #                                 {
    #                                     '$gte': [
    #                                         '$totalAvgMhs', FMH
    #                                     ]
    #                                 }, {
    #                                     '$subtract': [
    #                                         '$totalAvgMhs', FMH
    #                                     ]
    #                                 }, 0
    #                             ]
    #                         }, 
    #                         'unbillableMhs': {
    #                             '$cond': [
    #                                 {
    #                                     '$gte': [
    #                                         '$totalAvgMhs', FMH
    #                                     ]
    #                                 }, FMH, '$totalAvgMhs'
    #                             ]
    #                         }, 
    #                         'billableCost': {
    #                             '$cond': [
    #                                 {
    #                                     '$gte': [
    #                                         '$totalSpareCost', FMC
    #                                     ]
    #                                 }, {
    #                                     '$subtract': [
    #                                         '$totalSpareCost', FMC
    #                                     ]
    #                                 }, 0
    #                             ]
    #                         }, 
    #                         'unbillableCost': {
    #                             '$cond': [
    #                                 {
    #                                     '$gte': [
    #                                         '$totalSpareCost', FMC
    #                                     ]
    #                                 }, FMC, '$totalSpareCost'
    #                             ]
    #                         }
    #                     }
    #                 }, {
    #                     '$group': {
    #                         '_id': None, 
    #                         'totalBillableMhs': {
    #                             '$sum': '$billableMhs'
    #                         }, 
    #                         'totalUnbillableMhs': {
    #                             '$sum': '$unbillableMhs'
    #                         }, 
    #                         'totalBillableCost': {
    #                             '$sum': '$billableCost'
    #                         }, 
    #                         'totalUnbillableCost': {
    #                             '$sum': '$unbillableCost'
    #                         }
    #                     }
    #                 }, {
    #                     '$project': {
    #                         '_id': 0, 
    #                         'clusterCapping': 1, 
    #                         'totalBillableMhs': 1, 
    #                         'totalUnbillableMhs': 1, 
    #                         'totalBillableCost': 1, 
    #                         'totalUnbillableCost': 1
    #                     }
    #                 }
    #             ]
    #         findings_result=replace_nan_inf(list(self.estimates_collection.aggregate(findings_level_pipeline)))
    #         if not findings_result:
    #             findings_level = {"totalBillableMhs": 0, "totalUnbillableMhs": 0, 
    #                             "totalBillableCost": 0, "totalUnbillableCost": 0}
    #         else:
    #             findings_level = findings_result[0]

    #         SC_NC_pipeline = [
    #             {
    #                 '$match': {
    #                     'estID': estimate_id
    #                 }
    #             }, {
    #                 '$unwind': '$tasks'
    #             }, {
    #                 '$group': {
    #                     '_id': '$tasks.sourceTask', 
    #                     'totalAvgMhs': {
    #                         '$sum': {
    #                             '$ifNull': [
    #                                 '$tasks.mhs.avg', 0
    #                             ]
    #                         }
    #                     }
    #                 }
    #             }, {
    #                 '$project': {
    #                     'sourceTask': '$_id', 
    #                     'totalAvgMhs': 1, 
    #                     'billableMhs': {
    #                         '$cond': [
    #                             {
    #                                 '$gte': [
    #                                     '$totalAvgMhs', SCMH
    #                                 ]
    #                             }, {
    #                                 '$subtract': [
    #                                     '$totalAvgMhs', SCMH
    #                                 ]
    #                             }, 0
    #                         ]
    #                     }, 
    #                     'unbillableMhs': {
    #                         '$cond': [
    #                             {
    #                                 '$gte': [
    #                                     '$totalAvgMhs', SCMH
    #                                 ]
    #                             }, SCMH, '$totalAvgMhs'
    #                         ]
    #                     }
    #                 }
    #             }, {
    #                 '$group': {
    #                     '_id': None, 
    #                     'totalBillableMhs': {
    #                         '$sum': '$billableMhs'
    #                     }, 
    #                     'totalUnbillableMhs': {
    #                         '$sum': '$unbillableMhs'
    #                     }
    #                 }
    #             }, {
    #                 '$project': {
    #                     '_id': 0, 
    #                     'totalBillableMhs': 1, 
    #                     'totalUnbillableMhs': 1
    #                 }
    #             }
    #         ]
    #         task_SC_result = replace_nan_inf(list(self.estimates_collection.aggregate(SC_NC_pipeline)))
    #         if not task_SC_result:
    #             task_SC_result = {"totalBillableMhs": 0, "totalUnbillableMhs": 0}
    #         else:
    #             task_SC_result = task_SC_result[0]
    #         task_level_pipeline=[
    #     {
    #         '$match': {
    #             'estID': estimate_id
    #         }
    #     }, {
    #         '$unwind': '$tasks'
    #     }, {
    #         '$group': {
    #             '_id': '$tasks.sourceTask', 
    #             'totalAvgMhs': {
    #                 '$sum': {
    #                     '$ifNull': [
    #                         '$tasks.mhs.avg', 0
    #                     ]
    #                 }
    #             }, 
    #             'totalSpareCost': {
    #                 '$sum': {
    #                     '$sum': {
    #                         '$map': {
    #                             'input': {
    #                                 '$ifNull': [
    #                                     '$tasks.spare_parts', []
    #                                 ]
    #                             }, 
    #                             'as': 'part', 
    #                             'in': {
    #                                 '$ifNull': [
    #                                     '$$part.price', 0
    #                                 ]
    #                             }
    #                         }
    #                     }
    #                 }
    #             }
    #         }
    #     }, {
    #         '$project': {
    #             'sourceTask': '$_id', 
    #             'totalAvgMhs': 1, 
    #             'totalSpareCost': 1, 
    #             'billableMhs': {
    #                 '$cond': [
    #                     {
    #                         '$gte': [
    #                             '$totalAvgMhs', SCMH
    #                         ]
    #                     }, {
    #                         '$subtract': [
    #                             '$totalAvgMhs', SCMH
    #                         ]
    #                     }, 0
    #                 ]
    #             }, 
    #             'unbillableMhs': {
    #                 '$cond': [
    #                     {
    #                         '$gte': [
    #                             '$totalAvgMhs', SCMH
    #                         ]
    #                     }, SCMH, '$totalAvgMhs'
    #                 ]
    #             }, 
    #             'billableCost': {
    #                 '$cond': [
    #                     {
    #                         '$gte': [
    #                             '$totalSpareCost', SCMC
    #                         ]
    #                     }, {
    #                         '$subtract': [
    #                             '$totalSpareCost', SCMC
    #                         ]
    #                     }, 0
    #                 ]
    #             }, 
    #             'unbillableCost': {
    #                 '$cond': [
    #                     {
    #                         '$gte': [
    #                             '$totalSpareCost', SCMC
    #                         ]
    #                     }, SCMC, '$totalSpareCost'
    #                 ]
    #             }
    #         }
    #     }, {
    #         '$group': {
    #             '_id': None, 
    #             'totalBillableMhs': {
    #                 '$sum': '$billableMhs'
    #             }, 
    #             'totalUnbillableMhs': {
    #                 '$sum': '$unbillableMhs'
    #             }, 
    #             'totalBillableCost': {
    #                 '$sum': '$billableCost'
    #             }, 
    #             'totalUnbillableCost': {
    #                 '$sum': '$unbillableCost'
    #             }
    #         }
    #     }, {
    #         '$project': {
    #             '_id': 0, 
    #             'totalBillableMhs': 1, 
    #             'totalUnbillableMhs': 1, 
    #             'totalBillableCost': 1, 
    #             'totalUnbillableCost': 1
    #         }
    #     }
    # ]
    #         task_result=replace_nan_inf(list(self.estimates_collection.aggregate(task_level_pipeline)))
    #         logger.info("task_level fetched")
    #         if not task_result:
    #             task_level = {"totalBillableMhs": 0, "totalUnbillableMhs": 0, 
    #                         "totalBillableCost": 0, "totalUnbillableCost": 0}
    #         else:
    #             task_level = task_result[0]
    #         logger.info(f"capping_type fetched:{capping_type}")
    #         if capping_type == "per_source_card":    
    #             return {
    #                 **estimate_data,
    #                 'capping': {
    #                     'billable_mhs': task_level.get('totalBillableMhs', 0),
    #                     'unbillable_mhs': task_level.get('totalUnbillableMhs', 0),
    #                     'billable_cost': task_level.get('totalBillableCost', 0),
    #                     'unbillable_cost': task_level.get('totalUnbillableCost', 0)
    #                 }
    #             }
            
            
    #         elif capping_type == "per_IRC":
    #             return {
    #                 **estimate_data,
    #                 'capping': {
    #                     'billable_mhs': findings_level.get('totalBillableMhs', 0),
    #                     'unbillable_mhs': findings_level.get('totalUnbillableMhs', 0),
    #                     'billable_cost': findings_level.get('totalBillableCost', 0),
    #                     'unbillable_cost': findings_level.get('totalUnbillableCost', 0)
    #                 }
    #         }
  
    
    #     #per line item capping for material cost
    #         elif capping_type == "per_line_item":
    #             grouped_parts = {}
    #             total_spare_parts_billable = 0
    #             total_spare_parts_unbillable = 0
    #             spare_parts = estimate_data.get('overallEstimateReport', {}).get('spareParts', [])
    #             logger.info(f"spare parts:length{len(spare_parts)}")
    #             for part in spare_parts:
    #                 key = f"{part.get('partId')}_{part.get('desc')}"
    #                 if key not in grouped_parts:
    #                     grouped_parts[key] = 0
    #                 grouped_parts[key] += part.get('price', 0)
                
    #         #Calculate billable and unbillable in a single loop
    #             logger.info(f"Grouped parts:length={len(grouped_parts)}")
    #             for total_price in grouped_parts.values():
    #                 if total_price >= line_item:
    #                     billable = total_price - line_item
    #                     unbillable = line_item
    #                 else:
    #                     billable = 0
    #                     unbillable = total_price
                        
    #                 total_spare_parts_billable += billable
    #                 total_spare_parts_unbillable += unbillable
    #             return {
    #                 **estimate_data,
    #                 'capping': {
    #                     'billable_cost': total_spare_parts_billable,
    #                     'unbillable_cost': total_spare_parts_unbillable
    #                 }
    #             }
    #         elif capping_type =="N/A":
    #             return {
    #                 **estimate_data,
    #                 'capping': {
    #                     'billable_mhs': 0,
    #                     'unbillable_mhs': 0,
    #                     'billable_cost': 0,
    #                     'unbillable_cost': 0
    #                 }
    #             }
    #         elif capping_type=="per_IRC_no_cost":
    #             return {
    #                 **estimate_data,
    #                 'capping': {
    #                     'billable_mhs': findings_level.get('totalBillableMhs', 0),
    #                     'unbillable_mhs': findings_level.get('totalUnbillableMhs', 0),
    #                     'billable_cost': 0,
    #                     'unbillable_cost': 0
    #                 }
    #             }
    #         elif capping_type=="no_manhours_per_IRC":
    #             return {
    #                 **estimate_data,
    #                 'capping': {
    #                     'billable_mhs': 0,
    #                     'unbillable_mhs': 0,
    #                     'billable_cost': findings_level.get('totalBillableCost', 0),
    #                     'unbillable_cost': findings_level.get('totalUnbillableCost', 0)
    #                 }
    #             }
    #         elif capping_type=="per_source_card_no_cost":
    #             return {
    #                 **estimate_data,
    #                 'capping': {
    #                     'billable_mhs': task_SC_result.get('totalBillableMhs', 0),
    #                     'unbillable_mhs': task_SC_result.get('totalUnbillableMhs', 0),
    #                     'billable_cost': 0,
    #                     'unbillable_cost': 0
    #             }
    #         }
    #         elif capping_type=="no_manhours_per_source_card":
    #             task_level_pipeline = [
    #             {
    #                 '$match': {
    #                     'estID': estimate_id
    #                 }
    #             }, 
    #             {
    #                 '$unwind': '$tasks'
    #             }, 
    #             {
    #                 '$group': {
    #                     '_id': '$tasks.sourceTask', 
    #                     'totalSpareCost': {
    #                         '$sum': {
    #                             '$sum': {
    #                                 '$map': {
    #                                     'input': {
    #                                         '$ifNull': [
    #                                             '$tasks.spare_parts', []
    #                                         ]
    #                                     }, 
    #                                     'as': 'part', 
    #                                     'in': {
    #                                         '$ifNull': [
    #                                             '$$part.price', 0
    #                                         ]
    #                                     }
    #                                 }
    #                             }
    #                         }
    #                     }
    #                 }
    #             }, {
    #                 '$project': {
    #                     'sourceTask': '$_id', 
    #                     'totalSpareCost': 1, 
    #                     'billableCost': {
    #                         '$cond': [
    #                             {
    #                                 '$gte': [
    #                                     '$totalSpareCost', SCMC
    #                                 ]
    #                             }, {
    #                                 '$subtract': [
    #                                     '$totalSpareCost', SCMC
    #                                 ]
    #                             }, 0
    #                         ]
    #                     }, 
    #                     'unbillableCost': {
    #                         '$cond': [
    #                             {
    #                                 '$gte': [
    #                                     '$totalSpareCost', SCMC
    #                                 ]
    #                             }, SCMC, '$totalSpareCost'
    #                         ]
    #                     }
    #                 }
    #             }, {
    #                 '$group': {
    #                     '_id': None, 
    #                     'totalBillableCost': {
    #                         '$sum': '$billableCost'
    #                     }, 
    #                     'totalUnbillableCost': {
    #                         '$sum': '$unbillableCost'
    #                     }
    #                 }
    #             }, {
    #                 '$project': {
    #                     '_id': 0, 
    #                     'totalBillableCost': 1, 
    #                     'totalUnbillableCost': 1
    #                 }
    #             }
    #         ]

    #             task_result = list(self.estimates_collection.aggregate(task_level_pipeline))
    #             task_level = task_result[0]

    #             return {
    #                 **estimate_data,
    #                 'capping': {
    #                     'billable_mhs': 0, 
    #                     'unbillable_mhs': 0,
    #                     'billable_cost': task_level.get('totalBillableCost', 0),
    #                     'unbillable_cost': task_level.get('totalUnbillableCost', 0)
    #                 }
    #             }
    #         elif capping_type=="per_source_card_per_IRC":
    #             return{
    #                 **estimate_data,
    #                 'capping':{
    #                     'billable_mhs':task_SC_result.get('totalBillableMhs',0),
    #                     'unbillable_mhs':task_SC_result.get('totalUnbillableMhs',0),
    #                     'billable_cost':findings_level.get('totalBillableCost',0),
    #                     'unbillable_cost':findings_level.get('totalUnbillableCost',0)
    #                 }
    #             }
    #         elif capping_type=="per_IRC_per_source_card":
    #             return{
    #                 **estimate_data,
    #                 'capping':{
    #                     'billable_mhs':task_result.get('totalBillableMhs',0),
    #                     'unbillable_mhs':task_result.get('totalUnbillableMhs',0),
    #                     'billable_cost':findings_level.get('totalBillableCost',0),
    #                     'unbillable_cost':findings_level.get('totalUnbillableCost',0)
    #                 }
    #             }
                    
    #         logger.info("Estimated collection fetched successfully")
            
            return estimate_data

        except Exception as e:
            logger.error(f"Error fetching estimate {estimate_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"error fetching estimate id {estimate_id}: {str(e)}")


    def get_probability_wise_manhrsspareparts(self,estimate_id:str)->ProbabilityWiseManhrsSpareCost:
        """
        Get estimate by ID with filtered findings based on probability comparison
        Returns raw aggregation result directly from MongoDB
        """
        logger.info(f"Fetching estimate by ID: {estimate_id}")
        try:
            
            
            pipeline = [
    {
        '$match': {
            'estID': estimate_id
        }
    }, {
        '$project': {
            'estID': 1, 
            'estProb': {
                '$objectToArray': '$probabilityGraph'
            }
        }
    }, {
        '$project': {
            '_id': 0, 
            'estID': 1, 
            'estProb': {
                '$map': {
                    'input': '$estProb', 
                    'as': 'item', 
                    'in': {
                        'prob': {
                            '$toDouble': {
                                '$arrayElemAt': [
                                    {
                                        '$split': [
                                            {
                                                '$substr': [
                                                    '$$item.k', 5, -1
                                                ]
                                            }, ')'
                                        ]
                                    }, 0
                                ]
                            }
                        }, 
                        'totalManhrs': '$$item.v.mh', 
                        'totalSpareCost': '$$item.v.spareCost'
                    }
                }
            }
        }
    },{
        '$project': {
            'estID': 1, 
            'estProb': {
                '$sortArray': {
                    'input': '$estProb', 
                    'sortBy': {
                        'prob': 1
                    }
                }
            }
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
    },
      {
        '$addFields': {
            'ceilRequestedQuantity': {
                '$ceil': '$requested_quantity'
            }
        }
    },  {
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
                # 'partDescription': '$part_description'
            }, 
            'partDescription': {
                '$first': '$part_description'
            }, 
            'totalTasksQty': {
                '$sum': '$ceilRequestedQuantity'
            }, 
            'taskNumbers': {
                '$push': '$task_number'
            }
        }
    }, {
        '$project': {
            '_id': 0, 
            'partId': '$_id.partId', 
            # 'partDescription': '$_id.partDescription', 
            'partDescription': 1,
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
    },
    {
        '$addFields': {
            'ceilUsedQuantity': {
                '$ceil': '$used_quantity'
            }
        }
    },
      {
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
                # 'partDescription': {
                #     '$replaceAll': {
                #         'input': '$part_description', 
                #         'find': ' ', 
                #         'replacement': ''
                #     }
                # }
            }, 
            'partDescription': {
                '$first': '$part_description'
            },
            'totalFindingsQty': {
                '$sum': '$ceilUsedQuantity'
            }, 
            'task_numbers': {
                '$addToSet': '$task_info.log_item_number'
            }
        }
    }, {
        '$project': {
            '_id': 0, 
            'partId': '$_id.partId', 
            # 'partDescription': '$_id.partDescription', 
            'partDescription': 1,
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
    }, 
    {
        '$addFields': {
            'ceilUsedQuantity': {
                '$ceil': '$used_quantity'
            }
        }
    },{
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
            '_id': '$issued_part_number', 
                # 'partDescription': {
                #     '$replaceAll': {
                #         'input': '$part_description', 
                #         'find': ' ', 
                #         'replacement': ''
                #     }
                # }
            'partDescription': {
                '$first': '$part_description'
            },
            'totalTasksQty': {
                '$sum': '$ceilUsedQuantity'
            }, 
            'task_numbers': {
                '$addToSet': '$task_number'
            }
        }
    }, {
        '$project': {
            '_id': 0, 
            'partId': '$_id', 
            'partDescription': 1, 
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


    async def validate_tasks_checkcategory(self, estimate_request: ValidRequestCheckCategory, current_user: dict = Depends(get_current_user)) -> List[ValidTasks]:
        """
        Validate tasks by checking if they exist in the task_description collection.
        """
        try:
            task_ids = estimate_request.tasks
            checks = estimate_request.typeOfCheck
            logger.info(f"Validating tasks: {task_ids} with checks: {checks}")
            pipeline=[
                {
                    '$match': {
                        'check_category': {
                            '$in':checks
                        }
                    }
                }, {
                '$project': {
                    '_id': 0, 
                    'check_category': 1, 
                    'package_number': 1
                }
            }]

            aircraft_details=list(self.aircraft_details_collection.aggregate(pipeline))
            logger.info(f"aircraft_details fetched successfully:{aircraft_details}")

            LhRhTasks = list(self.RHLH_Tasks_collection.find({},))
            logger.info("LhRhTasks fetched successfully")
        
            lrhTasks = updateLhRhTasks(LhRhTasks, task_ids)
        
            existing_tasks_list = self.lhrh_task_description.find(
                {"task_number": {"$in": lrhTasks},
                 "package_number": {"$in": [item['package_number'] for item in aircraft_details]}
                },
                {"_id": 0, "task_number": 1, "description": 1}
            )
            existing_tasks_list = list(existing_tasks_list)

            cleaned_task_map = {}
            for doc in existing_tasks_list:
                task_number = doc["task_number"]
                description = doc["description"]
                if " (LH)" in task_number or " (RH)" in task_number:
                    task_number = task_number.split(" ")[0]  
                cleaned_task_map[task_number] = description

            logger.info(f"cleaned_task_map: {cleaned_task_map}")

            
            cleaned_lrhTasks = set()  
            for task in lrhTasks:
                if " (LH)" in task or " (RH)" in task:
                    task = task.split(" ")[0] 
                cleaned_lrhTasks.add(task)
            cleaned_lrhTasks = list(cleaned_lrhTasks)

            validated_tasks = [
                {
                    "taskid": task,
                    "status": task in cleaned_task_map,
                    "description": cleaned_task_map.get(task, " ") 
                }
                for task in cleaned_lrhTasks
            ]
            return validated_tasks

        except Exception as e:
            logger.error(f"Error validating tasks: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error validating tasks: {str(e)}"
            )

def replace_nan_inf(obj):
            """Helper function to recursively replace NaN and inf values with None"""
            if isinstance(obj, dict):
                return {k: replace_nan_inf(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [replace_nan_inf(x) for x in obj]
            elif isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
                return None
            return obj


def updateLhRhTasks(LhRhTasks, task_ids):
    """
    Update MPD tasks by adding (LH) and (RH) suffixes for tasks marked as LHRH.
    Parameters:
    - LhRhTasks: DataFrame with 'LHRH' and 'TASK_CLEANED' columns
    - MPD_TASKS: DataFrame with 'TASK NUMBER' and 'DESCRIPTION' columns
    Returns:
    - Updated DataFrame with LH and RH tasks duplicated if LHRH == 1
    """
    
    lhrh_task_list = [doc["TASK_CLEANED"] for doc in LhRhTasks if doc.get("LHRH") == 1]

    updated_tasks = []
    for task_id in task_ids:
        task_str = str(task_id)
        if task_str in lhrh_task_list:
            # Add both LH and RH versions for LHRH tasks
            updated_tasks.append(f"{task_str} (LH)")
            updated_tasks.append(f"{task_str} (RH)")
        else:
            # Keep regular tasks unchanged
            updated_tasks.append(task_str)
        logger.info(f"the updated taks:{updated_tasks}")
    
    return updated_tasks