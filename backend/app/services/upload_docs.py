from fastapi import FastAPI, File, UploadFile, HTTPException,Depends
from fastapi.responses import ORJSONResponse
from typing import List, Dict, Any, Optional, Optional
import pandas as pd
import numpy as np
import os
# Try with a different encoding approach
import sys
import json
import math
import yaml
import re
import sys
from app.models.estimates import ValidTasks
from app.models.estimates import ComparisonResponse,ComparisonResult,EstimateResponse,DownloadResponse,EstimateRequest,EstimateStatusResponse
from app.log.logs import logger
from datetime import datetime, timedelta,timezone
import io
import hashlib
import base64
from app.db.database_connection import MongoDBClient
from fastapi.responses import StreamingResponse
from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import letter
from app.middleware.auth import get_current_user
from reportlab.pdfgen import canvas
from app.services.task_analytics_service import TaskService
from app.models.estimates import EstimateRequest
import asyncio
from app.services.task_analytics_service import updateLhRhTasks
import re
from fuzzywuzzy import process
from app.models.estimates import ValidRequest,ModelTasksRequest
from difflib import SequenceMatcher
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


class FileProcessingError(Exception):
    """Custom exception for file processing errors"""
    def __init__(self, message: str, details: Dict[str, Any] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)



class ExcelUploadService():
    def __init__(self):
        self.mongo_client = MongoDBClient()
        self.estima_collection=self.mongo_client.get_collection("estimate_file_upload")
        self.collection=self.mongo_client.get_collection("estima_input")
        self.estimate_output=self.mongo_client.get_collection("estima_output")
        self.estimate_file_upload=self.mongo_client.get_collection("estimate_file_upload")
        self.estimate=self.mongo_client.get_collection("create_estimate")
        self.configurations_collection=self.mongo_client.get_collection("configurations")
        self.remarks_collection=self.mongo_client.get_collection("estimate_status_remarks")
        self.parts_master_collection=self.mongo_client.get_collection("parts_master")
        self.operators_master_collection=self.mongo_client.get_collection("operators_master")
        self.LhRhTasks_collection = self.mongo_client.get_collection("RHLH_Tasks")
        self.error_detail=str("Following error occured while processing the file")
        self.RHLH_Tasks_collection=self.mongo_client.get_collection("RHLH_Tasks")
        self.lhrh_task_description=self.mongo_client.get_collection("task_description_max500mh_lhrh")
        self.task_service=TaskService()


        
       
    def clean_field_name(self, field_name: str) -> str:
        try:
            # Convert to string in case of non-string field names
            field_name = str(field_name).strip()
            
            # Remove special characters and replace with spaces
            clean_name = re.sub(r'[^a-zA-Z0-9\s]', ' ', field_name)
            
            # Split on spaces and capitalize first letter of each word except first
            words = clean_name.lower().split()
            if not words:
                return "unnamedField"
            camel_case = words[0] + ''.join(word.capitalize() for word in words[1:])
            if not camel_case[0].isalpha():
                camel_case = "f" + camel_case
                
            return camel_case
            
        except Exception as e:
            logger.error(f"Error cleaning field name '{field_name}': {str(e)}")
            return "unnamedField"
    async def validate_excel_file(self, file: UploadFile) -> None:
        if not file.filename:
            raise HTTPException(
                status_code=400,
                detail="No file provided"
            )
            
        if not file.filename.endswith(('.xls', '.xlsx', '.xlsm','.csv')):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Only .xls, .xlsx, .csv,and .xlsm files are allowed"
            )

    def clean_data(self, data: pd.DataFrame) -> pd.DataFrame:
        try:
            logger.info("Starting data cleaning...")
            logger.info(f"Original data shape: {data.shape}")
            logger.info(f"Original data types:\n{data.dtypes}")
            duplicates = data[data.duplicated(keep=False)]
            if not duplicates.empty:
                logger.info(f"Dropped duplicate rows:\n{duplicates}")
            
            cleaned_data = data.drop_duplicates()
            logger.info(f"Cleaned data shape: {cleaned_data.shape}")
            logger.info(f"Cleaned data types:\n{cleaned_data.dtypes}")
            
            
            for column in cleaned_data.columns:
                if cleaned_data[column].dtype == 'timedelta64[ns]':
                    logger.info(f"Converting timedelta column: {column}")
                    cleaned_data[column] = cleaned_data[column].dt.total_seconds()
                
                elif cleaned_data[column].dtype == 'datetime64[ns]':
                    logger.info(f"Converting datetime column: {column}")
                    cleaned_data[column] = pd.to_datetime(cleaned_data[column], utc=True)
                
                elif cleaned_data[column].dtype in ['float64', 'float32']:
                    mask = np.isinf(cleaned_data[column])
                    if mask.any():
                        logger.info(f"Replacing inf values in column: {column}")
                        cleaned_data.loc[mask, column] = None
            
            cleaned_data = cleaned_data.replace({np.nan: None})
            return cleaned_data
            
        except Exception as e:
            logger.error(f"Data cleaning error: {str(e)}")
            raise

    def read_excel_with_sheetName(self, content, file_extension):
        config_file_path = os.path.join("app", "fileconfig", "config.json")
        with open(config_file_path, 'r') as file:
            config = json.load(file)
        sheet_name = config['sheet_name']
        columns = config['columns']
        df = pd.read_excel(io.BytesIO(content), sheet_name=sheet_name, usecols=columns, engine='openpyxl' if file_extension != 'xls' else 'xlrd')
        return df

    
    async def process_file(self, file: UploadFile) -> Dict[str, Any]:
        try:
            content = await file.read()
            file_extension = file.filename.split('.')[-1].lower()  # Get the file extension

            if file_extension in ['xls', 'xlsx', 'xlsm']:
                excel_data = self.read_excel_with_sheetName(content, file_extension)
                logger.info(f"Excel data: {excel_data}")
                 # pd.read_excel(io.BytesIO(content), engine='openpyxl' if file_extension != 'xls' else 'xlrd')
            elif file_extension == 'csv':
                excel_data = pd.read_csv(io.BytesIO(content))
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Unsupported file type. Only .xls, .xlsx, .xlsm, and .csv files are allowed"
                )

            # if excel_data.empty:
            #     raise HTTPException(
            #         status_code=400,
            #         detail="The Excel file contains no data"
            #     )

            # Clean the data
            # cleaned_columns = {col: self.clean_field_name(col) for col in excel_data.columns}
            # excel_data.rename(columns=cleaned_columns, inplace=True)
            
            cleaned_data = self.clean_data(excel_data)
            processed_record = {}
            current_time = datetime.utcnow().replace(tzinfo=timezone.utc)
            
            
            for column in cleaned_data.columns:
                column_values = cleaned_data[column].dropna().tolist()
                processed_record[column] = column_values
            if 'TASK NUMBER' in processed_record:
                processed_record['task'] = processed_record.pop('TASK NUMBER')
            else:
                processed_record['task'] = []
            if 'DESCRIPTION' in processed_record:
                processed_record['description'] = processed_record.pop('DESCRIPTION')
            else:
                processed_record['description'] = []
            processed_record.update({
            "upload_timestamp": current_time,
            "original_filename": file.filename,
            "createdAt": current_time,
            "updatedAt": current_time,
            "status": "Initiated",
            "statusMPD":"Initiated",
            "statusFindings":"Initiated"
        })
            logger.info("Processed record")

            return processed_record  

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error processing Excel file: {str(e)}"
            )
   

    async def download_estimate_pdf(self,estimate_id: str)-> StreamingResponse:
        """
        Download estimate as PDF
        """
        logger.info(f"Fetching estimate with ID: {estimate_id}")
        task_service = TaskService()
        estimate_dict = task_service.get_estimate_by_id(estimate_id)
        
        logger.info(f"timate_dict: {estimate_dict}")
        if not estimate_dict:
            raise HTTPException(status_code=404, detail="Estimate not found")
        
        estimate = DownloadResponse(**estimate_dict)
        logger.info(f"Estimate from download response: {estimate}")

        # Create a PDF buffer
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        # Helper function to draw wrapped text
        def draw_wrapped_text(x, y, text, max_width):
            # Split the text into lines based on newline characters
            lines = text.split('\n')
            for line in lines:
                # Split the line into words for wrapping
                words = line.split(' ')
                current_line = ''
                for word in words:
                    if p.stringWidth(current_line + word, 'Helvetica', 12) < max_width:
                        current_line += word + ' '
                    else:
                        p.drawString(x, y, current_line.strip())  
                        y -= 15  
                        if y < 50:  
                            p.showPage()
                            p.setFont("Helvetica", 12)
                            y = height - 50  
                        current_line = word + ' '  

                # Draw any remaining text in the current line
                if current_line:
                    p.drawString(x, y, current_line.strip())
                    y -= 15  
                    if y < 50:  # Check if we need to create a new page
                        p.showPage()
                        p.setFont("Helvetica", 12)
                        y = height - 50  # Reset y position for new page

            return y

        p.setFont("Helvetica", 12)
        y_position = height - 50

        # Add content to the PDF in structured format
        y_position = draw_wrapped_text(100, y_position, f"estID: {estimate.estID}", width - 200)
        y_position = draw_wrapped_text(100, y_position, f"description: {estimate.description}", width - 200)

        # Add tasks
        y_position = draw_wrapped_text(100, y_position, "tasks:", width - 200)
        for task in estimate.tasks:
            y_position = draw_wrapped_text(120, y_position, f"- sourceTask: {task.sourceTask}", width - 200)
            y_position = draw_wrapped_text(140, y_position, f"  desc: {task.description}", width - 200)
            y_position = draw_wrapped_text(140, y_position, f"  cluster: {task.cluster}", width - 200)
            y_position = draw_wrapped_text(140, y_position, "  mhs:", width - 200)
            y_position = draw_wrapped_text(160, y_position, f"    min: {task.mhs.min}", width - 200)
            y_position = draw_wrapped_text(160, y_position, f"    max: {task.mhs.max}", width - 200)
            y_position = draw_wrapped_text(160, y_position, f"    avg: {task.mhs.avg}", width - 200)
            y_position = draw_wrapped_text(160, y_position, f"    est: {task.mhs.est}", width - 200)

            if task.spareParts:
                y_position = draw_wrapped_text(140, y_position, "  spareParts:", width - 200)
                for spare in task.spareParts:
                    y_position = draw_wrapped_text(160, y_position, f"- partId: {spare.partId}", width - 200)
                    y_position = draw_wrapped_text(160, y_position, f"  desc: {spare.desc}", width - 200)
                    y_position = draw_wrapped_text(160, y_position, f"  qty: {spare.qty}", width - 200)
                    y_position = draw_wrapped_text(160, y_position, f"  unit: {spare.unit}", width - 200)
                    y_position = draw_wrapped_text(160, y_position, f"  price: {spare.price}", width - 200)

        y_position = draw_wrapped_text(100, y_position, "aggregatedTasks:", width - 200)
        y_position = draw_wrapped_text(120, y_position, f"  totalMhs: {estimate.aggregatedTasks.totalMhs}", width - 200)
        y_position = draw_wrapped_text(120, y_position, f"  totalPartsCost: {estimate.aggregatedTasks.totalPartsCost}", width - 200)

        # Add findings
        y_position = draw_wrapped_text(100, y_position, "findings:", width - 200)
        for finding in estimate.findings:
            y_position = draw_wrapped_text(120, y_position, f"- taskId: {finding.taskId}", width - 200)
            y_position = draw_wrapped_text(120, y_position, "  details:", width - 200)
            for detail in finding.details:
                y_position = draw_wrapped_text(140, y_position, f"- logItem: {detail.logItem}", width - 200)
                y_position = draw_wrapped_text(140, y_position, f"  desc: {detail.description}", width - 200)
                y_position = draw_wrapped_text(140, y_position, f"  prob: {detail.prob}", width - 200)
                y_position = draw_wrapped_text(140, y_position, "  mhs:", width - 200)
                y_position = draw_wrapped_text(160, y_position, f"    min: {detail.mhs.min}", width - 200)
                y_position = draw_wrapped_text(160, y_position, f"    max: {detail.mhs.max}", width - 200)
                y_position = draw_wrapped_text(160, y_position, f"    avg: {detail.mhs.avg}", width - 200)
                y_position = draw_wrapped_text(160, y_position, f"    est: {detail.mhs.est}", width - 200)

                if detail.spareParts:
                    y_position = draw_wrapped_text(140, y_position, "  spareParts:", width - 200)
                    for spare in detail.spareParts:
                        y_position = draw_wrapped_text(160, y_position, f"- partId: {spare.partId}", width - 200)
                        y_position = draw_wrapped_text(160, y_position, f"  desc: {spare.desc}", width - 200)
                        y_position = draw_wrapped_text(160, y_position, f"  qty: {spare.qty}", width - 200)
                        y_position = draw_wrapped_text(160, y_position, f"  unit: {spare.unit}", width - 200)
                        y_position = draw_wrapped_text(160, y_position, f"  price: {spare.price}", width - 200)

        # y_position = draw_wrapped_text(100, y_position, "aggregatedFindingsByTask:", width - 200)
        # for aggregated_finding in estimate.aggregatedFindingsByTask:
        #     y_position = draw_wrapped_text(120, y_position, f"- taskId: {aggregated_finding.taskId}", width - 200)
        #     y_position = draw_wrapped_text(120, y_position, "  aggregatedMhs:", width - 200)
        #     y_position = draw_wrapped_text(140, y_position, f"    min: {aggregated_finding.aggregatedMhs.min}", width - 200)
        #     y_position = draw_wrapped_text(140, y_position, f"    max: {aggregated_finding.aggregatedMhs.max}", width - 200)
        #     y_position = draw_wrapped_text(140, y_position, f"    avg: {aggregated_finding.aggregatedMhs.avg}", width - 200)
        #     y_position = draw_wrapped_text(140, y_position, f"    est: {aggregated_finding.aggregatedMhs.est}", width - 200)
        #     y_position = draw_wrapped_text(120, y_position, f"  totalPartsCost: {aggregated_finding.totalPartsCost}", width - 200)

        y_position = draw_wrapped_text(100, y_position, "aggregatedFindings:", width - 200)
        y_position = draw_wrapped_text(120, y_position, f"  totalMhs: {estimate.aggregatedFindings.totalMhs}", width - 200)
        y_position = draw_wrapped_text(120, y_position, f"  totalPartsCost: {estimate.aggregatedFindings.totalPartsCost}", width - 200)

        y_position = draw_wrapped_text(100, y_position, f"createdBy: {estimate.createdBy}", width - 200)
        y_position = draw_wrapped_text(100, y_position, f"createdAt: '{estimate.createdAt.strftime('%Y-%m-%dT%H:%M:%SZ')}'", width - 200)
        y_position = draw_wrapped_text(100, y_position, f"lastUpdated: '{estimate.lastUpdated.strftime('%Y-%m-%dT%H:%M:%SZ')}'", width - 200)
        y_position = draw_wrapped_text(100, y_position, f"updatedBy: {estimate.updatedBy}", width - 200)

        p.showPage()
        p.save()
        buffer.seek(0)

        logger.info("Creating PDF response")
        response = StreamingResponse(buffer, media_type="application/pdf")
        response.headers["Content-Disposition"] = f"attachment; filename={estimate_id}.pdf"
        return response
    
    async def upload_estimate(self, estimate_request: EstimateRequest, file: UploadFile = File(...)) -> Dict[str, Any]:
        try:
            logger.info(f"estimate_request: {estimate_request}")
            
            json_data = await self.process_file(file)
            logger.info("json data came")
            taskUniqHash = generate_sha256_hash_from_json(json_data).upper()
            logger.info(f"Hash of Estima: {taskUniqHash}")

            current_time = json_data.get("createdAt", datetime.utcnow().replace(tzinfo=timezone.utc))
        
            formatted_date = current_time.strftime("%d%m%Y")
            # remove spaces
            type_of_check_no_spaces = estimate_request.typeOfCheckID.replace(" ", "")
            logger.info(f"type of check is : {type_of_check_no_spaces}")

            operator_no_spaces=estimate_request.operator.replace(" ","")
            logger.info(f"operator without spaces:{operator_no_spaces}")
            base_est_id = f"{estimate_request.aircraftRegNo}-{type_of_check_no_spaces}-{operator_no_spaces}-{formatted_date}".upper()
            logger.info(f"base_est_id: {base_est_id}")
            latest_version = 0
            version_regex_pattern = f"^{re.escape(base_est_id)}-V(\\d+)$"
            
            # Query for existing estimates with the same aircraft registration and base ID pattern
            existing_estimates = self.estima_collection.find({
                # "aircraftRegNo": estimate_request.aircraftRegNo,
                "estID": {"$regex": version_regex_pattern}
            })
            latest_doc = list(existing_estimates.sort("estID", -1).limit(1))
            logger.info("Latest document found sucessfully")

            if latest_doc:
                version_match = re.search(version_regex_pattern, latest_doc[0]["estID"])
                if version_match:
                    latest_version = int(version_match.group(1))
                    logger.info(f"Latest version found: {latest_version}")
            else:
                logger.info("No existing estimates found, starting with version 0.")

            new_version = latest_version + 1                             
            est_id = f"{base_est_id}-V{new_version:02d}"
            logger.info(f"estID is : {est_id}")

            normalized_operator = estimate_request.operator.replace(" ", "").upper()

            existing_operator = self.operators_master_collection.find_one({
                "$expr": {
                    "$eq": [
                        {"$toUpper": {"$replaceAll": {"input": "$operator", "find": " ", "replacement": ""}}},
                        normalized_operator
                    ]
                }
            })
            logger.info(f"Existing operator found: {existing_operator}")
            if not existing_operator:
                self.operators_master_collection.insert_one({"operator": estimate_request.operator.upper()})
                logger.info(f"Inserted new operator '{estimate_request.operator}' into operators_master")
            else:
                logger.info(f"Operator '{estimate_request.operator}' already exists in operators_master")

            
            data_to_insert = {
                **json_data,
                "estHashID":taskUniqHash,
                "estID":est_id,
                # "tasks": estimate_request.tasks,
                "probability": estimate_request.probability,
                "operator": estimate_request.operator,
                "operatorForModel": estimate_request.operatorForModel,
                "aircraftAgeThreshold": estimate_request.aircraftAgeThreshold,
                "typeOfCheck": estimate_request.typeOfCheck,
                "typeOfCheckID": estimate_request.typeOfCheckID,
                "aircraftAge": estimate_request.aircraftAge,
                "aircraftRegNo":estimate_request.aircraftRegNo,
                "aircraftModel": estimate_request.aircraftModel,
                "aircraftFlightHours": estimate_request.aircraftFlightHours,
                "aircraftFlightCycles": estimate_request.aircraftFlightCycles,
                "areaOfOperations": estimate_request.areaOfOperations,
                "considerDeltaUnAvTasks": estimate_request.considerDeltaUnAvTasks,
                "cappingDetails": estimate_request.cappingDetails.dict() if estimate_request.cappingDetails else None,
                "additionalTasks": [task.dict() for task in estimate_request.additionalTasks],
                "miscLaborTasks": [task.dict() for task in estimate_request.miscLaborTasks]          
                
            }
            
        
            insert_result = self.estima_collection.insert_one(data_to_insert) 
            logger.info("Length of document inserted")
  
           
                        
            response = {
                "estHashID":taskUniqHash,
                "status": "Initiated",
                "statusMPD":"Initiated",
                "statusFindings":"Initiated",
                "estID": est_id,
                "msg": "File and estimated data inserted successfully",
                "timestamp": datetime.utcnow().replace(tzinfo=timezone.utc).isoformat(),
            }
            
            return response
        except Exception as e:
            logger.error(f"Error uploading estimate: {str(e)}")
            return None
    
    
    async def estimate_status(self) -> List[EstimateStatusResponse]:
        """
        Get all estimate status documents from the estimates_file_upload collection
        """
        logger.info("Fetching all estimates")
        configurations = self.configurations_collection.find_one()
        man_hours_threshold = configurations.get('thresholds', {}).get('manHoursThreshold', 0)
        five_days_ago = datetime.utcnow() - timedelta(days=5)
        pipeline=[
             {
        '$match': {
            'createdAt': {
                '$gte': five_days_ago
            }
        }
    },
    {
        '$lookup': {
            'from': 'estima_output', 
            'let': {
                'estId': '$estID'
            }, 
            'pipeline': [
                {
                    '$match': {
                        '$expr': {
                            '$eq': [
                                '$estID', '$$estId'
                            ]
                        }
                    }
                }, {
                    '$project': {
                        '_id': 0, 
                        'aggregatedTasks': 1, 
                        'aggregatedFindings': 1
                    }
                }
            ], 
            'as': 'estimate'
        }
    }, {
        '$unwind': {
            'path': '$estimate', 
            'preserveNullAndEmptyArrays': True
        }
    }, {
        '$lookup': {
            'from': 'estimate_status_remarks', 
            'localField': 'estID', 
            'foreignField': 'estID', 
            'as': 'remarks_doc'
        }
    }, {
        '$unwind': {
            'path': '$remarks_doc', 
            'preserveNullAndEmptyArrays': True
        }
    }, {
        '$addFields': {
            'totalMhs': {
                '$add': [
                    {
                        '$ifNull': [
                            '$estimate.aggregatedTasks.totalMhs', 0
                        ]
                    }, {
                        '$ifNull': [
                            '$estimate.aggregatedFindings.totalMhs', 0
                        ]
                    }
                ]
            }, 
            'totalPartsCost': {
                '$add': [
                    {
                        '$ifNull': [
                            '$estimate.aggregatedTasks.totalPartsCost', 0
                        ]
                    }, {
                        '$ifNull': [
                            '$estimate.aggregatedFindings.totalPartsCost', 0
                        ]
                    }
                ]
            }, 
           
            'remarks': {
                '$ifNull': [
                    '$remarks_doc.remarks', ''
                ]
            }
        }
    }, {
        '$project': {
            '_id': 0, 
            'estID': 1, 
            # 'tasks': '$task', 
            # 'descriptions': '$description', 
            'aircraftRegNo': '$aircraftRegNo',
            'error':  '$error',           
            'status': '$status', 
            'totalMhs': 1, 
            'totalPartsCost': 1, 
            'createdAt': '$createdAt', 
            'remarks': 1
        }
    }
]
        
        results = list(self.estima_collection.aggregate(pipeline))
        for result in results:
          
            existing_remarks = self.remarks_collection.find_one({"estID": result["estID"]})
            
            # If it doesn't exist, create one with empty remarks
   
            if not existing_remarks:
                self.remarks_collection.insert_one({
                    "estID": result["estID"],
                    "remarks": [{
                        "remark": "",
                        "updatedAt": datetime.utcnow(),
                        "updatedBy": "",
                        "createdAt": datetime.utcnow(),
                        "active": True
                    }],
                    
                })
        

        response = [EstimateStatusResponse(**result) for result in results]

        return response
   
    async def update_estimate_status_remarks(self, estID: str, remark: str,current_user:dict=Depends(get_current_user)) -> Dict[str, Any]:
        """
        Update remarks for a specific estimate
        
        Args:
            estID: The ID of the estimate to update
            remarks: The new remarks text
            
        Returns:
            Dictionary with update status and information
        """
        logger.info(f"Updating remarks for estimate ID: {estID}")
        
        existing_record = self.remarks_collection.find_one({"estID": estID})
        
        if not existing_record:
            logger.error(f"Estimate with ID {estID} not found in remarks collection")
            raise HTTPException(status_code=404, detail=f"Estimate with ID {estID} not found")
        
        current_time = datetime.utcnow()
        if existing_record['remarks'] and existing_record['remarks'][0]['remark'] == "":
        # Update the first remark directly
            update_result = self.remarks_collection.update_one(
                {"estID": estID, "remarks.remark": ""},
                {"$set": {
                    "remarks.$.remark": remark,
                    "remarks.$.updatedAt": current_time,
                    "remarks.$.updatedBy": current_user["username"],
                    "remarks.$.createdAt": current_time,
                    "remarks.$.active": True
                }}
            )
        else:
            new_remark = {
            "remark": remark,
            "updatedAt": current_time,
            "updatedBy":current_user["username"],
            "createdAt":current_time,
            "active": True
            }
            update_result = self.remarks_collection.update_one(
            {"estID": estID},
            {"$push": {
                "remarks": new_remark
            }}
    )
    
        if update_result.modified_count > 0:
            logger.info(f"Remarks updated successfully for estimate ID: {estID}")
            return {
                "success": True,
                "message": "Remarks updated successfully",
                "estID": estID,
                "newRemark": new_remark if 'new_remark' in locals() else None,
                "updatedAt": current_time 
        }
            
        else:
            logger.error(f"Failed to update remarks for estimate ID: {estID}")
            raise HTTPException(status_code=500, detail="Failed to update remarks")
    
        
    async def get_upload_estimate_byId(self,estimate_id:str)->Dict[str,Any]:
        
        try:
            file_upload_pipeline=[
    {
        '$match': {
            'estID': estimate_id
        }
    }, {
        '$project': {
            '_id': 0, 
            'estID': 1, 
            'task': 1, 
            'description': 1, 
            # 'upload_timestamp': 1, 
            # 'createdAt': 1, 
            # 'original_filename': 1, 
            'probability': 1, 
            'status': 1, 
            'operator': 1, 
            'typeOfCheck': 1, 
            'typeOfCheckID': 1, 
            'aircraftAge': 1, 
            'aircraftRegNo': 1, 
            'aircraftModel': 1,
            'operatorForModel':1,
            'aircraftAgeThreshold':1, 
            'aircraftFlightHours': 1, 
            'aircraftFlightCycles': 1, 
            'areaOfOperations': 1, 
            'cappingDetails': 1, 
            'additionalTasks': 1, 
            'considerDeltaUnAvTasks': 1,
            'miscLaborTasks': 1
        }
    }
]
            result = list(self.estima_collection.aggregate(file_upload_pipeline))
            if not result:
                logger.warning(f"No estimate found with ID: {estimate_id}")
                raise HTTPException(status_code=404, detail="Estimate not found")
            file_upload_result = result[0] if result else {}
            logger.info(f"file_upload result fetched: {file_upload_result}")
            return file_upload_result
        except Exception as e:
            logger.error(f"Error fetching estimate {estimate_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"error fetching estimate id {estimate_id}: {str(e)}")

    async def historical_estimate_status(self, status: str=None, estID:str=None,aircraftRegNo:str=None,date:datetime=None,page: int = 1, page_size: int = 5) -> dict:
        logger.info(f"Fetching estimates (Page: {page}, Page Size: {page_size})")
        logger.info(f"Status: {status}, estID: {estID}, aircraftRegNo: {aircraftRegNo}, date: {date}")
        
        skip = (page - 1) * page_size
        match_stage = {}
        if status is not None:
            match_stage['status'] = status
        if estID is not None:
            normestID = estID.upper().strip()
            # Use regex for partial matching - case insensitive
            match_stage['estID'] = {
                '$regex': f'.*{re.escape(normestID)}.*',
                '$options': 'i'  # case insensitive
            }
       
        if date is not None:
            date_only = date.date()  # Extract date: 2025-04-07
            start_of_day = datetime.combine(date_only, datetime.min.time())  # 2025-04-07 00:00:00
            end_of_day = datetime.combine(date_only, datetime.max.time())    # 2025-04-07 23:59:59.999999
            
            match_stage['createdAt'] = {
                '$gte': start_of_day,
                '$lte': end_of_day
            }
            
        pipeline = []
        if match_stage:
            pipeline.append({'$match': match_stage})
        
        if aircraftRegNo is not None:
            norm_aircraftRegNo = aircraftRegNo.replace(" ", "").replace("-", "").upper()
            pipeline.append({
            '$match': {
                '$expr': {
                    '$regexMatch': {
                        'input': {
                            '$toUpper': {
                                '$replaceAll': {
                                    'input': {
                                        '$replaceAll': {
                                            'input': '$aircraftRegNo',
                                            'find': ' ',
                                            'replacement': ''
                                        }
                                    },
                                    'find': '-',
                                    'replacement': ''
                                }
                            }
                        },
                        'regex': f'.*{re.escape(norm_aircraftRegNo)}.*',
                        'options': 'i'
                    }
                }
            }
        })
        pipeline.extend([
   
    {
        '$lookup': {
            'from': 'estima_output', 
            'let': {
                'estId': '$estID'
            }, 
            'pipeline': [
                {
                    '$match': {
                        '$expr': {
                            '$eq': [
                                '$estID', '$$estId'
                            ]
                        }
                    }
                }, {
                    '$project': {
                        '_id': 0, 
                        'aggregatedTasks': 1, 
                        'aggregatedFindings': 1
                    }
                }
            ], 
            'as': 'estimate'
        }
    }, {
        '$unwind': {
            'path': '$estimate', 
            'preserveNullAndEmptyArrays': True
        }
    }, 
     {
        '$sort': {
            'createdAt': -1
        }
    }, {
        '$lookup': {
            'from': 'estimate_status_remarks', 
            'localField': 'estID', 
            'foreignField': 'estID', 
            'as': 'remarks_doc'
        }
    }, {
        '$unwind': {
            'path': '$remarks_doc', 
            'preserveNullAndEmptyArrays': True
        }
    }, {
        '$addFields': {
            'totalMhs': {
                '$add': [
                    {
                        '$ifNull': [
                            '$estimate.aggregatedTasks.totalMhs', 0
                        ]
                    }, {
                        '$ifNull': [
                            '$estimate.aggregatedFindings.totalMhs', 0
                        ]
                    }
                ]
            }, 
            'totalPartsCost': {
                '$add': [
                    {
                        '$ifNull': [
                            '$estimate.aggregatedTasks.totalPartsCost', 0
                        ]
                    }, {
                        '$ifNull': [
                            '$estimate.aggregatedFindings.totalPartsCost', 0
                        ]
                    }
                ]
            }, 
            # 'tatTime': {
            #     '$divide': [
            #         {
            #             '$add': [
            #                 {
            #                     '$ifNull': [
            #                         '$estimate.aggregatedTasks.totalMhs', 0
            #                     ]
            #                 }, {
            #                     '$ifNull': [
            #                         '$estimate.aggregatedFindings.totalMhs', 0
            #                     ]
            #                 }
            #             ]
            #         }, man_hours_threshold
            #     ]
            # }, 
            'remarks': {
                '$ifNull': [
                    '$remarks_doc.remarks', ''
                ]
            }
        }
    }, {
        '$project': {
            '_id': 0, 
            'estID': 1, 
            # 'tasks': '$task', 
            # 'descriptions': '$description', 
            'aircraftRegNo': '$aircraftRegNo',
            'error':'$error',          
            'status': '$status', 
            'totalMhs': 1, 
            'totalPartsCost': 1, 
            'createdAt': '$createdAt', 
            'remarks': 1
        }
    },
     {
                '$facet': {
                    'data': [
                        { '$skip': skip },
                        { '$limit': page_size }
                    ],
                    'totalCount': [
                        { '$count': 'total' }
                    ]
                }
            } 

])
        
       
        
        facet_results = list(self.estima_collection.aggregate(pipeline))
        results = facet_results[0]['data'] if facet_results else []
        total_count = facet_results[0]['totalCount'][0]['total'] if facet_results and facet_results[0]['totalCount'] else 0
        
        logger.info(f"Total documents matching filters: {total_count}")
        logger.info(f"Number of estimates Fetched for current page: {len(results)}")
        
       
        for result in results:
          
            existing_remarks = self.remarks_collection.find_one({"estID": result["estID"]})
            
            # If it doesn't exist, create one with empty remarks
   
            if not existing_remarks:
                self.remarks_collection.insert_one({
                    "estID": result["estID"],
                    "remarks": [{
                        "remark": "",
                        "updatedAt": datetime.utcnow(),
                        "updatedBy": "",
                        "createdAt": datetime.utcnow(),
                        "active": True
                    }],
                    
                })
        

        response = [EstimateStatusResponse(**result) for result in results]
        

        return {
            "data": response,
            "count": total_count,
        }
        # return response
    
    async def get_estimate_aggregates(self, startDate: datetime, endDate: datetime,current_user) -> Dict:
        logger.info(f"startDate and endDate are: {startDate}, {endDate}")
        """
        Get estimate aggregates for a specific within a date range.
        """
        try:
            estimate_pipeline = [
                {
                    '$project': {
                        'estID': 1, 
                        'createdAt': 1, 
                        'aggregatedFindings': 1, 
                        'aggregatedTasks': 1, 
                        'capping_values': 1, 
                        'cappingDetails': 1, 
                    }
                }, 
                {
                    '$lookup': {
                        'from': 'estimate_file_upload', 
                        'let': {
                            'est_id': '$estID'
                        }, 
                        'pipeline': [
                            {
                                '$match': {
                                    '$expr': {
                                        '$eq': ['$estID', '$$est_id']
                                    }
                                }
                            }, 
                            {
                                '$project': {
                                    '_id': 0, 
                                    'estID': 1, 
                                    'aircraftRegNo': 1, 
                                    'operator': 1, 
                                    'typeOfCheck': 1, 
                                    'probability': 1, 
                                    'typeOfCheckID': 1,
                                    'task': 1,
                                    'description': 1,
                                    'additionalTasks': 1,
                                    "considerDeltaUnAvTasks": 1,
                                    "operatorForModel": 1,
                                    'aircraftageThreshold': 1,
                                    'aircraftModel': 1,
                                    'aircraftAge': 1
                                }
                            }
                        ], 
                        'as': 'estima'
                    }
                }, 
                {
                    '$unwind': {
                        'path': '$estima', 
                        'preserveNullAndEmptyArrays': True
                    }
                }, 
                {
                    '$match': {
                        '$expr': {
                            '$and': [
                                {
                                    '$gte': ['$createdAt', startDate]
                                }, 
                                {
                                    '$lte': ['$createdAt', endDate]
                                }, 
                                {
                                    '$eq': ['$estID', '$estima.estID']
                                }
                            ]
                        }
                    }
                }, 
                {
                    '$project': {
                        'estID': 1, 
                        '_id': 0,
                        'tasks': {'$ifNull': ['$estima.task', []]},
                        'aircraftModel': {'$ifNull': ['$estima.aircraftModel', '']},
                        'aircraftAge': {'$ifNull': ['$estima.aircraftAge', 0]},
                        'descriptions': {'$ifNull': ['$estima.description', []]},
                        'additionalTasks': {'$ifNull': ['$estima.additionalTasks', []]},
                        'considerDeltaUnAvTasks': {'$ifNull': ['$estima.considerDeltaUnAvTasks', False]},
                        'operatorForModel': {'$ifNull': ['$estima.operatorForModel', '']},
                        'aircraftageThreshold': {'$ifNull': ['$estima.aircraftageThreshold', 3]},
                        'unbillableManhrs': '$capping_values.unbillableManhrs', 
                        'unbillableSpareCost': '$capping_values.unbillableSpareCost',
                        'cappingTypeManhrs': '$cappingDetails.cappingTypeManhrs', 
                        'cappingTypeSpareCost': '$cappingDetails.cappingTypeSpareCost',
                        'cappingManhrs': '$cappingDetails.cappingManhrs', 
                        'cappingSpareCost': '$cappingDetails.cappingSpareCost', 
                        'totalManhrs': '$aggregatedTasks.totalMhs', 
                        'preloadcost': '$aggregatedTasks.totalPartsCost', 
                        'findingsManhrs': '$aggregatedFindings.totalMhs', 
                        'findingsSpareCost': '$aggregatedFindings.totalPartsCost', 
                        'createdAt': 1, 
                        'probability': {'$ifNull': ['$estima.probability', 0.0]}, 
                        'operator': {'$ifNull': ['$estima.operator', '']},            
                        'typeOfCheck': {'$ifNull': ['$estima.typeOfCheck', []]}, 
                        'aircraftRegNo': {'$ifNull': ['$estima.aircraftRegNo', '']}
                    }
                }
            ]
            
            results = list(self.estimate_output.aggregate(estimate_pipeline))
            
            for result in results:
                # Create ValidRequest objects for task validation
                # Convert result dict to Pydantic model instance
                print("est_id is:", result.get("estID"))
                mpd_request = ValidRequest(
                    tasks=result.get('tasks', []), 
                    description=result.get('descriptions', [])
                )
                print("created mpd_request")
                sys.stdout.flush()

                # Handle additional tasks safely
                additional_tasks = result.get("additionalTasks", [])
                add_tasks_request = ValidRequest(
                    tasks=[
                        add.get("taskID", "") 
                        for add in additional_tasks 
                        if isinstance(add, dict) and add.get("taskID") is not None
                    ],
                    description=[
                        add.get("taskDescription", "") 
                        for add in additional_tasks 
                        if isinstance(add, dict) and add.get("taskDescription") is not None
                    ]
                )
                print("created add_request")
                sys.stdout.flush()
                # Validate tasks using the corrected method call
                validate_tasks_data = await self.task_service.validate_tasks(mpd_request,current_user)
                print("mpd tasks data is validated")
                sys.stdout.flush()  # Ensure the output is flushed immediately
                if add_tasks_request.tasks or add_tasks_request.description:
                    add_validate_tasks_data = await self.task_service.validate_tasks(add_tasks_request,current_user)
                
                # Convert to DataFrame-like structure for processing
                # Ensure both DataFrames have the same structure before concatenating
                validate_df = pd.DataFrame(validate_tasks_data) if validate_tasks_data else pd.DataFrame()
                add_validate_df = pd.DataFrame(add_validate_tasks_data) if add_validate_tasks_data else pd.DataFrame()

                # Combine
                if not validate_df.empty and not add_validate_df.empty:
                    validate_tasks_df = pd.concat([validate_df, add_validate_df], ignore_index=True)
                elif not validate_df.empty:
                    validate_tasks_df = validate_df
                elif not add_validate_df.empty:
                    validate_tasks_df = add_validate_df
                else:
                    validate_tasks_df = pd.DataFrame()
                # Remove duplicates if DataFrame is not empty
                if not validate_tasks_df.empty:
                    validate_tasks_df = validate_tasks_df.drop_duplicates(subset=['taskid'], keep='first')
                    unavailable_tasks = validate_tasks_df[validate_tasks_df["status"] == False]['taskid']
                    available_tasks = validate_tasks_df[validate_tasks_df["status"] == True]['taskid']
                    available_tasks_length = len(set(available_tasks))
                    unavailable_tasks_length = len(set(unavailable_tasks))
                else:
                    available_tasks_length = 0
                    unavailable_tasks_length = 0
                
                result['available_tasks_before_filter'] = available_tasks_length-1
                result['unavailable_tasks_before_filter'] = unavailable_tasks_length-1
                result["task_matching_percentage_before_filter"] = round(
                    (available_tasks_length / (available_tasks_length + unavailable_tasks_length)) * 100, 4
                ) if (available_tasks_length + unavailable_tasks_length) > 0 else 0
                print("validate tasks data is validated")
                sys.stdout.flush()  # Ensure the output is flushed immediately
                print("creating model tasks request")
                sys.stdout.flush()  # Ensure the output is flushed immediately
                # Create ModelTasksRequest object for model validation
                mpd_tasks_request = ValidRequest(
                    tasks=result.get("tasks", []),
                    description=result.get("descriptions", [])
                )
                
                add_tasks_request = ValidRequest(
                    tasks=[add.get("taskID", "") for add in additional_tasks if isinstance(add, dict) and add.get("taskID")],
                    description=[add.get("taskDescription", "") for add in additional_tasks if isinstance(add, dict) and add.get("taskDescription")]
                )
                
                model_tasks_request = ModelTasksRequest(
                    MPD_TASKS=mpd_tasks_request,
                    ADD_TASKS=add_tasks_request,
                    aircraft_age=float(result.get("aircraftAge", 0)),
                    aircraft_model=result.get("aircraftModel", ""),
                    customer_name_consideration=result.get("OperatorForModel",False),  # Set based on your business logic
                    check_category=result.get("typeOfCheck", []),
                    customer_name=result.get("operator", ""),
                    age_cap=result.get("aircraftageThreshold", 3)
                )
                print("model tasks request created")
                sys.stdout.flush()  # Ensure the output is flushed immediately
                # Call model tasks validation
                model_validate_tasks_data = await self.task_service.model_tasks_validate(
                    model_tasks_request.MPD_TASKS,
                    model_tasks_request.ADD_TASKS,
                    model_tasks_request.aircraft_age,
                    model_tasks_request.aircraft_model,
                    model_tasks_request.customer_name_consideration,
                    model_tasks_request.check_category,
                    model_tasks_request.customer_name,
                    model_tasks_request.age_cap,
                    current_user
                )
                print("model tasks validated")
                # Safely extract data from model validation response
                filtered_tasks_count = model_validate_tasks_data.get("filtered_tasks_count", {})
                total_count = filtered_tasks_count.get("total_count", 0)
                available_count = filtered_tasks_count.get("available_tasks_count", 0)
                not_available_count = filtered_tasks_count.get("not_available_tasks_count", 0)
                
                result['total_tasks_count'] = total_count
                result['available_tasks_after_filter'] = available_count
                result['unavailable_tasks_after_filter'] = not_available_count
                result['task_matching_percentage_after_filter'] = round(
                    (available_count / total_count) * 100, 4
                ) if total_count > 0 else 0
                
                # Handle delta tasks if considerDeltaUnAvTasks is True
                result['available_tasks_in_other_check_category'] = 0
                if result.get('considerDeltaUnAvTasks', False):
                    not_available_tasks_list = model_validate_tasks_data.get("not_available_tasks_list", [])
                    add_not_available_tasks = model_validate_tasks_data.get("add_not_available_tasks", [])
                    
                    # Filter tasks that are available in other check categories
                    delta_tasks_count = 0
                    for task in not_available_tasks_list:
                        if isinstance(task, dict):
                            check_category = task.get("check_category", ["Not Available"])
                            if isinstance(check_category, list) and len(check_category) > 0 and check_category[0] != "Not Available":
                                delta_tasks_count += 1
                            
                    for task in add_not_available_tasks:
                        if isinstance(task, dict):
                            check_category = task.get("check_category", ["Not Available"])
                            if isinstance(check_category, list) and len(check_category) > 0 and check_category[0] != "Not Available":
                                delta_tasks_count += 1
                                
                    result['available_tasks_in_other_check_category'] = delta_tasks_count

            # Select only the required columns for the final result
            final_results = []
            for result in results:
                final_result = {
                    "estID": result.get("estID"),
                    "aircraftModel": result.get("aircraftModel"),
                    "aircraftAge": result.get("aircraftAge"),
                    "considerDeltaUnAvTasks": result.get("considerDeltaUnAvTasks"),
                    "operatorForModel": result.get("operatorForModel"),
                    "aircraftageThreshold": result.get("aircraftageThreshold"),
                    'cappingTypeManhrs': result.get("cappingTypeManhrs"),
                    'cappingTypeSpareCost': result.get("cappingTypeSpareCost"),
                    "unbillableManhrs": result.get("unbillableManhrs"),
                    "unbillableSpareCost": result.get("unbillableSpareCost"),
                    "cappingManhrs": result.get("cappingManhrs"),
                    "cappingSpareCost": result.get("cappingSpareCost"),
                    "totalManhrs": result.get("totalManhrs"),
                    "preloadcost": result.get("preloadcost"),
                    "findingsManhrs": result.get("findingsManhrs"),
                    "findingsSpareCost": result.get("findingsSpareCost"),
                    "createdAt": result.get("createdAt"),
                    "probability": result.get("probability"),
                    "operator": result.get("operator"),
                    "typeOfCheck": result.get("typeOfCheck"),
                    "aircraftRegNo": result.get("aircraftRegNo"),
                    "available_tasks_before_filter": result.get("available_tasks_before_filter"),
                    "unavailable_tasks_before_filter": result.get("unavailable_tasks_before_filter"),
                    "task_matching_percentage_before_filter": result.get("task_matching_percentage_before_filter"),
                    "total_tasks_count": result.get("total_tasks_count"),
                    "available_tasks_after_filter": result.get("available_tasks_after_filter"),
                    "unavailable_tasks_after_filter": result.get("unavailable_tasks_after_filter"),
                    "task_matching_percentage_after_filter": result.get("task_matching_percentage_after_filter"),
                    "available_tasks_in_other_check_category": result.get("available_tasks_in_other_check_category")
                }
                final_results.append(final_result)
                
            return final_results

        except Exception as e:
            logger.error(f"Error in get_estimate_aggregates: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error retrieving estimate aggregates: {str(e)}"
            )
            
    async def get_download_estimates(self,estimate_id: str,current_user) -> Dict:
        logger.info(f"Fetching download estimates for ID: {estimate_id}")
        """
        Get estimate aggregates for a specific within a date range.
        """
        try:
            estimate_pipeline = [ 
                { '$match': { 'estID': estimate_id } },
                {
                    '$project': {
                        'estID': 1, 
                        'createdAt': 1, 
                        'aggregatedFindings': 1, 
                        'aggregatedTasks': 1, 
                        'capping_values': 1, 
                        'cappingDetails': 1, 
                    }
                }, 
                {
                    '$lookup': {
                        'from': 'estimate_file_upload', 
                        'let': {
                            'est_id': '$estID'
                        }, 
                        'pipeline': [
                            {
                                '$match': {
                                    '$expr': {
                                        '$eq': ['$estID', '$$est_id']
                                    }
                                }
                            }, 
                            {
                                '$project': {
                                    '_id': 0, 
                                    'estID': 1, 
                                    'aircraftRegNo': 1, 
                                    'operator': 1, 
                                    'typeOfCheck': 1, 
                                    'probability': 1, 
                                    'typeOfCheckID': 1,
                                    'task': 1,
                                    'description': 1,
                                    'additionalTasks': 1,
                                    "considerDeltaUnAvTasks": 1,
                                    "operatorForModel": 1,
                                    'aircraftageThreshold': 1,
                                    'aircraftModel': 1,
                                    'aircraftAge': 1
                                }
                            }
                        ], 
                        'as': 'estima'
                    }
                }, 
                {
                    '$unwind': {
                        'path': '$estima', 
                        'preserveNullAndEmptyArrays': True
                    }
                },
                {
                    '$project': {
                        'estID': 1, 
                        '_id': 0,
                        'tasks': {'$ifNull': ['$estima.task', []]},
                        'aircraftModel': {'$ifNull': ['$estima.aircraftModel', '']},
                        'aircraftAge': {'$ifNull': ['$estima.aircraftAge', 0]},
                        'descriptions': {'$ifNull': ['$estima.description', []]},
                        'additionalTasks': {'$ifNull': ['$estima.additionalTasks', []]},
                        'considerDeltaUnAvTasks': {'$ifNull': ['$estima.considerDeltaUnAvTasks', False]},
                        'operatorForModel': {'$ifNull': ['$estima.operatorForModel', '']},
                        'aircraftageThreshold': {'$ifNull': ['$estima.aircraftageThreshold', 3]},
                        'unbillableManhrs': '$capping_values.unbillableManhrs', 
                        'unbillableSpareCost': '$capping_values.unbillableSpareCost',
                        'cappingTypeManhrs': '$cappingDetails.cappingTypeManhrs', 
                        'cappingTypeSpareCost': '$cappingDetails.cappingTypeSpareCost',
                        'cappingManhrs': '$cappingDetails.cappingManhrs', 
                        'cappingSpareCost': '$cappingDetails.cappingSpareCost', 
                        'totalManhrs': '$aggregatedTasks.totalMhs', 
                        'preloadcost': '$aggregatedTasks.totalPartsCost', 
                        'findingsManhrs': '$aggregatedFindings.totalMhs', 
                        'findingsSpareCost': '$aggregatedFindings.totalPartsCost', 
                        'createdAt': 1, 
                        'probability': {'$ifNull': ['$estima.probability', 0.0]}, 
                        'operator': {'$ifNull': ['$estima.operator', '']},            
                        'typeOfCheck': {'$ifNull': ['$estima.typeOfCheck', []]}, 
                        'aircraftRegNo': {'$ifNull': ['$estima.aircraftRegNo', '']}
                    }
                }
            ]
            
            result = self.estimate_output.aggregate(estimate_pipeline)
            result=next(result,None)
            
            if not result:
                logger.warning(f"No estimate found with ID: {estimate_id}")
                raise HTTPException(
                    status_code=404,
                    detail=f"No estimate found for ID: {estimate_id}"
                    )
                # Create ValidRequest objects for task validation
                # Convert result dict to Pydantic model instance
                # print("est_id is:", result.get("estID"))
            mpd_request = ValidRequest(
                tasks=result.get('tasks', []), 
                description=result.get('descriptions', [])
            )
            print("created mpd_request")
            sys.stdout.flush()

            # Handle additional tasks safely
            additional_tasks = result.get("additionalTasks", [])
            add_tasks_request = ValidRequest(
                tasks=[
                    add.get("taskID", "") 
                    for add in additional_tasks 
                    if isinstance(add, dict) and add.get("taskID") is not None
                ],
                description=[
                    add.get("taskDescription", "") 
                    for add in additional_tasks 
                    if isinstance(add, dict) and add.get("taskDescription") is not None
                ]
            )
            print("created add_request")
            sys.stdout.flush()
            # Validate tasks using the corrected method call
            validate_tasks_data = await self.task_service.validate_tasks(mpd_request,current_user)
            print("mpd tasks data is validated")
            sys.stdout.flush()  # Ensure the output is flushed immediately
            if add_tasks_request.tasks or add_tasks_request.description:
                add_validate_tasks_data = await self.task_service.validate_tasks(add_tasks_request,current_user)
            
            # Convert to DataFrame-like structure for processing
            # Ensure both DataFrames have the same structure before concatenating
            validate_df = pd.DataFrame(validate_tasks_data) if validate_tasks_data else pd.DataFrame()
            add_validate_df = pd.DataFrame(add_validate_tasks_data) if add_validate_tasks_data else pd.DataFrame()

            # Combine
            if not validate_df.empty and not add_validate_df.empty:
                validate_tasks_df = pd.concat([validate_df, add_validate_df], ignore_index=True)
            elif not validate_df.empty:
                validate_tasks_df = validate_df
            elif not add_validate_df.empty:
                validate_tasks_df = add_validate_df
            else:
                validate_tasks_df = pd.DataFrame()
            # Remove duplicates if DataFrame is not empty
            if not validate_tasks_df.empty:
                validate_tasks_df = validate_tasks_df.drop_duplicates(subset=['taskid'], keep='first')
                unavailable_tasks = validate_tasks_df[validate_tasks_df["status"] == False]['taskid']
                available_tasks = validate_tasks_df[validate_tasks_df["status"] == True]['taskid']
                available_tasks_length = len(set(available_tasks))
                unavailable_tasks_length = len(set(unavailable_tasks))
            else:
                available_tasks_length = 0
                unavailable_tasks_length = 0
            
            result['available_tasks_before_filter'] = available_tasks_length-1
            result['unavailable_tasks_before_filter'] = unavailable_tasks_length-1
            result["task_matching_percentage_before_filter"] = round(
                (available_tasks_length / (available_tasks_length + unavailable_tasks_length)) * 100, 4
            ) if (available_tasks_length + unavailable_tasks_length) > 0 else 0
            print("validate tasks data is validated")
            sys.stdout.flush()  # Ensure the output is flushed immediately
            print("creating model tasks request")
            sys.stdout.flush()  # Ensure the output is flushed immediately
            # Create ModelTasksRequest object for model validation
            mpd_tasks_request = ValidRequest(
                tasks=result.get("tasks", []),
                description=result.get("descriptions", [])
            )
            
            add_tasks_request = ValidRequest(
                tasks=[add.get("taskID", "") for add in additional_tasks if isinstance(add, dict) and add.get("taskID")],
                description=[add.get("taskDescription", "") for add in additional_tasks if isinstance(add, dict) and add.get("taskDescription")]
            )
            
            model_tasks_request = ModelTasksRequest(
                MPD_TASKS=mpd_tasks_request,
                ADD_TASKS=add_tasks_request,
                aircraft_age=float(result.get("aircraftAge", 0)),
                aircraft_model=result.get("aircraftModel", ""),
                customer_name_consideration=result.get("OperatorForModel",False),  # Set based on your business logic
                check_category=result.get("typeOfCheck", []),
                customer_name=result.get("operator", ""),
                age_cap=result.get("aircraftageThreshold", 3)
            )
            print("model tasks request created")
            sys.stdout.flush()  # Ensure the output is flushed immediately
            # Call model tasks validation
            model_validate_tasks_data = await self.task_service.model_tasks_validate(
                model_tasks_request.MPD_TASKS,
                model_tasks_request.ADD_TASKS,
                model_tasks_request.aircraft_age,
                model_tasks_request.aircraft_model,
                model_tasks_request.customer_name_consideration,
                model_tasks_request.check_category,
                model_tasks_request.customer_name,
                model_tasks_request.age_cap,
                current_user
            )
            print("model tasks validated")
            # Safely extract data from model validation response
            filtered_tasks_count = model_validate_tasks_data.get("filtered_tasks_count", {})
            total_count = filtered_tasks_count.get("total_count", 0)
            available_count = filtered_tasks_count.get("available_tasks_count", 0)
            not_available_count = filtered_tasks_count.get("not_available_tasks_count", 0)
            
            result['total_tasks_count'] = total_count
            result['available_tasks_after_filter'] = available_count
            result['unavailable_tasks_after_filter'] = not_available_count
            result['task_matching_percentage_after_filter'] = round(
                (available_count / total_count) * 100, 4
            ) if total_count > 0 else 0
            
            # Handle delta tasks if considerDeltaUnAvTasks is True
            result['available_tasks_in_other_check_category'] = 0
            if result.get('considerDeltaUnAvTasks', False):
                not_available_tasks_list = model_validate_tasks_data.get("not_available_tasks_list", [])
                add_not_available_tasks = model_validate_tasks_data.get("add_not_available_tasks", [])
                
                # Filter tasks that are available in other check categories
                delta_tasks_count = 0
                for task in not_available_tasks_list:
                    if isinstance(task, dict):
                        check_category = task.get("check_category", ["Not Available"])
                        if isinstance(check_category, list) and len(check_category) > 0 and check_category[0] != "Not Available":
                            delta_tasks_count += 1
                        
                for task in add_not_available_tasks:
                    if isinstance(task, dict):
                        check_category = task.get("check_category", ["Not Available"])
                        if isinstance(check_category, list) and len(check_category) > 0 and check_category[0] != "Not Available":
                            delta_tasks_count += 1
                            
                result['available_tasks_in_other_check_category'] = delta_tasks_count

        # Select only the required columns for the final result
        
            final_result = {
                "estID": result.get("estID"),
                "aircraftModel": result.get("aircraftModel"),
                "aircraftAge": result.get("aircraftAge"),
                "considerDeltaUnAvTasks": result.get("considerDeltaUnAvTasks"),
                "operatorForModel": result.get("operatorForModel"),
                "aircraftageThreshold": result.get("aircraftageThreshold"),
                'cappingTypeManhrs': result.get("cappingTypeManhrs"),
                'cappingTypeSpareCost': result.get("cappingTypeSpareCost"),
                "unbillableManhrs": result.get("unbillableManhrs"),
                "unbillableSpareCost": result.get("unbillableSpareCost"),
                "cappingManhrs": result.get("cappingManhrs"),
                "cappingSpareCost": result.get("cappingSpareCost"),
                "totalManhrs": result.get("totalManhrs"),
                "preloadcost": result.get("preloadcost"),
                "findingsManhrs": result.get("findingsManhrs"),
                "findingsSpareCost": result.get("findingsSpareCost"),
                "createdAt": result.get("createdAt"),
                "probability": result.get("probability"),
                "operator": result.get("operator"),
                "typeOfCheck": result.get("typeOfCheck"),
                "aircraftRegNo": result.get("aircraftRegNo"),
                "available_tasks_before_filter": result.get("available_tasks_before_filter"),
                "unavailable_tasks_before_filter": result.get("unavailable_tasks_before_filter"),
                "task_matching_percentage_before_filter": result.get("task_matching_percentage_before_filter"),
                "total_tasks_count": result.get("total_tasks_count"),
                "available_tasks_after_filter": result.get("available_tasks_after_filter"),
                "unavailable_tasks_after_filter": result.get("unavailable_tasks_after_filter"),
                "task_matching_percentage_after_filter": result.get("task_matching_percentage_after_filter"),
                "available_tasks_in_other_check_category": result.get("available_tasks_in_other_check_category")
            }
           
            
            return final_result

        except Exception as e:
            logger.error(f"Error in get_estimate_aggregates: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error retrieving estimate aggregates: {str(e)}"
            )
    
    def get_best_match(self, target, candidates):
        """
        Find the best matching string from a list of candidates using SequenceMatcher.
        
        Args:
            target (str): The expected column name.
            candidates (list): List of candidate strings.
        
        Returns:
            tuple: (best match string, similarity score) or (None, 0) if no match found.
        """
        best_match = None
        best_score = 0

        for candidate in candidates:
            score = SequenceMatcher(None, target.lower(), candidate.lower()).ratio() * 100  # Convert to percentage
            if score > best_score:
                best_match = candidate
                best_score = score

        return (best_match, best_score) if best_score > 70 else (None, 0)  # Threshold set at 70%

    def detect_header_row(self, df, expected_columns, max_rows_to_check=6):
        """
        Dynamically detect which row contains the header by checking for matches with expected columns.
        
        Args:
            df (pd.DataFrame): DataFrame with potential header rows.
            expected_columns (list): List of expected column names.
            max_rows_to_check (int): Maximum number of rows to check for headers.
        
        Returns:
            int or None: Best header row index or None if not found.
        """
        best_match_score = 50
        best_row_index = None

        # Check each of the first few rows
        for i in range(min(max_rows_to_check, len(df))):
            row_values = df.iloc[i].astype(str).fillna('').tolist()  # Convert row to list of strings

            # Skip rows with too many missing values
            if sum(pd.isna(df.iloc[i])) > len(row_values) / 2:
                continue

            # Calculate match score for this row
            row_score = 0
            for expected_col in expected_columns:
                best_match = self.get_best_match(expected_col, row_values)  # Find best match
                row_score += best_match[1]  # Add similarity score

            # If this row has better matches than previous best, update best row
            if row_score > best_match_score:
                best_match_score = row_score
                best_row_index = i
        logger.info(f"row score is {row_score}")

        return best_row_index

    def predict_column_mappings(self, df, expected_mappings):
        """
        Dynamically predict column mappings using fuzzy matching.
        
        Args:
            df: DataFrame with the original column names
            expected_mappings: Dictionary of expected column names to their standardized names
        
        Returns:
            Dictionary mapping actual column names to standardized names
        """
        # Get all column names from the DataFrame
        actual_columns = list(df.columns)
        
        # Create a mapping for each expected column
        dynamic_mappings = {}
        
        for expected_col, standardized_name in expected_mappings.items():
            # Find the best match among actual columns
            best_match = process.extractOne(expected_col, actual_columns)
            
            if best_match and best_match[1] > 70:  # Match score above 70%
                dynamic_mappings[best_match[0]] = standardized_name
                logger.info(f"Mapped '{best_match[0]}' to '{standardized_name}' with score {best_match[1]}")
            else:
                logger.warning(f"Could not find a good match for '{expected_col}'")
        
        return dynamic_mappings
        
    def read_excel_with_multiple_sheetnames(self, content, filename, file_extension, sheet_names, config):
            """
            Read a specific sheet from an Excel file with enhanced error handling.

            Args:
                content (bytes): File content.
                filename (str): Name of the file.
                file_extension (str): File extension.
                sheet_names (List[str]): List of sheet names to look for.
                config (dict): Configuration dictionary.

            Returns:
                pd.DataFrame: DataFrame containing the sheet data.
                
            Raises:
                FileProcessingError: When sheet names are not found or other processing errors occur.
            """
            try:
                pd.set_option('display.encoding', 'utf-8')
                logger.info(f"Reading Excel file with sheet names: {sheet_names}")
                
                # Choose appropriate engine based on file extension
                if file_extension.startswith('.'):
                    extension = file_extension
                else:
                    extension = f".{file_extension}"
                    
                excel_file = pd.ExcelFile(io.BytesIO(content))
                available_sheets = excel_file.sheet_names
                
                # Convert sheet_names to lowercase for case-insensitive comparison
                sheet_names_lower = [name.lower() for name in sheet_names]
                valid_sheets = [sheet for sheet in available_sheets 
                            if sheet.lower() in sheet_names_lower]
                
                # If no valid sheets found, raise error with details
                if not valid_sheets:
                    missing_sheets = ", ".join(sheet_names)
                    available = ", ".join(available_sheets)

                    self.error_detail += (
                        f", The following required sheet names were not found in {filename}: "
                        f"{missing_sheets}. Available sheets are: {available}"
                    )

                    error_details = {
                        "filename": filename,
                        "required_sheet_names": sheet_names,
                        "found_sheet_names": available_sheets,
                        "error_type": "sheet_not_found"
                    }
                    raise FileProcessingError(
                        f"Required sheet names not found in {filename}", 
                        error_details
                    )
                
                sheet_name = valid_sheets[0]
                    
                if extension in [".xlsx", ".xlsm"]:
                    engine = "openpyxl"
                elif extension == ".xlsb":
                    engine = "pyxlsb"
                elif extension == ".xls":
                    engine = "xlrd"
                else:
                    self.error_detail += (
                        f", Unsupported file extension {extension} for {filename}. "
                        "Supported extensions are: .xlsx, .xlsm, .xlsb, .xls"
                    )
                    raise ValueError(f"Unsupported file extension: {extension}")
                
                try:
                    # Read the specific sheet
                    df = pd.read_excel(
                        io.BytesIO(content), 
                        sheet_name=sheet_name,
                        engine=engine
                    )
                    
                except UnicodeEncodeError:
                    # Force UTF-8 encoding for stdout
                    if sys.stdout.encoding != 'utf-8':
                        sys.stdout.reconfigure(encoding='utf-8')
                    
                    df = pd.read_excel(
                        io.BytesIO(content), 
                        sheet_name=sheet_name,
                        engine=engine
                    )
                    logger.info(f"The dataframe columns of {filename} are successfully loaded (column names contain special characters)")
                
                # Process based on sheet name type
                if sheet_name.lower().startswith(("pricing", "sheet1", "price", "page")):
                    return self._process_pricing_sheet(df, filename, config)
                elif sheet_name.lower().startswith('mlttable'):
                    return self._process_mlttable_sheet(df, filename, config)
                elif sheet_name.lower().startswith('mltaskmlsec1'):
                    return self._process_mltaskmlsec1_sheet(df, filename, config)
                elif sheet_name.lower().startswith('mldpmlsec1'):
                    return self._process_mldpmlsec1_sheet(df, filename, config)
                else:
                    df.columns = df.iloc[0].astype(str).str.replace(".", "", regex=False)
                    df = df[1:].reset_index(drop=True)
                
                logger.info(f"Successfully read sheet {sheet_name}")
                logger.info(f"DataFrame headers: {list(df.columns)}")
                logger.info(f"DataFrame shape: {df.shape}")
                
                return df
            
            except FileProcessingError:
                # Re-raise FileProcessingError as-is
                raise
            except ValueError as sheet_error:
                error_details = {
                    "filename": filename,
                    "required_sheet_names": sheet_names,
                    "found_sheet_names": available_sheets if 'available_sheets' in locals() else [],
                    "error_type": "sheet_processing_error",
                    "original_error": str(sheet_error)
                }
                raise FileProcessingError(f"Sheet processing error in {filename}: {str(sheet_error)}", error_details)
            except Exception as error:
                error_details = {
                    "filename": filename,
                    "error_type": "general_error",
                    "original_error": str(error)
                }
                raise FileProcessingError(f"Error reading Excel file {filename}: {str(error)}", error_details)
    
    async def validate_tasks_by_estid(self, estimate_id, current_user: dict = Depends(get_current_user)) -> List[ValidTasks]:
        """
        Validate tasks by checking if they exist in the task_description collection.
        For tasks not found (status=False), fill the description from the input description[] by index.
        Only unique cleaned taskids will be returned.
        """
        try:
            estimate=await self.get_upload_estimate_byId(estimate_id=estimate_id)
            task_ids = estimate["task"]
            input_descriptions = estimate["description"]

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
  
    
    def _process_pricing_sheet(self, df, filename, config):
        """Helper method to process pricing sheets"""
        sub_task_parts_columns = config["sub_task_parts_columns"]
        sub_task_parts_column_mappings = config["sub_task_parts_column_mappings"]

        # Alternative mappings
        alternative_mappings = {
            "Issued Part#": "issued_part_number",
            "Package#": "package_number",
            "Task#": "task_number",
            "SOI_TRANNO": "soi_transaction"
        }

        # Merge mappings
        combined_mappings = {**sub_task_parts_column_mappings, **alternative_mappings}
        #logger.info(f"Combined mappings: {combined_mappings}")
        # Detect the header row
        header_row_index=None
        if len(set(sub_task_parts_columns)-set(df.columns)) > 4:
            header_row_index = self.detect_header_row(df, list(combined_mappings.keys()))
        
        if header_row_index is not None:
            df.columns = df.iloc[header_row_index].astype(str).str.strip()

            print("df.columns:", df.columns)

            logger.info(f"Detected header row at index {header_row_index} , columns: {df.columns}")

            # Extract data rows (everything after the header)
            df = df.iloc[header_row_index + 1:].reset_index(drop=True)
        else:
            # If no header row is detected, use the first row as header and log a warning
            df.columns = df.columns.map(str).str.strip()
            df = df.reset_index(drop=True)
            #df.columns = df.iloc[0].astype(str).str.strip()
            #df = df[1:].reset_index(drop=True)
            logger.info(f"Could not detect header row in {filename}")
            logger.info(f"Could not detect header row in {filename}. Using first row as header.")
            
        logger.info(f"the shape of the DataFrame before processing {df.shape}")
        logger.info(f"The dataframe columns of {filename} are {df.columns}")
        # Rename columns using mappings
        df.rename(columns={k: v for k, v in combined_mappings.items() if k in df.columns}, inplace=True)

        expected_output_columns = list(sub_task_parts_column_mappings.values())
        mapped_columns = set(df.columns)
        truly_missing = set(expected_output_columns) - mapped_columns
        
        if len(truly_missing) > 4:
            return pd.DataFrame()

        if truly_missing:
            warning_msg = f"⚠️ Warning: Missing columns in {filename} that couldn't be mapped: {truly_missing}"
      
            logger.warning(warning_msg)

        # Remove duplicate columns
        df = df.loc[:, ~df.columns.duplicated()].copy()

        # Ensure all expected columns exist
        for col in expected_output_columns:
            if col not in df.columns:
                df[col] = "None"

        # Reorder columns to match expected order
        df = df[expected_output_columns]
        logger.info(f"shape of MCP df {df.shape}")
        return df
    
    def _process_mlttable_sheet(self, df, filename, config):
        """Helper method to process mlttable sheets"""


        logger.info(f"the shape of the DataFrame before processing {df.shape}")
        task_parts_columns_mappings = config["task_parts_columns_mappings"]
        task_parts_columns = config["task_parts_columns"]
        #logger.info(f"task_parts_columns_mappings :{task_parts_columns_mappings}")
        
        header_row_index=None
        if len(set(task_parts_columns)-set(df.columns)) > 4:
            header_row_index = self.detect_header_row(df, list(task_parts_columns_mappings.keys()))
        if header_row_index is not None:
            df.columns = df.iloc[header_row_index].astype(str).str.strip()

            print("df.columns:", df.columns)

            logger.info(f"Detected header row at index {header_row_index} , columns: {df.columns}")

            # Extract data rows (everything after the header)
            df = df.iloc[header_row_index + 1:].reset_index(drop=True)
        else:
            # If no header row is detected, use the first row as header and log a warning
            df.columns = df.columns.map(str).str.strip()
            df = df.reset_index(drop=True)
            #df.columns = df.iloc[0].astype(str).str.strip()
            #df = df[1:].reset_index(drop=True)
            logger.info(f"Could not detect header row in {filename}")
            logger.info(f"Could not detect header row in {filename}. Using first row as header.")
        logger.info(f"The dataframe columns of {filename} are {df.columns}")
        df = df.loc[:, ~df.columns.duplicated()].copy()
        # Check for missing and extra columns
        missing_cols = set(task_parts_columns) - set(df.columns)
        extra_cols = set(df.columns) - set(task_parts_columns)
        
        if missing_cols:

            logger.warning(f"⚠️ Warning: Missing columns in {filename}: {missing_cols}")
        if extra_cols:

            logger.warning(f"⚠️ Warning: Extra columns in {filename}: {extra_cols}")

        # First rename the columns that exist
        df.rename(columns={k: v for k, v in task_parts_columns_mappings.items() if k in df.columns}, inplace=True)

        # Now add any missing columns (using the final mapped column names)
        expected_columns = list(task_parts_columns_mappings.values())
        missing_columns = [col for col in expected_columns if col not in df.columns]
        
        if missing_columns:
            logger.info(f"Missing columns: {missing_columns}")

        # Add missing columns with None values
        for col in missing_columns:
            df[col] = None

        # Reorder columns according to the mapped values
        df = df[expected_columns]
        logger.info(f"shape of mlttable df {df.shape}")
        
        return df
    
    def _process_mltaskmlsec1_sheet(self, df, filename, config):
        """Helper method to process mltaskmlsec1 sheets"""
        

        logger.info(f"the shape of the DataFrame before processing {df.shape}")
        
        task_description_columns = config["task_description_columns"]
        task_description_columns_mappings = config["task_description_columns_mappings"]
        header_row_index=None
        if len(set(task_description_columns)-set(df.columns)) > 4:
            header_row_index = self.detect_header_row(df, list(task_description_columns_mappings.keys()))
        if header_row_index is not None:
            df.columns = df.iloc[header_row_index].astype(str).str.strip()

            print("df.columns:", df.columns)

            logger.info(f"Detected header row at index {header_row_index} , columns: {df.columns}")

            # Extract data rows (everything after the header)
            df = df.iloc[header_row_index + 1:].reset_index(drop=True)
        else:
            # If no header row is detected, use the first row as header and log a warning
            df.columns = df.columns.map(str).str.strip()
            df = df.reset_index(drop=True)
            #df.columns = df.iloc[0].astype(str).str.strip()
            #df = df[1:].reset_index(drop=True)
            
            logger.info(f"Could not detect header row in {filename}")
            logger.info(f"Could not detect header row in {filename}. Using first row as header.")
        df = df.loc[:, ~df.columns.duplicated()].copy()
        logger.info(f"The dataframe columns of {filename} are {df.columns}")
        #logger.info(f"task_description_columns_mappings :{task_description_columns_mappings}")
        missing_cols = set(task_description_columns) - set(df.columns)
        extra_cols = set(df.columns) - set(task_description_columns)
        
        if missing_cols:

            logger.warning(f"⚠️ Warning: Missing columns in {filename}: {missing_cols}")
        if extra_cols:

            logger.warning(f"⚠️ Warning: Extra columns in {filename}: {extra_cols}")

        df.rename(columns={k: v for k, v in task_description_columns_mappings.items() if k in df.columns}, inplace=True)

        # Now add any missing columns (using the final mapped column names)
        expected_columns = list(task_description_columns_mappings.values())
        missing_columns = [col for col in expected_columns if col not in df.columns]
        
        if missing_columns:
            logger.info(f"Missing columns: {missing_columns}")

        # Add missing columns with None values
        for col in missing_columns:
            df[col] = None

        # Finally, reorder columns to match expected order
        df = df[expected_columns]
        
        logger.info(f"shape of mltaskmlsec1 df {df.shape}")
        
        return df
    
    def _process_mldpmlsec1_sheet(self, df, filename, config):
        """Helper method to process mldpmlsec1 sheets"""
        # Ensure first row is used as column names safely

        

        logger.info(f"the shape of the DataFrame before processing {df.shape}")

        sub_task_description_columns = config["sub_task_description_columns"]
        sub_task_description_columns_mappings = config["sub_task_description_columns_mappings"]
        header_row_index=None
        if len(set(sub_task_description_columns)-set(df.columns)) > 4:
            header_row_index = self.detect_header_row(df, list(sub_task_description_columns_mappings.keys()))
        
        if header_row_index is not None:
            df.columns = df.iloc[header_row_index].astype(str).str.strip()

            print("df.columns:", df.columns)

            logger.info(f"Detected header row at index {header_row_index} , columns: {df.columns}")

            # Extract data rows (everything after the header)
            df = df.iloc[header_row_index + 1:].reset_index(drop=True)
        else:
            # If no header row is detected, use the first row as header and log a warning
            
            df.columns = df.columns.map(str).str.strip()
            df = df.reset_index(drop=True)

            logger.info(f"Could not detect header row in {filename}")
            logger.info(f"Could not detect header row in {filename}. Using first row as header.")
        #logger.info(f"sub_task_description_columns_mappings :{sub_task_description_columns_mappings}")
        df = df.loc[:, ~df.columns.duplicated()].copy()
        logger.info(f"The dataframe columns of {filename} are {df.columns}")
        # Check for missing and extra columns
        missing_cols = set(sub_task_description_columns) - set(df.columns)
        extra_cols = set(df.columns) - set(sub_task_description_columns)
        
        if missing_cols:
            warning_msg = f"⚠️ Warning: Missing columns in {filename}: {missing_cols}"

            logger.warning(warning_msg)
        
        if extra_cols:
            warning_msg = f"⚠️ Warning: Extra columns in {filename}: {extra_cols}"

            logger.warning(warning_msg)

        # Rename columns safely
        df.rename(columns={k: v for k, v in sub_task_description_columns_mappings.items() if k in df.columns}, inplace=True)

        # Add any missing columns (based on mapped names)
        expected_columns = list(sub_task_description_columns_mappings.values())
        missing_columns = [col for col in expected_columns if col not in df.columns]

        # Print missing columns for debugging
        if missing_columns:
            logger.info(f"Missing columns: {missing_columns}")

        # Add missing columns with None values
        for col in missing_columns:
            df[col] = None

        # Ensure required columns exist before proceeding
        required_columns = ["log_item_number", "source_task_discrepancy_number"]
        for col in required_columns:
            if col not in df.columns:
                #print(f"⚠️ Warning: Required column '{col}' is missing in {filename}. Skipping task_findings processing.")
                logger.warning(f"⚠️ Warning: Required column '{col}' is missing in {filename}. Skipping task_findings processing.")
                return pd.DataFrame()  # Return empty DataFrame if required columns are missing

        # Initialize the new column
        df["source_task_discrepancy_number_updated"] = ""

        # Create task_findings_dict
        findings = df["log_item_number"].tolist()
        tasks = df["source_task_discrepancy_number"].tolist()
        task_findings_dict = dict(zip(findings, tasks))

        # Resolve task references safely (avoid infinite loops)
        max_iterations = 10  # Safety limit
        for finding in findings:
            iteration = 0
            current = finding
            
            while iteration < max_iterations:
                if current not in task_findings_dict or task_findings_dict[current] == current:
                    break  # Stop if there's no further reference or self-referencing
                next_value = task_findings_dict[current]
                if next_value == finding:  # Circular reference detected
                    break
                current = next_value
                iteration += 1
            
            # Update with the resolved reference
            task_findings_dict[finding] = current

        # Assign resolved values back to DataFrame
        df["source_task_discrepancy_number_updated"] = df["log_item_number"].map(task_findings_dict)

        # Ensure correct column order
        df = df[expected_columns]
        logger.info(f"shape of mldpmlsec1 df {df.shape}")
        
        return df

    async def process_multiple_files(self, file: UploadFile, config, SheetNames: List[str]) -> pd.DataFrame:
        """
        Read and process multiple uploaded Excel or CSV files with enhanced error handling.

        Args:
            file (UploadFile): Uploaded file to process.
            config (Dict): Configuration settings.
            SheetNames (List[str]): Names of the sheets to read from Excel files.

        Returns:
            pd.DataFrame: Processed records from matching file
            
        Raises:
            FileProcessingError: When file processing fails
        """
        logger.info(f"Processing the file {file.filename}")
        logger.info(f"Looking for sheet names: {SheetNames}")

        try:
            # Read the file content
            content = await file.read()
            file_extension = os.path.splitext(file.filename)[1].lower()
            if not file_extension:
                file_extension = f".{file.filename.split('.')[-1].lower()}"
                
            logger.info(f"Processing file: {file.filename}, Extension: {file_extension}")
            
            # Handle Excel files
            if file_extension in ['.xlsx', '.xlsm', '.xlsb', '.xls']:
                try:
                    # Attempt to read the specified sheet
                    df = self.read_excel_with_multiple_sheetnames(
                        content, file.filename, file_extension, SheetNames, config
                    )
                    if df is not None and not df.empty:
                        logger.info(f"Successfully processed file: {file.filename}")
                        logger.info(f"DataFrame columns: {df.columns}")
                        logger.info(f"DataFrame shape: {df.shape}")
                        return df
                    else:
                        error_details = {
                            "filename": file.filename,
                            "required_sheet_names": SheetNames,
                            "error_type": "empty_dataframe"
                        }
                        raise FileProcessingError(
                            f"No data found in sheets {SheetNames} for file {file.filename}",
                            error_details
                        )
                
                except FileProcessingError:
                    # Re-raise FileProcessingError as-is
                    raise
                except Exception as excel_error:
                    error_details = {
                        "filename": file.filename,
                        "error_type": "excel_processing_error",
                        "original_error": str(excel_error)
                    }
                    raise FileProcessingError(
                        f"Error processing Excel file {file.filename}: {str(excel_error)}",
                        error_details
                    )
            else:
                self.error_detail+=f", The following {file.filename} has unsupported file extension : {file_extension} and the supported file extensions are: .xlsx, .xlsm, .xlsb, .xls"
                
                error_details = {
                    "filename": file.filename,
                    "file_extension": file_extension,
                    "error_type": "unsupported_file_type"
                }
                raise FileProcessingError(
                    f"Unsupported file type: {file_extension} for file {file.filename}",
                    error_details
                )
        
        except FileProcessingError:
            # Re-raise FileProcessingError as-is
            raise
        except Exception as file_error:
            error_details = {
                "filename": file.filename,
                "error_type": "general_file_error",
                "original_error": str(file_error)
            }
            raise FileProcessingError(
                f"Error processing file {file.filename}: {str(file_error)}",
                error_details
            )
        finally:
            # Reset file pointer to beginning for potential reuse
            await file.seek(0)
    def validate_filename_keywords(self, filename: str) -> Optional[str]:
        """
        Validate if filename contains required keywords.
        
        Args:
            filename (str): Name of the file to validate
            
        Returns:
            Optional[str]: Expected file type if valid, None otherwise
        """
        filename_lower = filename.lower()
        
        if "mltaskmlsec1" in filename_lower:
            return "mltaskmlsec1"
        elif "mldpmlsec1" in filename_lower:
            return "mldpmlsec1"
        elif "material" in filename_lower:
            return "material"
        elif "mlttable" in filename_lower:
            return "mlttable"
        else:
            return None
    
    async def compare_estimates(self, estimate_id: str, files: List[UploadFile]) -> Dict[str, Any]:
            """
            Compare estimates for multiple uploaded files with comprehensive error handling
            
            Args:
                estimate_id (str): Estimate ID to compare
                files (List[UploadFile]): List of uploaded files to process
            
            Returns:
                Dict[str, Any]: Comparison results or error details
            """
            logger.info(f"Comparing estimates for estimate ID: {estimate_id}")
            self.error_detail=str("Following error occured while processing the compare estimate")
            
            # Initialize DataFrames
            task_description = pd.DataFrame()
            sub_task_description = pd.DataFrame()
            sub_task_parts = pd.DataFrame()
            task_parts = pd.DataFrame()
            
            # Track processing errors
            processing_errors = []
            filename_errors = []
            
            # Load configuration
            config_file_path = os.path.join("app", "config", "config.yaml")
            try:
                with open(config_file_path, 'r') as file:
                    config = yaml.safe_load(file)
                logger.info("Config file data fetched successfully")
            except Exception as e:
                logger.error(f"Error loading config file: {str(e)}")
                raise HTTPException(status_code=500, detail="Error loading configuration")

            # Required file types and their corresponding sheet names
            required_files = {
                "mltaskmlsec1": ["mltaskmlsec1"],
                "mldpmlsec1": ["mldpmlsec1"], 
                "material": ["pricing", "Pricing", "sheet1", "price", "page"],
                "mlttable": ["mlttable"]
            }
            
            found_files = {key: False for key in required_files.keys()}

            try:
                for file in files:
                    # Validate filename keywords
                    file_type = self.validate_filename_keywords(file.filename)
                    
                    if not file_type:
                        self.error_detail += f", The file '{file.filename}' does not contain the required keywords: {list(required_files.keys())} in its name."

                
                        filename_errors.append({
                            "filename": file.filename,
                            "error": "Filename does not contain required keywords",
                            "required_keywords": list(required_files.keys()),
                            "error_type": "invalid_filename"
                        })
                        continue
                    
                    found_files[file_type] = True
                    
                    try:
                        if file_type == "mltaskmlsec1":
                            task_description = await self.process_multiple_files(
                                file, config, required_files["mltaskmlsec1"]
                            )
                            logger.info(f"Shape of task_description: {task_description.shape}")
                            
                        elif file_type == "mldpmlsec1":
                            sub_task_description = await self.process_multiple_files(
                                file, config, required_files["mldpmlsec1"]
                            )
                            logger.info(f"Shape of sub_task_description: {sub_task_description.shape}")
                        
                        elif file_type == "material":
                            sub_task_parts = await self.process_multiple_files(
                                file, config, required_files["material"]
                            )
                            logger.info(f"Shape of sub_task_parts: {sub_task_parts.shape}")
                            
                        elif file_type == "mlttable":
                            task_parts = await self.process_multiple_files(
                                file, config, required_files["mlttable"]
                            )
                            logger.info(f"Shape of task_parts: {task_parts.shape}")

                    except FileProcessingError as fpe:
                        processing_errors.append({
                            "filename": file.filename,
                            "error": fpe.message,
                            "details": fpe.details,
                            "error_type": "file_processing_error"
                        })
                        logger.error(f"File processing error for {file.filename}: {fpe.message}")
                        continue

                # Check for missing required files
                missing_files = [file_type for file_type, found in found_files.items() if not found]
                if missing_files:
                    filename_errors.extend([{
                        "error": f"Required file type '{file_type}' not found",
                        "required_keywords": [file_type],
                        "error_type": "missing_required_file"
                    } for file_type in missing_files])
                    
                """
                # If there are any errors, return them to the frontend
                if processing_errors or filename_errors:
                    return {
                        "success": False,
                        "error_summary": "File processing errors occurred",
                        "filename_errors": filename_errors,
                        "processing_errors": processing_errors,
                        "total_errors": len(filename_errors) + len(processing_errors)
                    }
                """
                # Verify all required data is available
                if sub_task_parts.empty:
                    error_msg = ", expected columns in Material consumpation pricing file are not found or empty."
                    logger.error(error_msg)
                    self.error_detail += f", {error_msg}"
                    raise ValueError
                elif sub_task_description.empty:
                    error_msg = ", expected columns in mldpmlsec1 are not found or empty."
                    logger.error(error_msg)
                    self.error_detail += f", {error_msg}"
                    raise ValueError
                     
                elif task_description.empty:
                    error_msg = ", expected columns in mltaskmlsec1 are not found or empty."
                    logger.error(error_msg)
                    self.error_detail += f", {error_msg}"
                    raise ValueError
                
                    """
                    return {
                        "success": False,
                        "error_summary": error_msg,
                        "missing_data": {
                            "sub_task_parts_empty": sub_task_parts.empty,
                            "sub_task_description_empty": sub_task_description.empty,
                            "task_description_empty": task_description.empty,
                            "task_parts_empty": task_parts.empty
                        }
                    }"""

                # Process and compare data
                compare_result = self.testing(task_description, sub_task_parts, sub_task_description, task_parts, estimate_id)
                logger.info("Compare result successfully fetched")

                return  compare_result

            except ValueError as ve:
                logger.error(f"ValueError in compare_estimates: {str(ve)}")
                raise HTTPException(
                    status_code=400,
                    detail=self.error_detail + f" {str(ve)}"
                )
            
            except Exception as e:
                logger.error(f"Unexpected error in compare_estimates: {str(e)}")
                raise HTTPException(
                status_code=500,
                detail="Unexpected error occurred while performing comparing estimates"
            ) 

        
    def parts_combine(self,sub_task_parts,task_parts):
        parts_master = list(self.parts_master_collection.find({},))
        parts_master= pd.DataFrame(parts_master)
        parts_master = parts_master.drop(columns=["_id"], errors="ignore")
        parts_master=parts_master.drop_duplicates()
        task_parts.dropna(subset=["task_number","issued_part_number","part_description","used_quantity","issued_stock_status"],inplace=True)
        task_parts_up=task_parts[task_parts["issued_stock_status"]!="Owned"]
        task_parts_up=task_parts[task_parts["part_type"]!="Component"]
        task_parts_up = task_parts_up[task_parts_up["issued_part_number"].isin(parts_master["issued_part_number"])]

        # Rename column "unit_of_measurement" to "issued_unit_of_measurement"
        task_parts_up = task_parts_up.rename(columns={"unit_of_measurement": "issued_unit_of_measurement"})
        # Get column names as lists
        sub_task_parts_columns = sub_task_parts.columns.tolist()
        task_parts_up_columns = task_parts_up.columns.tolist()

        # Find common and missing columns
        common_columns = list(set(sub_task_parts_columns) & set(task_parts_up_columns))  # Intersection
        missing_columns = list(set(sub_task_parts_columns) - set(task_parts_up_columns))  # Difference

        # Keep only common columns
        task_parts_up = task_parts_up[common_columns]

        # Add missing columns and fill them with NaN (equivalent to `missing` in Julia)
        for col in missing_columns:
            task_parts_up[col] = np.nan  # Use None instead if dealing with strings

        # Ensure column order matches `sub_task_parts`
        task_parts_up = task_parts_up[sub_task_parts_columns]

        for i, row in task_parts_up.iterrows():
            # Find matching part in parts_master
            matching_parts = parts_master[parts_master["issued_part_number"] == row["issued_part_number"]]
            
            if not matching_parts.empty:
                task_parts_up.at[i, "billable_value_usd"] = row["used_quantity"] * matching_parts.iloc[0]["agg_base_price_usd"]+matching_parts.iloc[0]["agg_freight_cost"]+matching_parts.iloc[0]["agg_admin_charges"]
            
        sub_task_parts = pd.concat([sub_task_parts, task_parts_up], ignore_index=True)
        # Convert to string
        string_cols = [
            'registration_number', 'package_number', 'task_number',
            'task_description', 'issued_part_number', 'part_description',
            'issued_unit_of_measurement', 'stock_status', 'base_currency',
            'soi_transaction'
        ]



        # Apply conversions
        for col in string_cols:
            sub_task_parts[col] = sub_task_parts[col].astype(str)
            
        cols_to_convert = ['base_price_usd', 'freight_cost', 'admin_charges', 'total_billable_price', 'billable_value_usd', 'used_quantity']

        for col in cols_to_convert:
            sub_task_parts[col] = pd.to_numeric(sub_task_parts[col], errors='coerce')
            
            
        return sub_task_parts


    def testing(self,task_description, sub_task_parts, sub_task_description, task_parts,estID):
        
        if task_parts is not None and not task_parts.empty:
            logger.info("task_parts is not empty")
            sub_task_parts = self.parts_combine(sub_task_parts, task_parts)
        else:
            logger.info("task_parts is empty")


        # Fetch predicted data
        pred_data = list(self.estimate_output.find({"estID": estID}))
        est_upload = list(self.estimate_file_upload.find({"estID": estID}, {"task": 1}))
        mpd_tasks = list(est_upload[0].get("task", [])) if est_upload else []
        LhRhTasks = list(self.LhRhTasks_collection.find({},))
        LhRhTasks = pd.DataFrame(LhRhTasks)


        if not pred_data:
            logger.info(f"No EstID Pred Data --> {estID}")
            raise ValueError(f", No prediction data found for given EstID: {estID}")                 
                            


        
        # Process tasks and findings
        pred_tasks_data_full = pd.DataFrame(pred_data[0].get("tasks", []))
        pred_findings_data_full = pd.DataFrame(pred_data[0].get("findings", []))
        
        # Get capping details safely
        cappingDetails = pred_data[0].get("cappingDetails", {})
        if not isinstance(cappingDetails, dict):
            cappingDetails = {}
        
        # Initialize capping_values safely
        capping_values = pred_data[0].get("capping_values", {})
        if not isinstance(capping_values, dict):
            capping_values = {}
        
        # Populate with safe default values and overwrite if details exist
        capping_values = {
            'cappingTypeManhrs': cappingDetails.get("cappingTypeManhrs", capping_values.get("cappingTypeManhrs", "No capping")),
            'cappingManhrs': cappingDetails.get("cappingManhrs", capping_values.get("cappingManhrs", 0.0)),
            'billableManhrs': capping_values.get("billableManhrs", 0.0),
            'unbillableManhrs': capping_values.get("unbillableManhrs", 0.0),
            'cappingTypeSpareCost': cappingDetails.get("cappingTypeSpareCost", capping_values.get("cappingTypeSpareCost", "No capping")),
            'cappingSpareCost': cappingDetails.get("cappingSpareCost", capping_values.get("cappingSpareCost", 0.0)),
            'billableSpareCost': capping_values.get("billableSpareCost", 0.0),
            'unbillableSpareCost': capping_values.get("unbillableSpareCost", 0.0)
        }
        
        # Final assignment
        pred_capping_values = capping_values


        sub_task_description["source_task_discrepancy_number_updated"] = ""

        # Create task_findings_dict
        findings = sub_task_description["log_item_number"].tolist()
        tasks = sub_task_description["source_task_discrepancy_number"].tolist()
        task_findings_dict = dict(zip(findings, tasks))

        # Resolve task references safely (avoid infinite loops)
        max_iterations = 10  # Safety limit
        for finding in findings:
            iteration = 0
            current = finding
            
            while iteration < max_iterations:
                if current not in task_findings_dict or task_findings_dict[current] == current:
                    break  # Stop if there's no further reference or self-referencing
                next_value = task_findings_dict[current]
                if next_value == finding:  # Circular reference detected
                    break
                current = next_value
                iteration += 1
            
            # Update with the resolved reference
            task_findings_dict[finding] = current

        # Assign resolved values back to DataFrame
        sub_task_description["source_task_discrepancy_number_updated"] = sub_task_description["log_item_number"].map(task_findings_dict)

        def updateLhRhTasks(LhRhTasks, MPD_TASKS):
            """
            Update MPD tasks by adding (LH) and (RH) suffixes for tasks marked as LHRH.

            Parameters:
            - LhRhTasks: DataFrame with 'LHRH' and 'TASK_CLEANED' columns
            - MPD_TASKS: List of task numbers (strings or integers)

            Returns:
            - List of task numbers, with '(LH)' and '(RH)' suffixes added for LHRH tasks
            """
            # Get list of task numbers where LHRH is 1
            LhRhTasks_list = LhRhTasks[LhRhTasks["LHRH"] == 1]["TASK_CLEANED"].tolist()
            
            # List to collect updated task entries
            data = []

            for task_number in MPD_TASKS:
                if task_number in LhRhTasks_list:
                    data.append(f"{task_number} (LH)")
                    data.append(f"{task_number} (RH)")
                else:
                    data.append(task_number)

            return data

        # Example usage
        eligible_tasks = updateLhRhTasks(LhRhTasks, mpd_tasks)

  

        # Proceed to calculate actual capping values

        # Calculate actual capping values
        actual_capping_values = actual_cap_calculation(cappingDetails, eligible_tasks, sub_task_description, sub_task_parts)
        
        # Filter task descriptions
        eligible_task_description = task_description[task_description["task_number"].isin(eligible_tasks)]
        
        # ----- PROCESS TASKS DATA (similar to testing function) -----
        final_mpd_data = []
        for task in eligible_tasks:
            mydict = {}
            actual_task_data = task_description[task_description["task_number"] == task]
            actual_parts_data = sub_task_parts[sub_task_parts["task_number"] == task]
            predicted_task_data = pred_tasks_data_full[pred_tasks_data_full["sourceTask"] == task]
            
            if not actual_task_data.empty:
                # Process actual man hours
                actual_manhours = actual_task_data["actual_man_hours"].values[0] if "actual_man_hours" in actual_task_data.columns else 0
                
                # Process actual spares
                actual_spares_cost = 0
                actual_spares_list = []
                
                if not actual_parts_data.empty and 'billable_value_usd' in actual_parts_data.columns:
                    for index, row in actual_parts_data.iterrows():
                        rowdict = row.to_dict()
                        spares_dict = {}
                        spares_dict["partId"] = rowdict.get("issued_part_number", "")
                        spares_dict["price"] = rowdict.get("billable_value_usd", 0)
                        spares_dict["qty"] = rowdict.get("used_quantity", 0)
                        spares_dict["unit"] = rowdict.get("issued_unit_of_measurement", "")
                        actual_spares_cost += rowdict.get("billable_value_usd", 0)
                        actual_spares_list.append(spares_dict)
                
                # Add to dictionary
                mydict["actual_manhours"] = actual_manhours
                mydict["actual_spares_list"] = actual_spares_list
                mydict["actual_spares_cost"] = actual_spares_cost
                mydict["task_number"] = task
                
                # Process predicted data
                mydict["predict_manhours"] = 0
                mydict["predict_spares_cost"] = 0
                mydict["predicted_spares_list"] = []
                
                for index, row in predicted_task_data.iterrows():
                    if "description" in row:
                        mydict["description"] = row["description"]
                    if "mhs" in row and "avg" in row["mhs"]:
                        mydict["predict_manhours"] = row["mhs"]["avg"]
                    if "spare_parts" in row:
                        spare_parts = row["spare_parts"]
                        mydict["predicted_spares_list"] = spare_parts
                        spsum = 0
                        for s in spare_parts:
                            spsum = spsum + s.get("price", 0)
                        mydict["predict_spares_cost"] = spsum
                
                final_mpd_data.append(mydict)
        
        # Calculate summary for tasks
        df_tasks = pd.DataFrame(final_mpd_data)
        total_actual_spares_cost = df_tasks['actual_spares_cost'].sum() if not df_tasks.empty else 0
        total_predict_spares_cost = df_tasks['predict_spares_cost'].sum() if not df_tasks.empty else 0
        total_predict_manhours = df_tasks['predict_manhours'].sum() if not df_tasks.empty else 0
        total_actual_manhours = df_tasks['actual_manhours'].sum() if not df_tasks.empty else 0
        
        summary_tasks_comparision = {
            "total_actual_spares_cost": total_actual_spares_cost,
            "total_predict_spares_cost": total_predict_spares_cost,
            "total_predict_manhours": total_predict_manhours,
            "total_actual_manhours": total_actual_manhours
        }
        
        eligible_tasks_comparision = {
            "eligible_tasks": final_mpd_data,
            "summary_tasks": summary_tasks_comparision
        }
        
        # ----- PROCESS FINDINGS DATA (similar to original findings function but using testing2 logic) -----
        final_findings_data = []
        
        for task in eligible_tasks:
            mydict = {}
            pred_findings_task = pred_findings_data_full[pred_findings_data_full["taskId"] == task]
            sub_task_description_data = sub_task_description[sub_task_description["source_task_discrepancy_number_updated"] == task]
            actual_findings_parts_data = sub_task_parts[
                (sub_task_parts["task_number"].str.startswith("HMV")) & 
                (sub_task_parts["task_number"].isin(sub_task_description_data["log_item_number"].tolist()))
            ]
            
            # Process actual findings manhours
            actual_manhours = 0
            for index, row in sub_task_description_data.iterrows():
                one_finding = row.get("actual_man_hours", 0)
                actual_manhours += one_finding
            
            mydict["actual_findings_manhours"] = actual_manhours
            
            # Process actual findings spares
            actual_spares_cost = 0
            actual_spares_list = []
            
            for index, row in actual_findings_parts_data.iterrows():
                rowdict = row.to_dict()
                spares_dict = {}
                spares_dict["partId"] = rowdict.get("issued_part_number", "")
                spares_dict["price"] = rowdict.get("billable_value_usd", 0)
                spares_dict["qty"] = rowdict.get("used_quantity", 0)
                spares_dict["unit"] = rowdict.get("issued_unit_of_measurement", "")
                actual_spares_cost += rowdict.get("billable_value_usd", 0)
                actual_spares_list.append(spares_dict)
            
            mydict["actual_findings_spares_cost"] = actual_spares_cost
            mydict["actual_findings_spares_list"] = actual_spares_list
            mydict["task_number"] = task
            
            # Process predicted findings
            predicted_finding_spares_cost = 0
            predicted_finding_manhours = 0
            predicted_finding_sparelist = []
            
            for index, row in pred_findings_task.iterrows():
                rowdict = row.to_dict()
                if "details" in rowdict:
                    rowdata = rowdict["details"]
                    for k in rowdata:
                        manhours = 0
                        if 'mhs' in k:
                            manhours = k["mhs"].get("avg", 0) * (k.get("prob", 100) / 100)*(k.get("task_defect_probability", 100) / 100)
                        predicted_finding_manhours += manhours
                        
                        spare_parts = []
                        if "spare_parts" in k:
                            spare_parts = k["spare_parts"]
                        predicted_finding_sparelist += spare_parts
                        
                        spsum = 0
                        for s in spare_parts:
                            spsum += s.get("price", 0) * (s.get("prob", 100) / 100)* (k.get("prob", 100) / 100)*(k.get("task_defect_probability", 100) / 100)
                        predicted_finding_spares_cost += spsum
            
            mydict["predicted_finding_spares_cost"] = predicted_finding_spares_cost
            mydict["predicted_finding_manhours"] = predicted_finding_manhours
            mydict["predicted_finding_sparelist"] = predicted_finding_sparelist
            
            final_findings_data.append(mydict)
        
        # Calculate summary for findings
        df_findings = pd.DataFrame(final_findings_data)
        total_actual_findings_spares_cost = df_findings['actual_findings_spares_cost'].sum() if not df_findings.empty else 0
        total_predicted_finding_spares_cost = df_findings['predicted_finding_spares_cost'].sum() if not df_findings.empty else 0
        total_predicted_finding_manhours = df_findings['predicted_finding_manhours'].sum() if not df_findings.empty else 0
        total_actual_findings_manhours = df_findings['actual_findings_manhours'].sum() if not df_findings.empty else 0
        # Find new findings tasks with proper null handling
        new_findings_tasks = df_findings[
            (df_findings['actual_findings_manhours'].fillna(0) > 0) &
            (df_findings['predicted_finding_manhours'].fillna(0) == 0)
        ]["task_number"].dropna().unique().tolist()

        # Filter new findings data
        new_findings_data = sub_task_description[
            sub_task_description["source_task_discrepancy_number_updated"].isin(new_findings_tasks)
        ]

        total_new_findings_manhours = new_findings_data['actual_man_hours'].sum() if not new_findings_data.empty else 0
        new_findings_parts_data = sub_task_parts[sub_task_parts["task_number"].isin(new_findings_data["log_item_number"].tolist())]
        total_new_findings_spares_cost = new_findings_parts_data["billable_value_usd"].sum() if not new_findings_data.empty else 0
        summary_findings_comparision = {
            "total_actual_spares_cost": total_actual_findings_spares_cost,
            "total_predict_spares_cost": total_predicted_finding_spares_cost,
            "total_predict_manhours": total_predicted_finding_manhours,
            "total_actual_manhours": total_actual_findings_manhours
        }
        new_findings_data_summary={
            "new_findings_data": new_findings_data.to_dict('records') if not new_findings_data.empty else [],
            "new_findings_parts_data": new_findings_parts_data.to_dict('records') if not new_findings_parts_data.empty else [],
            "total_new_findings_manhours": total_new_findings_manhours,
            "total_new_findings_spares_cost": total_new_findings_spares_cost
        }
        
        eligible_findings_comparision = {
            "eligible_tasks": final_findings_data,
            "summary_findings": summary_findings_comparision
        }
        
        


        # Optional: If you want to switch data sources
        # eligible_tasks = pred_tasks_data_full["sourceTask"].astype(str).tolist()
        def lrrh_removal(task_numbers):
            """
            Remove ' (LH)' and ' (RH)' suffixes from task numbers.
            """
            return list({task_number.strip().replace(" (LH)", "").replace(" (RH)", "") for task_number in task_numbers if isinstance(task_number, str)})

        # Remove LH/RH from eligible tasks and task_description
        eligible_tasks_list = lrrh_removal(eligible_tasks)
        actual_tasks_list = lrrh_removal(task_description["task_number"].unique().tolist())

        # Original available tasks (exact match)
        available_tasks = set(eligible_tasks).intersection(
            set(task_description["task_number"].unique().tolist())
        )

        # Cleaned available tasks (after LH/RH removal)
        available_tasks_list = set(mpd_tasks).intersection(
            set(actual_tasks_list)
        )

        # Tasks in eligible list but not found in original task_description
        not_available_tasks = set(eligible_tasks) - available_tasks

        # Task matching percentage — avoid division by zero
        task_matching = len(available_tasks_list) / len(mpd_tasks) if eligible_tasks_list else 0

        # Task availability summary
        task_availability_summary = {
            "available_tasks": list(available_tasks),
            "not_available_tasks": list(not_available_tasks),
            "task_matching_percentage": task_matching * 100,
            "total_eligible_tasks": len(mpd_tasks),
            "total_available_tasks": len(available_tasks_list),
            "total_not_available_tasks":len(mpd_tasks) - len(available_tasks_list)  
        }

        
        # Create the final output structure to match testing function
        finaloutput = {
            "tasks": eligible_tasks_comparision,
            "findings": eligible_findings_comparision,
            # Adding additional aircraft info that was in testing2 but not in testing
            "cappingDetails": {
                "actual_capping": actual_capping_values,
                "predicted_capping": pred_capping_values
            },
            "new_findings_summary":new_findings_data_summary,
            "task_avialability_summary":task_availability_summary
        }
        finaloutput= replace_nan_inf(finaloutput)
        
        return finaloutput
    
def actual_cap_calculation(cappingDetails, eligible_tasks, sub_task_description, sub_task_parts):
    logger.info("Starting actual_cap_calculation")
    logger.info(f"cappingDetails: {cappingDetails}")
    logger.info(f"Number of eligible tasks: {len(eligible_tasks)}")
    
    
    # Ensure cappingDetails is a dictionary
    if not isinstance(cappingDetails, dict) or not cappingDetails:
        logger.info("No capping details found, returning default values")
        return {
            'cappingTypeManhrs': "No capping",
            'cappingManhrs': 0.0,
            'billableManhrs': 0.0,
            'unbillableManhrs': 0.0,
            'cappingTypeSpareCost': "No capping",
            'cappingSpareCost': 0.0,
            'billableSpareCost': 0.0,
            'unbillableSpareCost': 0.0
        }
    
    # Populate capping values from cappingDetails
    capping_values = {
        'cappingTypeManhrs': cappingDetails.get("cappingTypeManhrs", "No capping"),
        'cappingManhrs': cappingDetails.get("cappingManhrs", 0.0),
        'billableManhrs': 0.0,
        'unbillableManhrs': 0.0,
        'cappingTypeSpareCost': cappingDetails.get("cappingTypeSpareCost", "No capping"),
        'cappingSpareCost': cappingDetails.get("cappingSpareCost", 0.0),
        'billableSpareCost': 0.0,
        'unbillableSpareCost': 0.0
    }
    
    logger.info(f"Initial capping_values: {capping_values}")
    
    # Filter sub_task_description to only include eligible tasks
    sub_task_description = sub_task_description[sub_task_description["source_task_discrepancy_number_updated"].isin(eligible_tasks)]
    logger.info(f"Filtered sub_task_description shape: {sub_task_description.shape}")
    
    # Define create_group function correctly (fixed indentation)
    def create_group(df):
        logger.info("Creating groups for tasks")
        # Create a new column 'group' with default values
        df['group'] = range(len(df))
        
        # Track which rows belong to which group
        group_mapping = {}
        
        # First pass: Identify groups based on source task relationships
        for idx, row in df.iterrows():
            if row["source_task_discrepancy_number_updated"] != row["source_task_discrepancy_number"]:
                # This task is related to another task
                source_task = row["source_task_discrepancy_number"]
                
                # Find the rows where log_item_number matches this source_task
                # and assign them the same group
                related_rows = df[df["log_item_number"] == source_task]
                
                if not related_rows.empty:
                    # Use the first related row's group as the group for this row
                    related_group = related_rows.iloc[0]['group']
                    df.at[idx, 'group'] = related_group
                    group_mapping[row['log_item_number']] = related_group
        
        # Second pass: Ensure consistency in group assignments
        for idx, row in df.iterrows():
            log_item = row['log_item_number']
            if log_item in group_mapping:
                df.at[idx, 'group'] = group_mapping[log_item]
        
        logger.info(f"Number of unique groups created: {df['group'].nunique()}")
        return df
    
    # Apply the create_group function
    sub_task_description = create_group(sub_task_description)
    
    # Calculate task level man hours
    logger.info("Calculating task level man hours")
    task_level_mh = sub_task_description.groupby(
        ["source_task_discrepancy_number_updated"]
    ).agg(
        avg_actual_man_hours=("actual_man_hours", "sum"),
        max_actual_man_hours=("actual_man_hours", "sum"),
        min_actual_man_hours=("actual_man_hours", "sum")
    ).reset_index()
    
    logger.info(f"task_level_mh shape: {task_level_mh.shape}")
    
    # Calculate group level man hours
    logger.info("Calculating group level man hours")
    group_level_mh = sub_task_description.groupby(
        ["group"]
    ).agg(
        avg_actual_man_hours=("actual_man_hours", "sum"),
        max_actual_man_hours=("actual_man_hours", "sum"),
        min_actual_man_hours=("actual_man_hours", "sum"),
        skill_number=("skill_number", lambda x: list(set(x)))
    ).reset_index()
    
    logger.info(f"group_level_mh shape: {group_level_mh.shape}")
    
    # Get eligible log items
    eligible_log_items = sub_task_description["log_item_number"].unique().tolist()
    logger.info(f"Number of eligible log items: {len(eligible_log_items)}")
    
    # Filter sub_task_parts to only include eligible log items
    filtered_sub_task_parts = sub_task_parts[sub_task_parts['task_number'].isin(eligible_log_items)]
    logger.info(f"filtered_sub_task_parts shape: {filtered_sub_task_parts.shape}")
    
    # Merge task_level_parts
    logger.info("Merging task level parts")
    task_level_parts = pd.merge(
        filtered_sub_task_parts,
        sub_task_description[["log_item_number", "source_task_discrepancy_number_updated"]],
        left_on="task_number",
        right_on="log_item_number",
        how="left"
    ).drop(columns=["log_item_number"])
    
    # If the merge resulted in an empty DataFrame, create an empty one with required columns
    if task_level_parts.empty:
        logger.info("WARNING: task_level_parts is empty, creating empty DataFrame with required columns")
        task_level_parts = pd.DataFrame(columns=["source_task_discrepancy_number_updated", "issued_part_number", 
                                                "billable_value_usd", "used_quantity", 
                                                "part_description", "issued_unit_of_measurement"])
    
    # Aggregate task level parts
    task_level_parts = task_level_parts.groupby(["source_task_discrepancy_number_updated", "issued_part_number"]).agg(
        billable_value_usd=("billable_value_usd", "sum"),
        used_quantity=("used_quantity", "sum"),
        part_description=('part_description', "first"),
        issued_unit_of_measurement=('issued_unit_of_measurement', "first")
    ).reset_index()
    
    logger.info(f"task_level_parts shape after aggregation: {task_level_parts.shape}")
    
    # Add 'group' column to filtered_sub_task_parts by merging with sub_task_description
    logger.info("Adding group column to filtered_sub_task_parts")
    if 'group' not in filtered_sub_task_parts.columns:
        filtered_sub_task_parts = pd.merge(
            filtered_sub_task_parts,
            sub_task_description[["log_item_number", "group"]],
            left_on="task_number",
            right_on="log_item_number",
            how="left"
        )
    
    # Group parts by group and part number
    group_level_parts = filtered_sub_task_parts.groupby(["group", "issued_part_number"]).agg(
        billable_value_usd=("billable_value_usd", "sum"),
        used_quantity=("used_quantity", "sum"),
        part_description=('part_description', "first"),
        issued_unit_of_measurement=('issued_unit_of_measurement', "first")
    ).reset_index()
    
    logger.info(f"group_level_parts shape: {group_level_parts.shape}")
    
    # Create parts_line_items DataFrame
    parts_line_items = filtered_sub_task_parts.groupby(["issued_part_number"]).agg(
        billable_value_usd=("billable_value_usd", "sum"),
        used_quantity=("used_quantity", "sum"),
        part_description=('part_description', "first"),
        issued_unit_of_measurement=('issued_unit_of_measurement', "first")
    ).reset_index()
    
    logger.info(f"parts_line_items shape: {parts_line_items.shape}")
    
    # Create copies for processing
    task_level_mh_cap = task_level_mh.copy()
    task_level_parts_cap = task_level_parts.copy()
    task_level_line_items_cap=task_level_parts_cap.copy()
    # Aggregate task level parts for capping
    task_level_parts_cap_agg = task_level_parts_cap.groupby(["source_task_discrepancy_number_updated"]).agg(
        billable_value_usd=("billable_value_usd", "sum")
    ).reset_index()
    
    logger.info(f"task_level_parts_cap_agg shape: {task_level_parts_cap_agg.shape}")
    
    # Copy group level data
    group_level_mh_cap = group_level_mh.copy()
    group_level_parts_cap = group_level_parts.copy()
    
    # Add source_task_discrepancy_number_updated column to group_level_parts_cap if it doesn't exist
    if "source_task_discrepancy_number_updated" not in group_level_parts_cap.columns:
        logger.info("WARNING: source_task_discrepancy_number_updated not in group_level_parts_cap columns, adding placeholder")
        # This is a placeholder. In real code, you would need to properly join/map this information.
        group_level_parts_cap["source_task_discrepancy_number_updated"] = "Unknown"
    
    # Aggregate group level parts for capping
    group_level_parts_cap_agg = group_level_parts_cap.groupby(["source_task_discrepancy_number_updated", "group"]).agg(
        billable_value_usd=("billable_value_usd", "sum")
    ).reset_index()
    
    logger.info(f"group_level_parts_cap_agg shape: {group_level_parts_cap_agg.shape}")
    
    # Create a copy of parts_line_items for capping
    parts_line_items_result = parts_line_items.copy()
    
    # Get capping values from details
    mhs_cap_type = cappingDetails.get("cappingTypeManhrs", "No capping")
    mhs_cap_amt = cappingDetails.get("cappingManhrs", 0)
    spares_cap_type = cappingDetails.get("cappingTypeSpareCost", "No capping")
    spares_cap_amt = cappingDetails.get("cappingSpareCost", 0)
    
    logger.info(f"Capping parameters: mhs_cap_type={mhs_cap_type}, mhs_cap_amt={mhs_cap_amt}, spares_cap_type={spares_cap_type}, spares_cap_amt={spares_cap_amt}")
    
    # Define man-hours capping function
    def mhs_cap(mhs_cap_type, mhs_cap_amt):
        logger.info(f"Applying man-hours capping: {mhs_cap_type}, amount: {mhs_cap_amt}")
        if mhs_cap_type == "per_source_card":
            # Calculate intermediate values (before applying probability)
            task_level_mh_cap["unbillable_mh_raw"] = task_level_mh_cap["avg_actual_man_hours"].apply(
                lambda x: min(x, mhs_cap_amt)
            )
            task_level_mh_cap["billable_mh_raw"] = task_level_mh_cap["avg_actual_man_hours"].apply(
                lambda x: max(0, x - mhs_cap_amt)
            )
            task_level_mh_cap["mhs_cap_amt"] = mhs_cap_amt
            
            # Save intermediate results to CSV
            #task_level_mh_cap.to_csv("task_level_mh_cap_intermediate.csv", index=False)
            
            # Apply probability to get final values
            task_level_mh_cap["unbillable_mh"] = task_level_mh_cap["unbillable_mh_raw"] 
            task_level_mh_cap["billable_mh"] = task_level_mh_cap["billable_mh_raw"] 
            
            # Save final results to CSV
            #task_level_mh_cap.to_csv("task_level_mh_cap_final.csv", index=False)
            
            unbillable_sum = task_level_mh_cap["unbillable_mh"].sum()
            billable_sum = task_level_mh_cap["billable_mh"].sum()
            logger.info(f"Per source card MH result: unbillable={unbillable_sum}, billable={billable_sum}")
            return unbillable_sum, billable_sum
        
        elif mhs_cap_type == "per_IRC":
            # Calculate intermediate values (before applying probability)
            group_level_mh_cap["unbillable_mh_raw"] = group_level_mh_cap["avg_actual_man_hours"].apply(
                lambda x: min(x, mhs_cap_amt)
            )
            group_level_mh_cap["billable_mh_raw"] = group_level_mh_cap["avg_actual_man_hours"].apply(
                lambda x: max(0, x - mhs_cap_amt)
            )
            
            group_level_mh_cap["mhs_cap_amt"] = mhs_cap_amt
            # Save intermediate results to CSV
            #group_level_mh_cap.to_csv("group_level_mh_cap_intermediate.csv", index=False)
            
            # Apply probability to get final values
            group_level_mh_cap["unbillable_mh"] = group_level_mh_cap["unbillable_mh_raw"]
            group_level_mh_cap["billable_mh"] = group_level_mh_cap["billable_mh_raw"] 
            
            # Save final results to CSV
            #group_level_mh_cap.to_csv("group_level_mh_cap_final.csv", index=False)
            
            unbillable_sum = group_level_mh_cap["unbillable_mh"].sum()
            billable_sum = group_level_mh_cap["billable_mh"].sum()
            logger.info(f"Per IRC MH result: unbillable={unbillable_sum}, billable={billable_sum}")
            return unbillable_sum, billable_sum
        
        else:  # No capping
            total_sum = task_level_mh_cap["avg_actual_man_hours"].sum() 
            logger.info(f"No capping for MH: unbillable=0, billable={total_sum}")
            return 0, total_sum
    
    # Define spares capping function
    def spares_cap(spares_cap_type, spares_cap_amt):
        logger.info(f"Applying spares capping: {spares_cap_type}, amount: {spares_cap_amt}")
        if spares_cap_type == "per_source_card":
            # Use the aggregated DataFrame for calculations
            task_level_parts_cap = task_level_parts_cap_agg.copy()
            
            # Calculate intermediate values (before applying probability)
            task_level_parts_cap["unbillable_spares_raw"] = task_level_parts_cap["billable_value_usd"].apply(
                lambda x: min(x, spares_cap_amt)
            )
            task_level_parts_cap["billable_spares_raw"] = task_level_parts_cap["billable_value_usd"].apply(
                lambda x: max(0, x - spares_cap_amt)
            )
            task_level_parts_cap["spares_cap_amt"] = spares_cap_amt
            
            # Save intermediate results to CSV
            #task_level_parts_cap.to_csv("task_level_parts_cap_intermediate.csv", index=False)
            
            # Apply probability to get final values
            task_level_parts_cap["unbillable_spares"] = task_level_parts_cap["unbillable_spares_raw"] 
            task_level_parts_cap["billable_spares"] = task_level_parts_cap["billable_spares_raw"]
            # Save final results to CSV
            #task_level_parts_cap.to_csv("task_level_parts_cap_final.csv", index=False)
            
            unbillable_sum = task_level_parts_cap["unbillable_spares"].sum()
            billable_sum = task_level_parts_cap["billable_spares"].sum()
            logger.info(f"Per source card spares result: unbillable={unbillable_sum}, billable={billable_sum}")
            return unbillable_sum, billable_sum
        
        
        elif spares_cap_type == "per_line_item_per_source_card":
            # Calculate intermediate values (before applying probability)
            task_level_line_items_cap["unbillable_spares_raw"] = task_level_line_items_cap["billable_value_usd"].apply(
                lambda x: min(x, spares_cap_amt)
            )
            task_level_line_items_cap["billable_spares_raw"] = task_level_line_items_cap["billable_value_usd"].apply(
                lambda x: max(0, x - spares_cap_amt)
            )
            task_level_line_items_cap["spares_cap_amt"]=spares_cap_amt
            

            # Apply probability to get final values
            task_level_line_items_cap["unbillable_spares"] = task_level_line_items_cap["unbillable_spares_raw"]
            task_level_line_items_cap["billable_spares"] = task_level_line_items_cap["billable_spares_raw"] 
            
            unbillable_sum, billable_sum =task_level_line_items_cap["unbillable_spares"].sum(), task_level_line_items_cap["billable_spares"].sum()
            return unbillable_sum, billable_sum
            
        
            
        elif spares_cap_type == "per_IRC":
            # Use the aggregated DataFrame for calculations
            group_level_parts_cap = group_level_parts_cap_agg.copy()
            
            # Calculate intermediate values (before applying probability)
            group_level_parts_cap["unbillable_spares_raw"] = group_level_parts_cap["billable_value_usd"].apply(
                lambda x: min(x, spares_cap_amt)
            )
            group_level_parts_cap["billable_spares_raw"] = group_level_parts_cap["billable_value_usd"].apply(
                lambda x: max(0, x - spares_cap_amt)
            )
            
            group_level_parts_cap["spares_cap_amt"] = spares_cap_amt
            # Save intermediate results to CSV
            #group_level_parts_cap.to_csv("group_level_parts_cap_intermediate.csv", index=False)
            
            # Apply probability to get final values
            group_level_parts_cap["unbillable_spares"] = group_level_parts_cap["unbillable_spares_raw"] 
            group_level_parts_cap["billable_spares"] = group_level_parts_cap["billable_spares_raw"] 
            
            # Save final results to CSV
            #group_level_parts_cap.to_csv("group_level_parts_cap_final.csv", index=False)
            
            unbillable_sum = group_level_parts_cap["unbillable_spares"].sum()
            billable_sum = group_level_parts_cap["billable_spares"].sum()

            return unbillable_sum, billable_sum
            
        elif spares_cap_type == "per_line_item":
            # Calculate intermediate values (before applying probability)
            parts_line_items_result["unbillable_spares_raw"] = parts_line_items_result["billable_value_usd"].apply(
                lambda x: min(x, spares_cap_amt)
            )
            parts_line_items_result["billable_spares_raw"] = parts_line_items_result["billable_value_usd"].apply(
                lambda x: max(0, x - spares_cap_amt)
            )
            parts_line_items_result["spares_cap_amt"] = spares_cap_amt
            # Save intermediate results to CSV
            #parts_line_items_result.to_csv("line_item_parts_cap_intermediate.csv", index=False)
            
            # Apply probability to get final values
            parts_line_items_result["unbillable_spares"] = parts_line_items_result["unbillable_spares_raw"] 
            parts_line_items_result["billable_spares"] = parts_line_items_result["billable_spares_raw"] 
            
            # Save final results to CSV
            #parts_line_items_result.to_csv("line_item_parts_cap_final.csv", index=False)
            
            unbillable_sum = parts_line_items_result["unbillable_spares"].sum()
            billable_sum = parts_line_items_result["billable_spares"].sum()
            logger.info(f"Per line item spares result: unbillable={unbillable_sum}, billable={billable_sum}")
            return unbillable_sum, billable_sum
        
            
        else:  # No capping
            total_sum = task_level_parts_cap_agg["billable_value_usd"].sum() if not task_level_parts_cap_agg.empty else 0
            logger.info(f"No capping for spares: unbillable=0, billable={total_sum}")
            return 0, total_sum
    
    # Calculate and set man-hours capping values
    logger.info("Calculating man-hours capping values")
    capping_values["unbillableManhrs"], capping_values["billableManhrs"] = mhs_cap(mhs_cap_type, mhs_cap_amt)
    
    # Calculate and set spare costs capping values
    logger.info("Calculating spare costs capping values")
    capping_values['unbillableSpareCost'], capping_values['billableSpareCost'] = spares_cap(spares_cap_type, spares_cap_amt)
    
    logger.info(f"Final capping_values: {capping_values}")
    return capping_values


        



def convert_hash_to_ack_id(hash_hex: str) -> str:
    hash_bytes = bytes.fromhex(hash_hex)
    base64_string = base64.urlsafe_b64encode(hash_bytes).decode('utf-8')
    ack_id = base64_string[:16]  
    return ack_id

def generate_sha256_hash_from_json(json_data: dict) -> str:
    json_string = json.dumps(json_data, sort_keys=True, default=datetime_to_str)    # Create a SHA-256 hash object
    hash_object = hashlib.sha256()
    hash_object.update(json_string.encode('utf-8'))
    hash_hex = hash_object.hexdigest()
    return convert_hash_to_ack_id(hash_hex)

def datetime_to_str(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError("Object of type 'datetime' is not JSON serializable")

def replace_nan_inf(obj):
    """
    Recursively replace numpy data types, NaN, and Inf values with Python native types
    to ensure JSON serialization works properly.
    Compatible with NumPy 2.0+
    """
    
    if isinstance(obj, dict):
        return {k: replace_nan_inf(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [replace_nan_inf(v) for v in obj]
    # Updated NumPy integer types
    elif isinstance(obj, (np.int8, np.int16, np.int32, np.int64,
                          np.uint8, np.uint16, np.uint32, np.uint64)):
        return int(obj)
    # Updated NumPy float types
    elif isinstance(obj, (np.float16, np.float32, np.float64)):
        if np.isnan(obj):
            return None
        elif np.isinf(obj):
            return float('inf') if obj > 0 else float('-inf')
        return float(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return replace_nan_inf(obj.tolist())
    elif isinstance(obj, pd.DataFrame):
        return replace_nan_inf(obj.to_dict('records'))
    elif isinstance(obj, pd.Series):
        return replace_nan_inf(obj.to_dict())
    elif obj is pd.NA or pd.isna(obj):
        return None
    return obj


