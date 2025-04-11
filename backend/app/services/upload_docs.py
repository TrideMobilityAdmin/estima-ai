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

    def testing(self,task_description, sub_task_parts,sub_task_description,estID):
        pred_data = list(self.estimate_output.find({"estID": estID}))
        logger.info("pred_data fetched successfully")
       
        pred_tasks_data_full = pd.DataFrame(pred_data[0]["tasks"])
        logger.info(f"pred_tasks_data columns: {pred_tasks_data_full.columns}")
        
        pred_findings_data_full = pd.DataFrame(pred_data[0]["findings"])
        logger.info(f"pred_findings_data columns: {pred_findings_data_full.columns}")

        eligibile_tasks = []
        for index, task in pred_tasks_data_full.iterrows():
            eligibile_tasks.append(task["sourceTask"])
        eligible_task_description= task_description[task_description["task_number"].isin(eligibile_tasks)]
        non_eligible_task_description= task_description[~task_description["task_number"].isin(eligibile_tasks)]
        final_mpd_data = []
        for task in eligibile_tasks:
            mydict = {}
            actual_task_data = task_description[task_description["task_number"] == task]
            actual_parts_data = sub_task_parts[sub_task_parts["task_number"] == task]
            predicted_task_data = pred_tasks_data_full[pred_tasks_data_full["sourceTask"] == task]
            pred_findings_data = pred_findings_data_full[pred_findings_data_full["taskId"] == task]
            sub_task_description_data = sub_task_description[sub_task_description["source_task_discrepancy_number"] == task]
            actual_findings_parts_data = sub_task_parts[sub_task_parts["task_number"] == task]
            
            if not actual_task_data.empty:
                actual_manhours = actual_task_data["actual_man_hours"].values[0]
                actual_spares_cost = 0
                # print(task)
                # print(actual_task_data)
                # break
                actual_spares_list = []
                if 'billable_value_usd' in actual_parts_data and len(actual_parts_data["billable_value_usd"]) > 0:
                    for index, row in actual_parts_data.iterrows():
                        rowdict = row.to_dict()
                        spares_dict = {}
                        spares_dict["partId"] = rowdict["issued_part_number"]
                        spares_dict["desc"] = rowdict["part_description"]
                        spares_dict["price"] = rowdict["billable_value_usd"]
                        spares_dict["qty"] = rowdict["used_quantity"]
                        spares_dict["unit"]=rowdict["issued_unit_of_measurement"]
                        actual_spares_cost = actual_spares_cost + rowdict["billable_value_usd"]
                        actual_spares_list.append(spares_dict)
                    # actual_spares_cost = actual_parts_data["billable_value_usd"].values[0]
                mydict["actual_manhours"]  = actual_manhours
                mydict["actual_spares_list"] = actual_spares_list
                mydict["actual_spares_cost"] = actual_spares_cost
                mydict["task_number"] = task
                # print(predicted_task_data["mhs"])
                mydict["predict_manhours"] = 0
                mydict["predict_spares_cost"] = 0
                mydict["predicted_spares_list"] = []
                for index, row in predicted_task_data.iterrows():
                    if "description" in row:
                        mydict["description"] = row["description"]
                    if "avg" in row["mhs"]:
                        mydict["predict_manhours"] = row["mhs"]["avg"]
                    if "spare_parts" in row:
                        spare_parts = row["spare_parts"]
                        mydict["predicted_spares_list"] = spare_parts
                        spsum = 0
                        for s in spare_parts:
                            spsum = spsum + s["price"]
                        mydict["predict_spares_cost"] = spsum
                findings_manhours = 0
                for index, k in sub_task_description_data.iterrows():
                    one_finding = k["actual_man_hours"]
                    findings_manhours = findings_manhours + one_finding
                final_mpd_data.append(mydict)
                
        df = pd.DataFrame(final_mpd_data) 
        total_actual_spares_cost = df['actual_spares_cost'].sum()
        total_predict_spares_cost = df['predict_spares_cost'].sum()
        total_predict_manhours = df['predict_manhours'].sum()
        total_actual_manhours = df['actual_manhours'].sum()
        summary_tasks_comparision = {}
        summary_tasks_comparision["total_actual_spares_cost"] = total_actual_spares_cost
        summary_tasks_comparision["total_predict_spares_cost"] = total_predict_spares_cost
        summary_tasks_comparision["total_predict_manhours"] = total_predict_manhours
        summary_tasks_comparision["total_actual_manhours"] = total_actual_manhours
        # summary_eligible_tasks = {"summary" : summary_tasks_comparision}
        eligible_tasks_comparision = {"eligible_tasks": final_mpd_data, "summary_tasks" :  summary_tasks_comparision}
        # output_eligible_tasks_comparision = {"tasks": eligible_tasks_comparision}
        logger.info("output_eligible_tasks_comparision successfully fetched")

        final_findings_data = self.findings(pred_findings_data_full, sub_task_parts,sub_task_description, eligibile_tasks)
        logger.info("final_findings_data successfully fetched")
        finaloutput = {}
        finaloutput["tasks"] = eligible_tasks_comparision
        finaloutput["findings"] = final_findings_data
        return finaloutput

        

    def findings(self,pred_findings_data_full, sub_task_parts,sub_task_description, eligibile_tasks):
        final_findings_data = []
        kindex = 0
        for task in eligibile_tasks:
            # if task != '200145-01-1':
            #     continue
            mydict = {}
            pred_findings_data = pred_findings_data_full[pred_findings_data_full["taskId"] == task]
            # print(pred_findings_data)
            sub_task_description_data = sub_task_description[sub_task_description["source_task_discrepancy_number"] == task]
            actual_findings_parts_data = sub_task_parts[sub_task_parts["task_number"] == task]
            findings_spares_cost = 0
            findings_spareslist = []
            actual_spares_list = []
            actual_manhours = 0
            for index, row in sub_task_description_data.iterrows():
                rowdict = row.to_dict()
                actual_manhours = actual_manhours + rowdict["actual_man_hours"]
                #print(actual_manhours)
            mydict["actual_findings_manhours"] = actual_manhours
            actual_spares_cost = 0
            for index, row in actual_findings_parts_data.iterrows():
                rowdict = row.to_dict()
                spares_dict = {}
                spares_dict["partId"] = rowdict["issued_part_number"]
                spares_dict["desc"] = rowdict["part_description"]
                spares_dict["price"] = rowdict["billable_value_usd"]
                spares_dict["qty"] = rowdict["used_quantity"]
                spares_dict["unit"] = rowdict["issued_unit_of_measurement"]
                actual_spares_cost = actual_spares_cost + row["billable_value_usd"]
                actual_spares_list.append(spares_dict)
                
            mydict["actual_findings_spares_cost"] = actual_spares_cost
            mydict["actual_findings_spares_list"] = actual_spares_list
            mydict["task_number"] = task
            
            predicted_finding_spares_cost = 0
            predicted_finding_manhours = 0
            predicted_finding_sparelist = []
            # print(pred_findings_data)
            for index, row in pred_findings_data.iterrows():
                rowdict = row.to_dict()
                rowdata = rowdict["details"]
                # print(rowdict)
                # if index > 0:
                #     break
                for k in rowdata:
                    manhours = 0
                    if 'mhs' in k:
                        manhours = k["mhs"]["avg"]
                    predicted_finding_manhours = predicted_finding_manhours + manhours
                    spare_parts = []
                    if "spare_parts" in k:
                        spare_parts = k["spare_parts"]
                    predicted_finding_sparelist = spare_parts
                    # mydict["predicted_spares_list"] = spare_parts
                    spsum = 0
                    for s in spare_parts:
                        spsum = spsum + s["price"]
                    predicted_finding_spares_cost = spsum
                    
            mydict["predicted_finding_spares_cost"] = predicted_finding_spares_cost
            mydict["predicted_finding_manhours"] = predicted_finding_manhours
            mydict["predicted_finding_sparelist"] = predicted_finding_sparelist
            final_findings_data.append(mydict)
        df = pd.DataFrame(final_findings_data) 
        total_actual_findings_spares_cost = df['actual_findings_spares_cost'].sum()
        total_predicted_finding_spares_cost = df['predicted_finding_spares_cost'].sum()
        total_predicted_finding_manhours = df['predicted_finding_manhours'].sum()
        total_actual_findings_manhours = df['actual_findings_manhours'].sum()
        summary_findings_comparision = {}
        summary_findings_comparision["total_actual_spares_cost"] = total_actual_findings_spares_cost
        summary_findings_comparision["total_predict_spares_cost"] = total_predicted_finding_spares_cost
        summary_findings_comparision["total_predict_manhours"] = total_predicted_finding_manhours
        summary_findings_comparision["total_actual_manhours"] = total_actual_findings_manhours
        # summary_eligible_tasks = {"summary_findings" : summary_findings_comparision}
        eligible_tasks_comparision = {"eligible_tasks": final_findings_data, "summary_findings" :  summary_findings_comparision}
        
        return eligible_tasks_comparision


        



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
            


    