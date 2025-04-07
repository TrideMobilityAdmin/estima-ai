from fastapi import FastAPI, File, UploadFile, HTTPException,Depends
from typing import List, Dict, Any
import pandas as pd
import numpy as np
import os
import json
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

            if excel_data.empty:
                raise HTTPException(
                    status_code=400,
                    detail="The Excel file contains no data"
                )

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
            if 'DESCRIPTION' in processed_record:
                processed_record['description'] = processed_record.pop('DESCRIPTION')

            processed_record.update({
            "upload_timestamp": current_time,
            "original_filename": file.filename,
            "createdAt": current_time,
            "updatedAt": current_time,
            "status": "Initiated"
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
        
        pipeline=[
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
            logger.info(f"compare_result: {compare_result}")

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

    def testing(self,task_description, sub_task_parts,sub_task_description,estID):
        pred_data = list(self.estimate_output.find({"estID": estID}))
        logger.info("pred_data fetched successfully")
        if not pred_data :  # Check for empty or missing tasks
            return pd.DataFrame()  # Return an empty DataFrame if no valid data
        pred_tasks_data = pd.DataFrame(pred_data[0]["tasks"])
        # Extract 'avg', 'max', and 'min' from 'mhs' dictionary
        pred_tasks_data["avg_mh"] = pred_tasks_data["mhs"].apply(lambda x: x.get("avg") if isinstance(x, dict) else None)
        pred_tasks_data["max_mh"] = pred_tasks_data["mhs"].apply(lambda x: x.get("max") if isinstance(x, dict) else None)
        pred_tasks_data["min_mh"] = pred_tasks_data["mhs"].apply(lambda x: x.get("min") if isinstance(x, dict) else None)
        # Compute total billable value from spare_parts
        pred_tasks_data["total_billable_value_usd"] = pred_tasks_data["spare_parts"].apply(
            lambda x: sum(item["price"] for item in x if isinstance(item, dict)) if isinstance(x, list) else 0
        )
        # Fetch actual package data
        pred_tasks_data["total_billable_value_usd"] = pred_tasks_data["spare_parts"].apply(
            lambda x: sum(item["price"] for item in x if isinstance(item, dict)) if isinstance(x, list) else 0
        )
        # Fetch actual package data
        pkg_tasks_data = task_description
        pkg_tasks_data = pkg_tasks_data[~pkg_tasks_data["task_number"].str.startswith("AWR")]
        logger.info("pkg_tasks_data fetched successfully")
        # Filter sub_task_parts for tasks belonging to the specific package_number
        filtered_sub_task_parts = sub_task_parts
        logger.info("filtered_sub_task_parts fetched successfully")
        # Compute actual task part consumption
        task_parts_consumption = filtered_sub_task_parts.groupby("task_number", as_index=False).agg(
            task_part_consumption=("billable_value_usd", "sum")
        )
        logger.info("task_parts_consumption fetched successfully")
        # Merge task_parts_consumption with pkg_tasks_data based on task_number and SourceTask
        pkg_tasks_data = pkg_tasks_data.merge(task_parts_consumption, left_on="task_number", right_on="task_number", how="left")
        # Fill missing values to avoid NaN issues
        pkg_tasks_data.loc[:, "task_part_consumption"] = pkg_tasks_data["task_part_consumption"].fillna(0)
        # Ensure data types match for merging
        pkg_tasks_data["task_number"] = pkg_tasks_data["task_number"].astype(str)
        pred_tasks_data["task_number"] = pred_tasks_data["sourceTask"].astype(str)
        pred_tasks_data.rename(columns={"avg_mh": "actual_man_hours", "total_billable_value_usd": "task_part_consumption"}, inplace=True)
        pred_findings_data = pd.DataFrame(pred_data[0]["findings"])
        logger.info("pred_findings_data fetched successfully")

        if "details" in pred_findings_data.columns:
            pred_findings_data["avg_mh_findings"] = pred_findings_data["details"].apply(
            lambda x: x[0]["mhs"].get("avg") if isinstance(x, list) and len(x) > 0 else None
            )
            pred_findings_data["max_mh_findings"] = pred_findings_data["details"].apply(
                lambda x: x[0]["mhs"].get("max") if isinstance(x, list) and len(x) > 0 else None
            )
            pred_findings_data["min_mh_findings"] = pred_findings_data["details"].apply(
                lambda x: x[0]["mhs"].get("min") if isinstance(x, list) and len(x) > 0 else None
            )
            # Compute total billable value from spare_parts
            pred_findings_data["findings_part_consumption"] = pred_findings_data["details"].apply(
                lambda x: sum(item["price"] for item in x[0]["spare_parts"] if isinstance(item, dict)) if isinstance(x, list) else 0
            )
            pred_findings_data.groupby(["taskId"])[["avg_mh_findings", "max_mh_findings", "min_mh_findings", "findings_part_consumption"]].sum()
            logger.info("pred_findings_data grouped successfully")

            pkg_findings_data = sub_task_description
            pkg_findings_data = pkg_findings_data[~pkg_findings_data["source_task_discrepancy_number"].str.startswith("AWR")]
            pkg_findings_data["source_task_discrepancy_number"].dropna(inplace=True)
            logger.info("pkg_findings_data AWR filtered successfully")
            # Filter sub_task_parts for tasks belonging to the specific package_number
            filtered_sub_task_parts = sub_task_parts
            logger.info("filtered_sub_task_parts fetched successfully")
            has_nan = filtered_sub_task_parts.isnull().any().any()
            if has_nan:
                logger.info("filtered_sub_task_parts contains NaN values.")
            else:
                logger.info("No NaN values found in filtered_sub_task_parts.")
            filtered_sub_task_parts.dropna(inplace=True)
            logger.info("filtered_sub_task_parts NaN values dropped successfully")

            filtered_sub_task_parts=filtered_sub_task_parts[filtered_sub_task_parts["task_number"].str.startswith("HMV")]
            logger.info("filtered_sub_task_parts HMV filtered successfully")

            filtered_sub_task_parts = filtered_sub_task_parts.merge(
            pkg_findings_data[["log_item_number", "source_task_discrepancy_number"]],
            left_on="task_number",
            right_on="log_item_number",
            how="left"
            )
            logger.info("filtered_sub_task_parts merged successfully")
            filtered_sub_task_parts["source_task_discrepancy_number"].dropna(inplace=True)
            filtered_sub_task_parts["source_task_discrepancy_number"] = (
            filtered_sub_task_parts["source_task_discrepancy_number"].astype(str)
            )
            # Filter out rows where "source_task_discrepancy_number" starts with "AWR"
            filtered_sub_task_parts = filtered_sub_task_parts[
                ~filtered_sub_task_parts["source_task_discrepancy_number"].str.startswith("AWR", na=False)
            ]
            logger.info("filtered_sub_task_parts AWR filtered successfully")
            # Compute actual task part consumption
            findings_parts_consumption = filtered_sub_task_parts.groupby("task_number", as_index=False).agg(
                findings_part_consumption=("billable_value_usd", "sum")
            )
            logger.info("findings_parts_consumption grouped successfully")
            # Merge task_parts_consumption with pkg_tasks_data based on task_number and SourceTask
            pkg_findings_data = pkg_findings_data.merge(findings_parts_consumption, left_on="log_item_number", right_on="task_number", how="left")
            logger.info("pkg_findings_data merged successfully")
            # Fill missing values to avoid NaN issues
            pkg_findings_data.loc[:, "findings_part_consumption"] = pkg_findings_data["findings_part_consumption"].fillna(0)
            pkg_findings_data=pkg_findings_data.groupby(["source_task_discrepancy_number"])[["actual_man_hours", "findings_part_consumption"]].sum()
            pred_findings_data.rename(columns={"avg_mh_findings": "actual_man_hours_findings","taskId":"task_number"}, inplace=True)
            pkg_findings_data.reset_index(inplace=True)  # Moves index to a column
            pkg_findings_data.rename(
                columns={
                    "actual_man_hours": "actual_man_hours_findings",
                    "source_task_discrepancy_number": "task_number"
                },
                inplace=True
            )
            logger.info(f"pkg_finfings_data renamed: {pkg_findings_data.columns}")

            pkg_findings_data["task_number"] = pkg_findings_data["task_number"].astype(str)
            pred_findings_data["task_number"] = pred_findings_data["task_number"].astype(str)
            pkg_tasks_data = pkg_tasks_data.merge(pkg_findings_data, on="task_number", how="left")
            pred_tasks_data = pred_tasks_data.merge(pred_findings_data, on="task_number", how="left")
            logger.info("pkg_tasks_data and pred_tasks_data merged successfully")
            # Compute differences safely
            results = pkg_tasks_data.merge(pred_tasks_data, on="task_number", suffixes=("_actual", "_pred"), how="left")
            logger.info("results merged successfully")

            results["diff_avg_mh"] = results["actual_man_hours_pred"].fillna(0) - results["actual_man_hours_actual"].fillna(0)
            results["diff_total_billable_value_usd_tasks"] = results["task_part_consumption_pred"].fillna(0) - results["task_part_consumption_actual"].fillna(0)
            # Merge predicted and actual data
            results["diff_avg_mh_findings"] = results["actual_man_hours_findings_pred"].fillna(0) - results["actual_man_hours_findings_actual"].fillna(0)
            results["diff_total_billable_value_usd_findings"] = results["findings_part_consumption_pred"].fillna(0) - results["findings_part_consumption_actual"].fillna(0)
            
            # Assuming 'results' is a DataFrame
            results_df = results[[
                 'task_number', 'actual_man_hours_actual',
                'task_part_consumption_actual', 'actual_man_hours_pred',
                'task_part_consumption_pred', 'actual_man_hours_findings_actual',
                'findings_part_consumption_actual', 'actual_man_hours_findings_pred',
                'findings_part_consumption_pred', 'diff_avg_mh',
                'diff_total_billable_value_usd_tasks', 'diff_avg_mh_findings',
                'diff_total_billable_value_usd_findings'
            ]].copy()  # Using .copy() to avoid SettingWithCopyWarning
            
            results_df.fillna(0, inplace=True)
            logger.info("results_df filled NaN values successfully")
            logger.info(f"results_df columns: {results_df.columns}")
            
            tasks = []  # List to store task dictionaries
            
            for _, row in results_df.iterrows():
                task = {
                
                    "task_number": row["task_number"],
                    "actual_man_hours_actual": row["actual_man_hours_actual"],
                    "task_part_consumption_actual": row["task_part_consumption_actual"],
                    "actual_man_hours_pred": row["actual_man_hours_pred"],
                    "task_part_consumption_pred": row["task_part_consumption_pred"],
                    "actual_man_hours_findings_actual": row["actual_man_hours_findings_actual"],
                    "findings_part_consumption_actual": row["findings_part_consumption_actual"],
                    "actual_man_hours_findings_pred": row["actual_man_hours_findings_pred"],
                    "findings_part_consumption_pred": row["findings_part_consumption_pred"],
                    "diff_avg_mh": row["diff_avg_mh"],
                    "diff_total_billable_value_usd_tasks": row["diff_total_billable_value_usd_tasks"],
                    "diff_avg_mh_findings": row["diff_avg_mh_findings"],
                    "diff_total_billable_value_usd_findings": row["diff_total_billable_value_usd_findings"],
                    "accuracy": 100 - (
                        abs(row["actual_man_hours_pred"]) + abs(row["actual_man_hours_findings_pred"]) +
                        row["task_part_consumption_pred"] + row["findings_part_consumption_pred"]
                    ) / (
                        row["task_part_consumption_actual"] + row["findings_part_consumption_actual"] +
                        row["actual_man_hours_actual"] + row["actual_man_hours_findings_actual"]
                    ) * 100 if (
                        row["task_part_consumption_actual"] + row["findings_part_consumption_actual"] +
                        row["actual_man_hours_actual"] + row["actual_man_hours_findings_actual"]
                    ) > 0 else 0  # Avoid division by zero
                }
                tasks.append(task)
            
            # Compute aggregated accuracy
            actual_mh_total = results_df["actual_man_hours_actual"].sum()
            pred_mh_total = results_df["actual_man_hours_pred"].sum()
            actual_billable_total = results_df["task_part_consumption_actual"].sum()
            pred_billable_total = results_df["task_part_consumption_pred"].sum()
            
            accuracy_mh = (1 - abs(pred_mh_total - actual_mh_total) / actual_mh_total) * 100 if actual_mh_total > 0 else 0
            accuracy_billable = (1 - abs(pred_billable_total - actual_billable_total) / actual_billable_total) * 100 if actual_billable_total > 0 else 0
            logger.info("accuracy_mh and accuracy_billable calculated successfully")
            
            results = {
                "tasks": tasks,
                "aggregatedTasklevel": {
                    "avg_mh_actual": actual_mh_total,
                    "total_billable_value_usd_tasks_actual": actual_billable_total,
                    "avg_mh_pred": pred_mh_total,
                    "total_billable_value_usd_tasks_pred": pred_billable_total,
                    "diff_avg_mh": results_df["diff_avg_mh"].sum(),
                    "diff_total_billable_value_usd_tasks": results_df["diff_total_billable_value_usd_tasks"].sum(),
                    "accuracy_mh": accuracy_mh,
                    "accuracy_total_billable_value_usd_tasks": accuracy_billable
                },
                "aggregatedFindingslevel": {
                    "avg_mh_findings_actual": results_df["actual_man_hours_findings_actual"].sum(),
                    "total_billable_value_usd_findings_actual": results_df["findings_part_consumption_actual"].sum(),
                    "avg_mh_findings_pred": results_df["actual_man_hours_findings_pred"].sum(),
                    "total_billable_value_usd_findings_pred": results_df["findings_part_consumption_pred"].sum(),
                    "diff_avg_mh": results_df["diff_avg_mh_findings"].sum(),
                    "diff_total_billable_value_usd_findings": results_df["diff_total_billable_value_usd_findings"].sum(),
                    "accuracy_mh": (1 - abs(results_df["actual_man_hours_findings_pred"].sum() - results_df["actual_man_hours_findings_actual"].sum())
                                    / results_df["actual_man_hours_findings_actual"].sum()) * 100
                                    if results_df["actual_man_hours_findings_actual"].sum() > 0 else 0,
                    "accuracy_total_billable_value_usd_findings": (1 - abs(results_df["findings_part_consumption_pred"].sum() - results_df["findings_part_consumption_actual"].sum())
                                                                / results_df["findings_part_consumption_actual"].sum()) * 100
                                                                if results_df["findings_part_consumption_actual"].sum() > 0 else 0
                }
            }

            
            
            
            return results
            

        else:
                # Compute differences safely
            results = pkg_tasks_data.merge(pred_tasks_data, on="task_number", suffixes=("_actual", "_pred"), how="left")
            results["diff_avg_mh"] = results["actual_man_hours_pred"].fillna(0) - results["actual_man_hours_actual"].fillna(0)
            results["diff_total_billable_value_usd_tasks"] = results["task_part_consumption_pred"].fillna(0) - results["task_part_consumption_actual"].fillna(0)
            columns_to_add = ['actual_man_hours_findings_actual', 'findings_part_consumption_actual',
                            'actual_man_hours_findings_pred', 'findings_part_consumption_pred',
                            'diff_avg_mh_findings', 'diff_total_billable_value_usd_findings']
            # Ensure all columns exist
            results = results.reindex(columns=results.columns.union(columns_to_add, sort=False), fill_value=0)
            
            
            # Assuming 'results' is a DataFrame
            results_df = results[[
                'task_number', 'actual_man_hours_actual',
                'task_part_consumption_actual', 'actual_man_hours_pred',
                'task_part_consumption_pred', 'actual_man_hours_findings_actual',
                'findings_part_consumption_actual', 'actual_man_hours_findings_pred',
                'findings_part_consumption_pred', 'diff_avg_mh',
                'diff_total_billable_value_usd_tasks', 'diff_avg_mh_findings',
                'diff_total_billable_value_usd_findings'
            ]].copy()  # Using .copy() to avoid SettingWithCopyWarning
            
            results_df.fillna(0, inplace=True)
            
            tasks = []  # List to store task dictionaries
            
            for _, row in results_df.iterrows():
                task = {
                    
                    "task_number": row["task_number"],
                    "actual_man_hours_actual": row["actual_man_hours_actual"],
                    "task_part_consumption_actual": row["task_part_consumption_actual"],
                    "actual_man_hours_pred": row["actual_man_hours_pred"],
                    "task_part_consumption_pred": row["task_part_consumption_pred"],
                    "actual_man_hours_findings_actual": row["actual_man_hours_findings_actual"],
                    "findings_part_consumption_actual": row["findings_part_consumption_actual"],
                    "actual_man_hours_findings_pred": row["actual_man_hours_findings_pred"],
                    "findings_part_consumption_pred": row["findings_part_consumption_pred"],
                    "diff_avg_mh": row["diff_avg_mh"],
                    "diff_total_billable_value_usd_tasks": row["diff_total_billable_value_usd_tasks"],
                    "diff_avg_mh_findings": row["diff_avg_mh_findings"],
                    "diff_total_billable_value_usd_findings": row["diff_total_billable_value_usd_findings"],
                    "accuracy": 100 - (
                        abs(row["actual_man_hours_pred"]) + abs(row["actual_man_hours_findings_pred"]) +
                        row["task_part_consumption_pred"] + row["findings_part_consumption_pred"]
                    ) / (
                        row["task_part_consumption_actual"] + row["findings_part_consumption_actual"] +
                        row["actual_man_hours_actual"] + row["actual_man_hours_findings_actual"]
                    ) * 100 if (
                        row["task_part_consumption_actual"] + row["findings_part_consumption_actual"] +
                        row["actual_man_hours_actual"] + row["actual_man_hours_findings_actual"]
                    ) > 0 else 0  # Avoid division by zero
                }
                tasks.append(task)
            
            # Compute aggregated accuracy
            actual_mh_total = results_df["actual_man_hours_actual"].sum()
            pred_mh_total = results_df["actual_man_hours_pred"].sum()
            actual_billable_total = results_df["task_part_consumption_actual"].sum()
            pred_billable_total = results_df["task_part_consumption_pred"].sum()
            
            accuracy_mh = (1 - abs(pred_mh_total - actual_mh_total) / actual_mh_total) * 100 if actual_mh_total > 0 else 0
            accuracy_billable = (1 - abs(pred_billable_total - actual_billable_total) / actual_billable_total) * 100 if actual_billable_total > 0 else 0
            
            results = {
                "tasks": tasks,
                "aggregatedTasklevel": {
                    "avg_mh_actual": actual_mh_total,
                    "total_billable_value_usd_tasks_actual": actual_billable_total,
                    "avg_mh_pred": pred_mh_total,
                    "total_billable_value_usd_tasks_pred": pred_billable_total,
                    "diff_avg_mh": results_df["diff_avg_mh"].sum(),
                    "diff_total_billable_value_usd_tasks": results_df["diff_total_billable_value_usd_tasks"].sum(),
                    "accuracy_mh": accuracy_mh,
                    "accuracy_total_billable_value_usd_tasks": accuracy_billable
                },
                "aggregatedFindingslevel": {
                    "avg_mh_findings_actual": results_df["actual_man_hours_findings_actual"].sum(),
                    "total_billable_value_usd_findings_actual": results_df["findings_part_consumption_actual"].sum(),
                    "avg_mh_findings_pred": results_df["actual_man_hours_findings_pred"].sum(),
                    "total_billable_value_usd_findings_pred": results_df["findings_part_consumption_pred"].sum(),
                    "diff_avg_mh": results_df["diff_avg_mh_findings"].sum(),
                    "diff_total_billable_value_usd_findings": results_df["diff_total_billable_value_usd_findings"].sum(),
                    "accuracy_mh": (1 - abs(results_df["actual_man_hours_findings_pred"].sum() - results_df["actual_man_hours_findings_actual"].sum())
                                    / results_df["actual_man_hours_findings_actual"].sum()) * 100
                                    if results_df["actual_man_hours_findings_actual"].sum() > 0 else 0,
                    "accuracy_total_billable_value_usd_findings": (1 - abs(results_df["findings_part_consumption_pred"].sum() - results_df["findings_part_consumption_actual"].sum())
                                                                / results_df["findings_part_consumption_actual"].sum()) * 100
                                                                if results_df["findings_part_consumption_actual"].sum() > 0 else 0
                }
            }

            
            
            
            return results



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
            


    