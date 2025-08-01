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
import sys
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
        self.taskpartslhrh_collection=self.mongo_client.get_collection("task_parts_lhrh")

        self.subtaskparts_collection=self.mongo_client.get_collection("sub_task_parts")
        self.subtaskpartslhrh_collection=self.mongo_client.get_collection("sub_task_parts_lhrh")
        # self.tasks_collection = self.mongo_client.get_collection("tasks")
        # self.tasks_collection=self.mongo_client.get_collection("task_description")
        self.tasks_collection = self.mongo_client.get_collection("estima_input_upload")
        self.taskdescription_collection=self.mongo_client.get_collection("task_description")
        self.taskdescriptionlhrh_collection=self.mongo_client.get_collection("task_description_max500mh_lhrh")

        self.sub_task_collection=self.mongo_client.get_collection("sub_task_description")
        self.subtaskdescriptionlhrh_collection=self.mongo_client.get_collection("sub_task_description_max500mh_lhrh")

        self.estimates_status_collection=self.mongo_client.get_collection("estimates_status")
        self.configurations_collection=self.mongo_client.get_collection("configurations")
        self.capping_data_collection=self.mongo_client.get_collection("capping_data")
        self.estimate_file_upload=self.mongo_client.get_collection("estimate_file_upload")
        self.RHLH_Tasks_collection=self.mongo_client.get_collection("RHLH_Tasks")
        self.lhrh_task_description=self.mongo_client.get_collection("task_description_max500mh_lhrh")
        self.aircraft_details_collection=self.mongo_client.get_collection("aircraft_details")
        self.operators_collection=self.mongo_client.get_collection("operators_master")
    
    
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
            estimates_pipeline=[
    {
        '$project': {
            '_id': 0, 
            'estID': 1, 
            'description': 1, 
            'createdAt': 1, 
            'lastUpdated': 1, 
            'createdBy': 1
        }
    }
]
            
            estimates = list(self.estimates_collection.aggregate(estimates_pipeline))
            logger.info(f"Fetched {len(estimates)} estimates")
   
            return estimates

        except Exception as e:
            logger.error(f"Error fetching estimates: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error fetching estimates: {str(e)}"
            )
        
    async def get_filtered_tasks(self,estID:str,current_user: dict = Depends(get_current_user)) -> Dict:
        """
        Get filtered tasks based on the provided estimate ID.
        """
        logger.info(f"Fetching filtered tasks for estID: {estID}")

        try:
            if not estID:
                raise HTTPException(
                    status_code=400,
                    detail="Estimate ID is required"
                )
            filtered_pipeline=[
    {
        '$match': {
            'estID': estID
        }
    }, {
        '$project': {
            '_id': 0, 
            'available_tasks': '$filtered_tasks', 
            'not_avialable_tasks': 1,
            'filtered_tasks_count': 1
        }
    }
]
            
            filtered_tasks = list(self.estimates_collection.aggregate(filtered_pipeline))
            logger.info(f"Filtered tasks fetched successfully: {len(filtered_tasks)} tasks found")
            if not filtered_tasks:
                logger.warning(f"No filtered tasks found for estID: {estID}")
                return {"data": {}, "response": {"statusCode": 404, "message": "No tasks found for the given estimate ID"}}
            return filtered_tasks[0]
        except Exception as e:
            logger.error(f"Error fetching filtered tasks: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error fetching filtered tasks: {str(e)}"
            )
    
    async def validate_tasks(self, estimate_request: ValidRequest, current_user: dict = Depends(get_current_user)) -> List[ValidTasks]:
        """
        Validate tasks by checking if they exist in the task_description collection.
        For tasks not found (status=False), fill the description from the input description[] by index.
        Only unique cleaned taskids will be returned.
        """
        try:
            task_ids = estimate_request.tasks
            input_descriptions = estimate_request.description

            # Map input taskid to its index
            task_index_map = {task: idx for idx, task in enumerate(task_ids)}

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

            # Use an ordered set for unique cleaned tasks, preserving order of first occurrence
            from collections import OrderedDict
            unique_cleaned_lrhTasks = OrderedDict()
            cleaned_task_original_map = {}

            for task in lrhTasks:
                cleaned_task = task
                if " (LH)" in task or " (RH)" in task:
                    cleaned_task = task.split(" ")[0]
                if cleaned_task not in unique_cleaned_lrhTasks:
                    unique_cleaned_lrhTasks[cleaned_task] = None
                if cleaned_task not in cleaned_task_original_map:
                    cleaned_task_original_map[cleaned_task] = []
                cleaned_task_original_map[cleaned_task].append(task)

            validated_tasks = []
            for cleaned_task in unique_cleaned_lrhTasks.keys():
                status = cleaned_task in cleaned_task_map
                if status:
                    description = cleaned_task_map[cleaned_task]
                else:
                    matched_index = None
                    for orig_task in cleaned_task_original_map.get(cleaned_task, []):
                        if orig_task in task_index_map:
                            matched_index = task_index_map[orig_task]
                            break
                    # Fallback: try direct match
                    if matched_index is None and cleaned_task in task_index_map:
                        matched_index = task_index_map[cleaned_task]
                    if matched_index is not None and matched_index < len(input_descriptions):
                        description = input_descriptions[matched_index]
                    else:
                        description = ""
                validated_tasks.append({
                    "taskid": cleaned_task,
                    "status": status,
                    "description": description
                })
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
            'from': 'task_description_max500mh_lhrh', 
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
                        'from': 'sub_task_description_max500mh_lhrh', 
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
                        'from': 'task_description_max500mh_lhrh', 
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
                        'from': 'task_description_max500mh_lhrh', 
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
         
            task_parts_result = list(self.taskpartslhrh_collection.aggregate(task_parts_pipeline))
            sub_task_parts_result = list(self.subtaskpartslhrh_collection.aggregate(sub_task_parts_pipeline))

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

            # Execute MongoDB queries
            task_skill_results = list(self.taskdescriptionlhrh_collection.aggregate(task_skill_pipeline))
            sub_task_skill_results = list(self.subtaskdescriptionlhrh_collection.aggregate(sub_tasks_skill_pipeline))
            
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
            'cappingDetails':1,
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
            'from': 'task_description_max500mh_lhrh', 
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
            'from': 'sub_task_description_max500mh_lhrh', 
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
            'from': 'task_description_max500mh_lhrh', 
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
        task_parts_results = list(self.taskpartslhrh_collection.aggregate(task_parts_pipeline))
        logger.info(f"task_parts_results: {len(task_parts_results)}")
        findings_HMV_results = list(self.subtaskpartslhrh_collection.aggregate(findings_HMV_parts_pipeline))
        logger.info(f"findings_HMV_results: {len(findings_HMV_results)}")
        findings_nonHMV_results = (self.subtaskpartslhrh_collection.aggregate(findings_nonHMV_parts_pipeline))
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
    async def upload_operator_list(self,current_user: dict = Depends(get_current_user)) -> Dict[str, str]:
        try:
            """
            Upload operator list to the database.
            """
            logger.info("Uploading operator list")
            pipeline=[
    {
        '$group': {
            '_id': '$customer_name'
        }
    }, {
        '$project': {
            '_id': 0, 
            'operator': '$_id'
        }
    }
]
            operator_list=list(self.aircraft_details_collection.aggregate(pipeline))
            logger.info(f"aircraft_details fetched successfully:{operator_list}")
            if operator_list:
                self.operators_collection.insert_many(operator_list)
                logger.info(f"Inserted operators: {operator_list}")
            else:
                logger.info("No operators to insert.")

            return {"status": "success", "message": "Operator list uploaded successfully"}
        except Exception as e:
            logger.error(f"Error uploading operator list: {e}")
            return {"status": "error", "message": str(e)}

            
    async def get_operator_list(self, current_user: dict = Depends(get_current_user)) -> List[str]:
        """
        Get the list of operators from the database.
        """
        try:
            logger.info("Fetching operator list")
            operators = list(self.operators_collection.find({}, {"_id": 0, "operator": 1}))
            operator_list = [op["operator"] for op in operators]
            logger.info(f"Fetched operators: {operator_list}")
            return operator_list
        except Exception as e:
            logger.error(f"Error fetching operator list: {e}")
            raise HTTPException(status_code=500, detail=f"Error fetching operator list: {str(e)}")
    
    async def model_tasks_validate(self, MPD_TASKS, ADD_TASKS, aircraft_age, aircraft_model, customer_name_consideration, check_category, customer_name, age_cap=3, current_user: dict = Depends(get_current_user)):
        """
        Validate model tasks based on aircraft parameters and customer requirements.
        
        Args:
            MPD_TASKS: DataFrame containing MPD task data
            ADD_TASKS: DataFrame containing additional task data
            aircraft_age: Age of the aircraft (will be converted to float)
            aircraft_model: Model of the aircraft
            customer_name_consideration: Boolean flag for customer name filtering
            check_category: List of check categories to filter by
            customer_name: Customer name for filtering (if customer_name_consideration is True)
            age_cap: Initial age range for filtering (default: 3)
            current_user: Current user information
        
        Returns:
            Dictionary containing filtered tasks and statistics
        """
        
        try:
            print("Validating model tasks with the following parameters:")
            sys.stdout.flush()
            # Extract tasks and descriptions
            tasks = MPD_TASKS.tasks
            print("length of tasks:", len(tasks))
            sys.stdout.flush()
            descriptions = MPD_TASKS.description
            print("length of descriptions:", len(descriptions))
            sys.stdout.flush()
            addtasks = ADD_TASKS.tasks
            add_descriptions = ADD_TASKS.description
            
            # Clean task data by removing whitespace
            if len(addtasks)>0:
                if " " in addtasks: 
                    addtasks.remove(" ")
                addtasks = addtasks.astype(str).str.strip() if hasattr(addtasks, 'str') else [str(task).strip() for task in addtasks]

            if len(add_descriptions)>0:
                if " " in add_descriptions:
                    add_descriptions.remove(" ")
                add_descriptions = add_descriptions.astype(str).str.strip() if hasattr(add_descriptions, 'str') else [str(desc).strip() for desc in add_descriptions]
            
            # Create DataFrames
            MPD_TASKS = pd.DataFrame({"TASK NUMBER": tasks, "DESCRIPTION": descriptions})
            MPD_TASKS["TASK NUMBER"] = MPD_TASKS["TASK NUMBER"].astype(str).str.strip()
            MPD_TASKS = MPD_TASKS.drop_duplicates(subset=["TASK NUMBER"]).reset_index(drop=True)
            ADD_TASKS = pd.DataFrame({"TASK NUMBER": addtasks, "DESCRIPTION": add_descriptions})
            if not ADD_TASKS.empty:
                ADD_TASKS["TASK NUMBER"] = ADD_TASKS["TASK NUMBER"].astype(str).str.strip()
                ADD_TASKS = ADD_TASKS.drop_duplicates(subset=["TASK NUMBER"]).reset_index(drop=True)

            print("MPD_TASKS and ADD_TASKS DataFrames created successfully.")
            # Fetch LH/RH tasks and update MPD tasks
            LhRhTasks = pd.DataFrame(list(self.RHLH_Tasks_collection.find({})))
            
            mpd_task_data = modelUpdateLhRhTasks(LhRhTasks, MPD_TASKS)
            add_task_data = modelUpdateLhRhTasks(LhRhTasks, ADD_TASKS)
            
            # Combine MPD and additional tasks
            mpd_task_data = pd.concat([mpd_task_data, add_task_data], ignore_index=True)
            if mpd_task_data.empty:
                raise ValueError("Input MPD_TASKS or ADD_TASKS data cannot be empty.")
            
            mpd_task_data = mpd_task_data.drop_duplicates(subset=["TASK NUMBER"]).reset_index(drop=True) 
            
            # Fetch aircraft details
            aircraft_details = pd.DataFrame(list(self.aircraft_details_collection.find({})))
            
            # Validate and convert aircraft_age to float
            try:
                aircraft_age = float(aircraft_age)
            except (ValueError, TypeError):
                raise ValueError(f"Invalid aircraft_age: {aircraft_age}. Must be a number.")
            
            # Ensure aircraft_details has the required columns
            if aircraft_details.empty:
                print("Warning: No aircraft details found in database. All tasks will be marked as not available.")
                # Return all tasks as not available
                return return_all_tasks_as_not_available(mpd_task_data, ADD_TASKS)
            
            required_columns = ['aircraft_age', 'aircraft_model', 'check_category']

                
            missing_columns = [col for col in required_columns if col not in aircraft_details.columns]
            if missing_columns:
                print(f"Warning: Missing required columns in aircraft_details: {missing_columns}. All tasks will be marked as not available.")
                return return_all_tasks_as_not_available(mpd_task_data, ADD_TASKS)
            
            # Convert aircraft_age column to float, handle non-numeric values
            aircraft_details['aircraft_age'] = pd.to_numeric(aircraft_details['aircraft_age'], errors='coerce')
            
            # Remove rows with invalid aircraft_age
            aircraft_details = aircraft_details.dropna(subset=['aircraft_age'])
            
            # Define aircraft model families
            aircraft_model_families = {
                "A320_family": ["A319", "A320", "A321"],
                "Boeing_NG": ["B737 NG", "B737-800(BCF)"],
                "others": ["ATR42", "ATR72", "Q400", "B737 MAX"]
            }
            
            # Determine aircraft model family
            aircraft_model_family = []
            for family_name, models in aircraft_model_families.items():
                if aircraft_model in models:
                    if family_name in ["A320_family", "Boeing_NG"]:
                        aircraft_model_family = models
                    else:  # others
                        aircraft_model_family = [aircraft_model]
                    break
            else:
                # If aircraft_model not found in predefined families, use all available models
                aircraft_model_family = aircraft_details['aircraft_model'].unique().tolist()

            print(f"Aircraft model: {aircraft_model}, Check category: {check_category}, Aircraft age: {aircraft_age}")
            print(f"Aircraft model family: {aircraft_model_family}")
            
            # Ensure check_category is a list
            if not isinstance(check_category, list):
                check_category = [check_category]
            
            # Initialize variables
            train_packages = []
            original_age_cap = age_cap
            max_age_limit = 30
            min_packages_required = 5
            
            # Find training packages based on aircraft age
            if aircraft_age > 0.0:
                # Continue increasing age_cap until we get at least 5 packages or reach the maximum age limit
                while len(train_packages) < min_packages_required and (aircraft_age + age_cap) <= max_age_limit:
                    # Calculate age range
                    min_age = max(aircraft_age - age_cap, 0)
                    max_age = min(aircraft_age + age_cap, max_age_limit)
                    
                    # Build filter conditions
                    base_filter = (
                        (aircraft_details["aircraft_model"].isin(aircraft_model_family)) & 
                        (aircraft_details["check_category"].isin(check_category)) & 
                        (aircraft_details["aircraft_age"].between(min_age, max_age))
                    )
                    
                    if customer_name_consideration and customer_name:
                        # Add customer name filter
                        customer_filter = aircraft_details["customer_name"].astype(str).str.contains(
                            customer_name, na=False, case=False
                        )
                        combined_filter = base_filter & customer_filter
                    else:
                        combined_filter = base_filter
                    
                    # Get unique package numbers
                    train_packages = aircraft_details[combined_filter]["package_number"].unique().tolist()
                    
                    # If we found enough packages, break
                    if len(train_packages) >= min_packages_required:
                        break
                    
                    # Increase age_cap for next iteration
                    age_cap += 1
                    
                    print(f"Age cap increased to {age_cap}, found {len(train_packages)} packages")
            else:
                # For aircraft_age <= 0, don't use age filtering
                base_filter = (
                    (aircraft_details["aircraft_model"].isin(aircraft_model_family)) & 
                    (aircraft_details["check_category"].isin(check_category))
                )
                
                if customer_name_consideration and customer_name:
                    customer_filter = aircraft_details["customer_name"].astype(str).str.contains(
                        customer_name, na=False, case=False
                    )
                    combined_filter = base_filter & customer_filter
                else:
                    combined_filter = base_filter
                
                train_packages = aircraft_details[combined_filter]["package_number"].unique().tolist()

            # Check if we found any packages - if not, return all tasks as not available
            if len(train_packages) == 0:
                print(f"No packages found for aircraft model {aircraft_model} with check category {check_category} and age {aircraft_age}. All tasks will be marked as not available.")
                return return_all_tasks_as_not_available(mpd_task_data, ADD_TASKS, age_cap)
            
            print(f"Found {len(train_packages)} packages with final age_cap of {age_cap}")
            print("Training packages extracted successfully")
            print("Processing tasks...")
            
            mpd_task_numbers = mpd_task_data["TASK NUMBER"].astype(str).str.strip().unique().tolist()
            
            # Get task data for the selected packages
            task_data_cursor = self.lhrh_task_description.find(
                {"package_number": {"$in": train_packages},"task_number": {"$in": mpd_task_numbers}},
                {"_id": 0, "task_number": 1, "description": 1, "package_number": 1}
            )
            task_data = pd.DataFrame(list(task_data_cursor))
            
            # If task_data is empty, return all tasks as not available
            if task_data.empty:
                print(f"No tasks data found for the selected packages. All tasks will be marked as not available.")
                return return_all_tasks_as_not_available(mpd_task_data, ADD_TASKS, age_cap, len(train_packages))
            
            # Get unique task numbers from filtered data
            task_description_unique_task_list = task_data["task_number"].unique().tolist() if not task_data.empty else []
            
            # Get all task data for MPD tasks
            if not mpd_task_data.empty:
                mpd_task_numbers = mpd_task_data["TASK NUMBER"].astype(str).str.strip().unique().tolist()
                task_all_data_cursor = self.lhrh_task_description.find(
                    {"task_number": {"$in": mpd_task_numbers}},
                    {"_id": 0, "task_number": 1, "description": 1, "package_number": 1}
                )
                task_all_data = pd.DataFrame(list(task_all_data_cursor))
            else:
                task_all_data = pd.DataFrame()
            
            # Helper function to remove LH/RH suffixes
            def lhrh_removal(task_numbers):
                """Remove ' (LH)' and ' (RH)' suffixes from task numbers."""
                if not task_numbers:
                    return []
                return list({str(task_number).replace(" (LH)", "").replace(" (RH)", "") 
                            for task_number in task_numbers})

            # Get distinct task_number and description combinations
            filtered_tasks = pd.DataFrame()
            filtered_task_numbers = []
            
            if not task_data.empty:
                filtered_tasks = task_data[["task_number", "description"]].groupby(
                    "task_number", as_index=False
                ).agg({"description": "first"})
                filtered_task_numbers = lhrh_removal(filtered_tasks["task_number"].unique().tolist())
            
            # Find tasks not available in filtered results
            not_available_tasks = pd.DataFrame() 
            if not mpd_task_data.empty:
                mpd_task_numbers_cleaned = lhrh_removal(mpd_task_data["TASK NUMBER"].unique().tolist())
                not_available_task_numbers = [
                    task for task in mpd_task_numbers_cleaned 
                    if task not in filtered_task_numbers
                ]
                
                if not_available_task_numbers:
                    # Find original task numbers that correspond to not available cleaned numbers
                    original_not_available = mpd_task_data[
                        mpd_task_data["TASK NUMBER"].apply(
                            lambda x: str(x).replace(" (LH)", "").replace(" (RH)", "")
                        ).isin(not_available_task_numbers)
                    ].copy()
                    
                    not_available_tasks = original_not_available.rename(columns={
                        "TASK NUMBER": "task_number", 
                        "DESCRIPTION": "description"
                    })
            
            # Function to get check category for a task
            def get_check_category(task_number):
                """Get the check category for a given task number."""
                if task_all_data.empty:
                    return ["Not Available"]
                    
                if task_number in task_all_data["task_number"].values:
                    task_packages = task_all_data.loc[
                        task_all_data["task_number"] == task_number, "package_number"
                    ].unique().tolist()
                    
                    if task_packages and not aircraft_details.empty:
                        check_categories = aircraft_details[
                            aircraft_details["package_number"].isin(task_packages)
                        ]["check_category"].unique().tolist()
                        return check_categories if check_categories else ["Not Available"]
                
                return ["Not Available"]

            # Add check category to not_available_tasks
            if not not_available_tasks.empty:
                not_available_tasks["check_category"] = not_available_tasks["task_number"].apply(get_check_category)
            
            # Create proper boolean masks for additional tasks filtering
            if not filtered_tasks.empty and not ADD_TASKS.empty:
                add_task_numbers = ADD_TASKS["TASK NUMBER"].astype(str).str.strip().tolist()
                add_filtered_tasks = filtered_tasks[filtered_tasks["task_number"].apply(lambda x: str(x).replace(" (LH)", "").replace(" (RH)", ""))
                    .isin(add_task_numbers)
                    ]
            else:
                add_filtered_tasks = pd.DataFrame(columns=["task_number", "description"] if not filtered_tasks.empty else [])

            # Fix: Corrected the logic for add_not_available_tasks
            if not not_available_tasks.empty and not ADD_TASKS.empty:
                add_task_numbers = ADD_TASKS["TASK NUMBER"].astype(str).str.strip().tolist()
                add_not_available_tasks = not_available_tasks[
                    not_available_tasks["task_number"]
                    .apply(lambda x: str(x).replace(" (LH)", "").replace(" (RH)", ""))
                    .isin(add_task_numbers)
                    ]
            else:
                columns = ["task_number", "description", "check_category"] if not not_available_tasks.empty else []
                add_not_available_tasks = pd.DataFrame(columns=columns)
            
            # Remove additional tasks from main task lists
            if not filtered_tasks.empty and not ADD_TASKS.empty:
                add_task_numbers = ADD_TASKS["TASK NUMBER"].astype(str).str.strip().tolist()
                filtered_tasks = filtered_tasks[~filtered_tasks["task_number"].isin(add_task_numbers)]
            
            if not not_available_tasks.empty and not ADD_TASKS.empty:
                add_task_numbers = ADD_TASKS["TASK NUMBER"].astype(str).str.strip().tolist()
                not_available_tasks = not_available_tasks[~not_available_tasks["task_number"].isin(add_task_numbers)]
            
            # Convert DataFrames to lists of dictionaries
            filtered_tasks_list = filtered_tasks.to_dict('records') if not filtered_tasks.empty else []
            not_available_tasks_list = not_available_tasks.to_dict('records') if not not_available_tasks.empty else []
            
            # Calculate task counts
            total_mpd_tasks = 0
            if not MPD_TASKS.empty:
                total_mpd_tasks += len(MPD_TASKS["TASK NUMBER"].astype(str).str.strip().unique().tolist())
            if not ADD_TASKS.empty:
                total_mpd_tasks += len(ADD_TASKS["TASK NUMBER"].astype(str).str.strip().unique().tolist())
                
            available_tasks_count = len(filtered_task_numbers)
            not_available_tasks_count = total_mpd_tasks - available_tasks_count
            
            filtered_tasks_count = {
                "total_count": total_mpd_tasks,
                "not_available_tasks_count": not_available_tasks_count,
                "available_tasks_count": available_tasks_count
            }
            
            print(f"Task processing completed. Available: {available_tasks_count}, Not available: {not_available_tasks_count}")
            
            # Return serializable results only
            return {
                "filtered_tasks_list": filtered_tasks_list,
                "not_available_tasks_list": not_available_tasks_list,
                "filtered_tasks_count": filtered_tasks_count,
                "add_filtered_tasks": add_filtered_tasks.to_dict('records') if not add_filtered_tasks.empty else [],
                "add_not_available_tasks": add_not_available_tasks.to_dict('records') if not add_not_available_tasks.empty else [],
                "age_cap_used": age_cap,
                "packages_found": len(train_packages)
            }
            
        except ValueError as ve:
            print(f"Validation error in model_tasks_validate: {str(ve)}")
            raise HTTPException(status_code=400, detail=str(ve))
            
        except Exception as e:
            print(f"Error in model_tasks_validate: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

def return_all_tasks_as_not_available( mpd_task_data, ADD_TASKS, age_cap=3, packages_found=0):
    """
    Helper method to return all tasks as not available when no packages or task data is found.
    """
    # Prepare all tasks as not available
    all_not_available_tasks = mpd_task_data.rename(columns={
        "TASK NUMBER": "task_number", 
        "DESCRIPTION": "description"
    }).copy()
    
    # Add check_category as "Not Available" for all tasks
    all_not_available_tasks["check_category"] = ["Not Available"] * len(all_not_available_tasks)
    
    # Separate ADD_TASKS from MPD_TASKS in not available list
    add_not_available_tasks = pd.DataFrame(columns=["task_number", "description", "check_category"])
    if not ADD_TASKS.empty:
        add_task_numbers = ADD_TASKS["TASK NUMBER"].astype(str).str.strip().tolist()
        add_not_available_tasks = all_not_available_tasks[
            all_not_available_tasks["task_number"]
            .apply(lambda x: str(x).replace(" (LH)", "").replace(" (RH)", ""))
            .isin(add_task_numbers)
        ]
        
        # Remove additional tasks from main not available list
        all_not_available_tasks = all_not_available_tasks[
            ~all_not_available_tasks["task_number"]
            .apply(lambda x: str(x).replace(" (LH)", "").replace(" (RH)", ""))
            .isin(add_task_numbers)
        ]
    
    # Calculate task counts
    total_mpd_tasks = len(mpd_task_data["TASK NUMBER"].astype(str).str.strip().unique().tolist())
    
    filtered_tasks_count = {
        "total_count": total_mpd_tasks,
        "not_available_tasks_count": total_mpd_tasks,
        "available_tasks_count": 0
    }
    
    print(f"All {total_mpd_tasks} tasks marked as not available")
    
    return {
        "filtered_tasks_list": [],  # No available tasks
        "not_available_tasks_list": all_not_available_tasks.to_dict('records'),
        "filtered_tasks_count": filtered_tasks_count,
        "add_filtered_tasks": [],  # No available additional tasks
        "add_not_available_tasks": add_not_available_tasks.to_dict('records'),
        "age_cap_used": age_cap,
        "packages_found": packages_found
    }
            
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



def modelUpdateLhRhTasks(LhRhTasks, MPD_TASKS):
    """
    Update MPD tasks by adding (LH) and (RH) suffixes for tasks marked as LHRH.

    Parameters:
    - LhRhTasks: DataFrame with 'LHRH' and 'TASK_CLEANED' columns
    - MPD_TASKS: DataFrame with 'TASK NUMBER' and 'DESCRIPTION' columns

    Returns:
    - Updated DataFrame with LH and RH tasks duplicated if LHRH == 1
    """
    # Get list of task numbers where LHRH is 1
    LhRhTasks_list = LhRhTasks[LhRhTasks["LHRH"] == 1]["TASK_CLEANED"].tolist()
    
    # List to collect rows
    data = []

    for _, row in MPD_TASKS.iterrows():
        task_number = str(row["TASK NUMBER"])
        description = row["DESCRIPTION"]

        if task_number in LhRhTasks_list:
            data.append({"TASK NUMBER": f"{task_number} (LH)", "DESCRIPTION": description})
            data.append({"TASK NUMBER": f"{task_number} (RH)", "DESCRIPTION": description})
        else:
            data.append({"TASK NUMBER": task_number, "DESCRIPTION": description})
    
    # Convert list of rows to DataFrame
    mpdLhRhTasks = pd.DataFrame(data)
    return mpdLhRhTasks

