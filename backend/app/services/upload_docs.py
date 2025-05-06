from fastapi import FastAPI, File, UploadFile, HTTPException,Depends
from fastapi.responses import ORJSONResponse
from typing import List, Dict, Any
import pandas as pd
import numpy as np
import os
# Try with a different encoding approach
import sys
import json
import math
import yaml
import re
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
import re
from fuzzywuzzy import process

from difflib import SequenceMatcher
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
class ExcelUploadService:
    def __init__(self):
        self.mongo_client = MongoDBClient()
        # self.collection = self.mongo_client.get_collection("estima_input_upload")
        # self.collection=self.mongo_client.get_collection("estima_input")
        self.estima_collection=self.mongo_client.get_collection("estimate_file_upload")
        self.collection=self.mongo_client.get_collection("estima_input")
        self.estimate_output=self.mongo_client.get_collection("estima_output")
        self.estimate=self.mongo_client.get_collection("create_estimate")
        self.configurations_collection=self.mongo_client.get_collection("configurations")
        self.remarks_collection=self.mongo_client.get_collection("estimate_status_remarks")
        self.parts_master_collection=self.mongo_client.get_collection("parts_master")
        
       
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
                "aircraftRegNo": estimate_request.aircraftRegNo,
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
            
            data_to_insert = {
                **json_data,
                "estHashID":taskUniqHash,
                "estID":est_id,
                # "tasks": estimate_request.tasks,
                "probability": estimate_request.probability,
                "operator": estimate_request.operator,
                "typeOfCheck": estimate_request.typeOfCheck,
                "typeOfCheckID": estimate_request.typeOfCheckID,
                "aircraftAge": estimate_request.aircraftAge,
                "aircraftRegNo":estimate_request.aircraftRegNo,
                "aircraftModel": estimate_request.aircraftModel,
                "aircraftFlightHours": estimate_request.aircraftFlightHours,
                "aircraftFlightCycles": estimate_request.aircraftFlightCycles,
                "areaOfOperations": estimate_request.areaOfOperations,
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
            'tatTime': {
                '$divide': [
                    {
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
                    }, man_hours_threshold
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
            'tasks': '$task', 
            'descriptions': '$description', 
            'aircraftRegNo': '$aircraftRegNo', 
            'status': '$status', 
            'totalMhs': 1, 
            'tatTime': {
                '$ifNull': [
                    '$tatTime', 0.0
                ]
            }, 
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
   
    async def process_multiple_files(self, files: List[UploadFile], columnMappings: Dict, SheetName: str) -> pd.DataFrame:
        """
        Read and process multiple uploaded Excel or CSV files.

        Args:
            files (List[UploadFile]): List of uploaded files to process.
            columnMappings (Dict): Column mapping configurations.
            SheetName (str): Name of the sheet to read from Excel files.

        Returns:
            pd.DataFrame: Combined processed records from matching files
        """
        logger.info(f"Processing {len(files)} files")
        logger.info(f"Column Mappings: {columnMappings}")
        logger.info(f"Looking for sheet name: {SheetName}")

        processed_dataframes = []

        for file in files:
            try:
                # Read the file content
                content = await file.read()
                file_extension = file.filename.split('.')[-1].lower()
                
                logger.info(f"Processing file: {file.filename}, Extension: {file_extension}")

                # Handle Excel files
                if file_extension in ['xls', 'xlsx']:
                    try:
                        # Attempt to read the specified sheet
                        df = self.read_excel_with_multiple_sheetnames(content, file_extension, SheetName)
                        
                        if df is not None and not df.empty:
                            # Rename columns based on provided mappings
                            df.rename(columns=columnMappings, inplace=True)
                            
                            logger.info(f"Successfully processed file: {file.filename}")
                            logger.info(f"DataFrame columns: {df.columns}")
                            logger.info(f"DataFrame shape: {df.shape}")
                            
                            processed_dataframes.append(df)
                        else:
                            logger.warning(f"No data found in sheet {SheetName} for file {file.filename}")
                    
                    except Exception as excel_error:
                        logger.error(f"Error processing Excel file {file.filename}: {str(excel_error)}")
            
            except Exception as file_error:
                logger.error(f"Error processing file {file.filename}: {str(file_error)}")
            
            # Reset file pointer to beginning for potential reuse
            file.file.seek(0)

        # Combine all processed dataframes
        if processed_dataframes:
            combined_df = pd.concat(processed_dataframes, ignore_index=True)
            logger.info(f"Total records in combined DataFrame: {len(combined_df)}")
            return combined_df
        
        logger.warning(f"No files found with sheet name: {SheetName}")
        return pd.DataFrame() 
        
       
    async def compare_estimates(self, estimate_id: str, files: List[UploadFile] = File(...)) -> Dict[str, Any]:
        """
        Compare estimates for multiple uploaded files
        
        Args:
            estimate_id (str): Estimate ID to compare
            files (List[UploadFile]): List of uploaded files to process
        
        Returns:
            Dict[str, Any]: Comparison results
        """
        logger.info(f"Comparing estimates for estimate ID: {estimate_id}")
        # Process files and extract actual data

        
        config_file_path = os.path.join("app", "config", "config.yaml")
        with open(config_file_path, 'r') as file:
            columnMappings = yaml.safe_load(file)
        logger.info("config file data fetched sucessfully")

        try:
            sub_task_parts =  await self.process_multiple_files(files, columnMappings['sub_task_parts_column_mappings'], "PRICING")
            logger.info(f"sub_task_parts: {sub_task_parts}")
            sub_task_description =  await self.process_multiple_files(files, columnMappings['sub_task_description_columns_mappings'], "mldpmlsec1")
            logger.info(f"sub_task_description: {sub_task_description}")
            task_description =  await self.process_multiple_files(files, columnMappings['task_description_columns_mappings'], "mltaskmlsec1")
            logger.info(f"task_description: {task_description}, sub_task_description: {sub_task_description}, sub_task_parts: {sub_task_parts}")
            if sub_task_parts.empty or sub_task_description.empty or task_description.empty:
                raise ValueError("One or more required sheets are missing from the uploaded files.")
            compare_result=self.testing(task_description, sub_task_parts,sub_task_description,estimate_id)
            logger.info("compare_result successfully fetched")

            return compare_result
        except Exception as e:
            logger.error(f"Unexpected error in compare_estimates: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal server error")
    
    def read_excel_with_multiple_sheetnames(self, content, file_extension, SheetName):
        """
        Read a specific sheet from an Excel file.

        Args:
            content (bytes): File content.
            file_extension (str): File extension.
            SheetName (str): Name of the sheet to read.

        Returns:
            pd.DataFrame: DataFrame containing the sheet data.
        """
        try:
            logger.info(f"Reading Excel file with sheet name: {SheetName}")
            
            # Choose appropriate engine based on file extension
            engine = 'openpyxl' if file_extension in ['xlsx'] else 'xlrd'
            
            # Read the specific sheet
            df = pd.read_excel(
                io.BytesIO(content), 
                sheet_name=SheetName,
                engine=engine
            )
            
            logger.info(f"Successfully read sheet {SheetName}")
            logger.info(f"DataFrame headers: {list(df.columns)}")
            logger.info(f"DataFrame shape: {df.shape}")
            
            return df
        
        except ValueError as sheet_error:
            logger.error(f"Sheet {SheetName} not found: {str(sheet_error)}")
            return None
        except Exception as error:
            logger.error(f"Error reading Excel file: {str(error)}")
            return None

    def testing(self,task_description, sub_task_parts, sub_task_description, estID):

        # Fetch predicted data
        pred_data = list(self.estimate_output.find({"estID": estID}))
        if not pred_data:
            print("None EstID Pred Data -->" + estID)
            return {}
        
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



        
        # Extract eligible tasks
        eligibile_tasks = pred_tasks_data_full["sourceTask"].astype(str).tolist()
        
        # Calculate actual capping values
        actual_capping_values = actual_cap_calculation(cappingDetails, eligibile_tasks, sub_task_description, sub_task_parts)
        
        # Filter task descriptions
        eligible_task_description = task_description[task_description["task_number"].isin(eligibile_tasks)]
        
        # ----- PROCESS TASKS DATA (similar to testing function) -----
        final_mpd_data = []
        for task in eligibile_tasks:
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
        
        for task in eligibile_tasks:
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
                            manhours = k["mhs"].get("avg", 0) * (k.get("prob", 100) / 100)
                        predicted_finding_manhours += manhours
                        
                        spare_parts = []
                        if "spare_parts" in k:
                            spare_parts = k["spare_parts"]
                        predicted_finding_sparelist += spare_parts
                        
                        spsum = 0
                        for s in spare_parts:
                            spsum += s.get("price", 0) * (s.get("prob", 100) / 100)
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
        
        summary_findings_comparision = {
            "total_actual_spares_cost": total_actual_findings_spares_cost,
            "total_predict_spares_cost": total_predicted_finding_spares_cost,
            "total_predict_manhours": total_predicted_finding_manhours,
            "total_actual_manhours": total_actual_findings_manhours
        }
        
        eligible_findings_comparision = {
            "eligible_tasks": final_findings_data,
            "summary_findings": summary_findings_comparision
        }
        

        
        # Create the final output structure to match testing function
        finaloutput = {
            "tasks": eligible_tasks_comparision,
            "findings": eligible_findings_comparision,
            # Adding additional aircraft info that was in testing2 but not in testing
            "cappingDetails": {
                "actual_capping": actual_capping_values,
                "predicted_capping": pred_capping_values
            }
        }
        finaloutput= replace_nan_inf(finaloutput)
        
        return finaloutput
    
def actual_cap_calculation(cappingDetails, eligibile_tasks, sub_task_description, sub_task_parts):
    print("Starting actual_cap_calculation")
    print(f"cappingDetails: {cappingDetails}")
    print(f"Number of eligible tasks: {len(eligibile_tasks)}")
    
    
    # Ensure cappingDetails is a dictionary
    if not isinstance(cappingDetails, dict) or not cappingDetails:
        print("No capping details found, returning default values")
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
    
    print(f"Initial capping_values: {capping_values}")
    
    # Filter sub_task_description to only include eligible tasks
    sub_task_description = sub_task_description[sub_task_description["source_task_discrepancy_number_updated"].isin(eligibile_tasks)]
    print(f"Filtered sub_task_description shape: {sub_task_description.shape}")
    
    # Define create_group function correctly (fixed indentation)
    def create_group(df):
        print("Creating groups for tasks")
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
        
        print(f"Number of unique groups created: {df['group'].nunique()}")
        return df
    
    # Apply the create_group function
    sub_task_description = create_group(sub_task_description)
    
    # Calculate task level man hours
    print("Calculating task level man hours")
    task_level_mh = sub_task_description.groupby(
        ["source_task_discrepancy_number_updated"]
    ).agg(
        avg_actual_man_hours=("actual_man_hours", "sum"),
        max_actual_man_hours=("actual_man_hours", "sum"),
        min_actual_man_hours=("actual_man_hours", "sum")
    ).reset_index()
    
    print(f"task_level_mh shape: {task_level_mh.shape}")
    
    # Calculate group level man hours
    print("Calculating group level man hours")
    group_level_mh = sub_task_description.groupby(
        ["group"]
    ).agg(
        avg_actual_man_hours=("actual_man_hours", "sum"),
        max_actual_man_hours=("actual_man_hours", "sum"),
        min_actual_man_hours=("actual_man_hours", "sum"),
        skill_number=("skill_number", lambda x: list(set(x)))
    ).reset_index()
    
    print(f"group_level_mh shape: {group_level_mh.shape}")
    
    # Get eligible log items
    eligible_log_items = sub_task_description["log_item_number"].unique().tolist()
    print(f"Number of eligible log items: {len(eligible_log_items)}")
    
    # Filter sub_task_parts to only include eligible log items
    filtered_sub_task_parts = sub_task_parts[sub_task_parts['task_number'].isin(eligible_log_items)]
    print(f"filtered_sub_task_parts shape: {filtered_sub_task_parts.shape}")
    
    # Merge task_level_parts
    print("Merging task level parts")
    task_level_parts = pd.merge(
        filtered_sub_task_parts,
        sub_task_description[["log_item_number", "source_task_discrepancy_number_updated"]],
        left_on="task_number",
        right_on="log_item_number",
        how="left"
    ).drop(columns=["log_item_number"])
    
    # If the merge resulted in an empty DataFrame, create an empty one with required columns
    if task_level_parts.empty:
        print("WARNING: task_level_parts is empty, creating empty DataFrame with required columns")
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
    
    print(f"task_level_parts shape after aggregation: {task_level_parts.shape}")
    
    # Add 'group' column to filtered_sub_task_parts by merging with sub_task_description
    print("Adding group column to filtered_sub_task_parts")
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
    
    print(f"group_level_parts shape: {group_level_parts.shape}")
    
    # Create parts_line_items DataFrame
    parts_line_items = filtered_sub_task_parts.groupby(["issued_part_number"]).agg(
        billable_value_usd=("billable_value_usd", "sum"),
        used_quantity=("used_quantity", "sum"),
        part_description=('part_description', "first"),
        issued_unit_of_measurement=('issued_unit_of_measurement', "first")
    ).reset_index()
    
    print(f"parts_line_items shape: {parts_line_items.shape}")
    
    # Create copies for processing
    task_level_mh_cap = task_level_mh.copy()
    task_level_parts_cap = task_level_parts.copy()
    
    # Aggregate task level parts for capping
    task_level_parts_cap_agg = task_level_parts_cap.groupby(["source_task_discrepancy_number_updated"]).agg(
        billable_value_usd=("billable_value_usd", "sum")
    ).reset_index()
    
    print(f"task_level_parts_cap_agg shape: {task_level_parts_cap_agg.shape}")
    
    # Copy group level data
    group_level_mh_cap = group_level_mh.copy()
    group_level_parts_cap = group_level_parts.copy()
    
    # Add source_task_discrepancy_number_updated column to group_level_parts_cap if it doesn't exist
    if "source_task_discrepancy_number_updated" not in group_level_parts_cap.columns:
        print("WARNING: source_task_discrepancy_number_updated not in group_level_parts_cap columns, adding placeholder")
        # This is a placeholder. In real code, you would need to properly join/map this information.
        group_level_parts_cap["source_task_discrepancy_number_updated"] = "Unknown"
    
    # Aggregate group level parts for capping
    group_level_parts_cap_agg = group_level_parts_cap.groupby(["source_task_discrepancy_number_updated", "group"]).agg(
        billable_value_usd=("billable_value_usd", "sum")
    ).reset_index()
    
    print(f"group_level_parts_cap_agg shape: {group_level_parts_cap_agg.shape}")
    
    # Create a copy of parts_line_items for capping
    parts_line_items_result = parts_line_items.copy()
    
    # Get capping values from details
    mhs_cap_type = cappingDetails.get("cappingTypeManhrs", "No capping")
    mhs_cap_amt = cappingDetails.get("cappingManhrs", 0)
    spares_cap_type = cappingDetails.get("cappingTypeSpareCost", "No capping")
    spares_cap_amt = cappingDetails.get("cappingSpareCost", 0)
    
    print(f"Capping parameters: mhs_cap_type={mhs_cap_type}, mhs_cap_amt={mhs_cap_amt}, spares_cap_type={spares_cap_type}, spares_cap_amt={spares_cap_amt}")
    
    # Define man-hours capping function
    def mhs_cap(mhs_cap_type, mhs_cap_amt):
        print(f"Applying man-hours capping: {mhs_cap_type}, amount: {mhs_cap_amt}")
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
            print(f"Per source card MH result: unbillable={unbillable_sum}, billable={billable_sum}")
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
            print(f"Per IRC MH result: unbillable={unbillable_sum}, billable={billable_sum}")
            return unbillable_sum, billable_sum
        
        else:  # No capping
            total_sum = task_level_mh_cap["avg_actual_man_hours"].sum() 
            print(f"No capping for MH: unbillable=0, billable={total_sum}")
            return 0, total_sum
    
    # Define spares capping function
    def spares_cap(spares_cap_type, spares_cap_amt):
        print(f"Applying spares capping: {spares_cap_type}, amount: {spares_cap_amt}")
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
            print(f"Per source card spares result: unbillable={unbillable_sum}, billable={billable_sum}")
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
            print(f"Per IRC spares result: unbillable={unbillable_sum}, billable={billable_sum}")
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
            print(f"Per line item spares result: unbillable={unbillable_sum}, billable={billable_sum}")
            return unbillable_sum, billable_sum
            
        else:  # No capping
            total_sum = task_level_parts_cap_agg["billable_value_usd"].sum() if not task_level_parts_cap_agg.empty else 0
            print(f"No capping for spares: unbillable=0, billable={total_sum}")
            return 0, total_sum
    
    # Calculate and set man-hours capping values
    print("Calculating man-hours capping values")
    capping_values["unbillableManhrs"], capping_values["billableManhrs"] = mhs_cap(mhs_cap_type, mhs_cap_amt)
    
    # Calculate and set spare costs capping values
    print("Calculating spare costs capping values")
    capping_values['unbillableSpareCost'], capping_values['billableSpareCost'] = spares_cap(spares_cap_type, spares_cap_amt)
    
    print(f"Final capping_values: {capping_values}")
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

