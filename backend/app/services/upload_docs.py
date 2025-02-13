from fastapi import FastAPI, File, UploadFile, HTTPException
from typing import List, Dict, Any
import pandas as pd
import numpy as np
import json
import re
from app.models.estimates import ComparisonResponse,ComparisonResult,EstimateResponse,DownloadResponse
from app.log.logs import logger
from datetime import datetime, timedelta,timezone
import io
from app.db.database_connection import MongoDBClient
from fastapi.responses import StreamingResponse
from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from app.services.task_analytics_service import TaskService

class ExcelUploadService:
    def __init__(self):
        self.mongo_client = MongoDBClient()
        # self.collection = self.mongo_client.get_collection("estima_input_upload")
        self.collection=self.mongo_client.get_collection("estima_input")
        self.estimate_collection=self.mongo_client.get_collection("estimates")
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
            
            cleaned_data = data.drop_duplicates()
            
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
            
            # logger.info("final data types:\n", cleaned_data.dtypes)
            return cleaned_data
            
        except Exception as e:
            logger.error(f"Data cleaning error: {str(e)}")
            raise

    async def process_excel_file(self, file: UploadFile) -> List[Dict[Any, Any]]:
        try:
            content = await file.read()

            file_extension = file.filename.split('.')[-1].lower()  
            if file_extension in ['xls', 'xlsx', 'xlsm']:
                excel_data = pd.read_excel(io.BytesIO(content), engine='openpyxl' if file_extension != 'xls' else 'xlrd')
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
            
            column_mapping = {col: self.clean_field_name(col) for col in excel_data.columns}
            logger.info(f"column mapping:{column_mapping}")
            excel_data.rename(columns=column_mapping, inplace=True)
            logger.info(f"Renamed Columns: {list(excel_data.columns)}")
            
            logger.info(f"Original columns: {list(column_mapping.keys())}")
            logger.info(f"Cleaned columns: {list(column_mapping.values())}")
            cleaned_data = self.clean_data(excel_data)
            records = []
            
            for record in cleaned_data.to_dict(orient="records"):
                processed_record = {}
                
                for key, value in record.items():
                    if value is None:
                        processed_record[str(key)] = None
                    elif isinstance(value, timedelta):
                        processed_record[str(key)] = value.total_seconds()
                    elif isinstance(value, datetime):
                        processed_record[str(key)] = value.replace(tzinfo=timezone.utc)
                    else:
                        processed_record[str(key)] = value

                        # to split task
                task_field = next((k for k in processed_record.keys() if k.lower() == 'task'), None)
                if task_field and isinstance(processed_record[task_field], str):
                    processed_record[task_field] = processed_record[task_field].split(',')
                current_time = datetime.utcnow().replace(tzinfo=timezone.utc)
                processed_record['upload_timestamp'] =  current_time
                processed_record['original_filename'] = file.filename
                processed_record["createdAt"]=current_time
                
                records.append(processed_record)
            
            try:
                json.dumps(records,default=str)
                logger.info("Data is JSON serializable")
            except TypeError as e:
                logger.error(f"Data serialization error: {str(e)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Data serialization error: {str(e)}"
                )
            
            return records
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error processing Excel file: {str(e)}"
            )
    async def process_file(self, file: UploadFile) -> Dict[str, Any]:
        try:
            content = await file.read()
            file_extension = file.filename.split('.')[-1].lower()  # Get the file extension

            # Determine the appropriate engine based on the file extension
            if file_extension in ['xls', 'xlsx', 'xlsm']:
                excel_data = pd.read_excel(io.BytesIO(content), engine='openpyxl' if file_extension != 'xls' else 'xlrd')
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
            cleaned_data = self.clean_data(excel_data)

            # Initialize lists to hold all tasks and descriptions
            all_tasks = []
            all_descriptions = []
            current_time = datetime.utcnow().replace(tzinfo=timezone.utc)

            estimate_id = await self._generate_estimateid()
            for index, row in cleaned_data.iterrows():
                task_number = row.get('task-#')  # Adjust the column name as necessary
                description = row.get('description')  # Adjust the column name as necessary

                if task_number:
                    all_tasks.append(task_number)
                if description:
                    all_descriptions.append(description)

            # Create a single document with all tasks and descriptions
            processed_record = {
                "estID":estimate_id,
                "task": all_tasks,
                "description": all_descriptions,
                # "probability": cleaned_data['probability'].iloc[0] if not cleaned_data['probability'].empty else None,
                "upload_timestamp": current_time,
                "original_filename": file.filename,
                "createdAt": current_time,
                "status":"Initiated"
            }

            # Log the processed record
            logger.info(f"Processed record: {processed_record}")

            return processed_record  # Return the single document

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error processing Excel file: {str(e)}"
            )
    def save_to_mongodb(self, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            result = self.collection.insert_one(data)
            return {
                "status": "success",
                "inserted_count": str(result.inserted_id),
                "message": "Data successfully saved to database"
            }
        except Exception as e:
            logger.error(f"MongoDB insertion error: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Database error: {str(e)}"
            )

    async def upload_excel(self, file: UploadFile = File(...)) -> Dict[str, Any]:
        await self.validate_excel_file(file)
        json_data = await self.process_file(file)
        result = self.save_to_mongodb(json_data)
        
        return {
            "message": "File uploaded and processed successfully",
            "filename": file.filename,
            "records_inserted": result["inserted_count"],
            "status": "success"
        }
    async def compare_estimates(self, estimate_id,file: UploadFile = File(...)) -> ComparisonResponse:
        await self.validate_excel_file(file)
        actual_data = await self.process_excel_file(file)
        logger.info(f"Actual data extracted: {len(actual_data)} records")
        estimated_data = self.estimate_collection.aggregate([
            {'$match': {'estID': estimate_id}},
            {'$project': {
                '_id': 0,
                'estID': 1,
                'estimatedManhrs': '$aggregatedTasks.totalMhs',
                'estimatedSparePartsCost': '$aggregatedTasks.totalPartsCost'
            }}
        ])
        estimated_data = list(estimated_data)
        if not estimated_data:
            logger.error(f"No estimate found with ID: {estimate_id}")
            raise HTTPException(
                status_code=404,
                detail=f"No estimate found with ID: {estimate_id}"
            )
        estimated_data = estimated_data[0]
        logger.info(f"Estimated data fetched: {len(estimated_data)} records")
        # Compare actual data with estimated data
        comparison_results = []
        for record in actual_data:
            if record.get('estid') == estimate_id:
                logger.info(f"Comparing data for record: {record}")
                comparison_results.append(ComparisonResult(
                    metric="Man-Hours",
                    estimated=str(estimated_data.get('estimatedManhrs', 0.0)),
                    actual=str(record.get('manhrs',0.0))
                ))
                comparison_results.append(ComparisonResult(
                    metric="Spare Cost",
                    estimated=str(estimated_data.get('estimatedSparePartsCost', 0.0)),
                    actual=str(record.get('sparePartsCosts',0.0))
                ))
                comparison_results.append(ComparisonResult(
                    metric="TAT Time",
                    estimated=str(estimated_data.get('estimatedTatTime', 0.0)),
                    actual=str(record.get('tatTime',0.0))
                ))
        logger.info(f"Comparison results: {comparison_results}")
        return ComparisonResponse(
            estimateID=estimate_id,
            comparisonResults=comparison_results
        )
    

    async def download_estimate_pdf(self,estimate_id: str)-> StreamingResponse:
        """
        Download estimate as PDF
        """
        logger.info(f"Fetching estimate with ID: {estimate_id}")
        task_service = TaskService()
        estimate_dict = await task_service.get_estimate_by_id(estimate_id)
        if not estimate_dict:
            raise HTTPException(status_code=404, detail="Estimate not found")
        
        estimate = DownloadResponse(**estimate_dict)

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
                        p.drawString(x, y, current_line.strip())  # Draw the current line and move down
                        y -= 15  # Move down for the next line
                        if y < 50:  # Check if we need to create a new page
                            p.showPage()
                            p.setFont("Helvetica", 12)
                            y = height - 50  # Reset y position for new page
                        current_line = word + ' '  # Start a new line with the current word

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
            y_position = draw_wrapped_text(140, y_position, f"  desc: {task.desciption}", width - 200)
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
                y_position = draw_wrapped_text(140, y_position, f"  desc: {detail.desciption}", width - 200)
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

        y_position = draw_wrapped_text(100, y_position, "aggregatedFindingsByTask:", width - 200)
        for aggregated_finding in estimate.aggregatedFindingsByTask:
            y_position = draw_wrapped_text(120, y_position, f"- taskId: {aggregated_finding.taskId}", width - 200)
            y_position = draw_wrapped_text(120, y_position, "  aggregatedMhs:", width - 200)
            y_position = draw_wrapped_text(140, y_position, f"    min: {aggregated_finding.aggregatedMhs.min}", width - 200)
            y_position = draw_wrapped_text(140, y_position, f"    max: {aggregated_finding.aggregatedMhs.max}", width - 200)
            y_position = draw_wrapped_text(140, y_position, f"    avg: {aggregated_finding.aggregatedMhs.avg}", width - 200)
            y_position = draw_wrapped_text(140, y_position, f"    est: {aggregated_finding.aggregatedMhs.est}", width - 200)
            y_position = draw_wrapped_text(120, y_position, f"  totalPartsCost: {aggregated_finding.totalPartsCost}", width - 200)

        y_position = draw_wrapped_text(100, y_position, "aggregatedFindings:", width - 200)
        y_position = draw_wrapped_text(120, y_position, f"  totalMhs: {estimate.aggregatedFindings.totalMhs}", width - 200)
        y_position = draw_wrapped_text(120, y_position, f"  totalPartsCost: {estimate.aggregatedFindings.totalPartsCost}", width - 200)

        y_position = draw_wrapped_text(100, y_position, f"createdBy: {estimate.createdBy}", width - 200)
        y_position = draw_wrapped_text(100, y_position, f"createdAt: '{estimate.createdAt.strftime('%Y-%m-%dT%H:%M:%SZ')}'", width - 200)
        y_position = draw_wrapped_text(100, y_position, f"lastUpdated: '{estimate.lastUpdated.strftime('%Y-%m-%dT%H:%M:%SZ')}'", width - 200)

        p.showPage()
        p.save()

        # Move the buffer position to the beginning
        buffer.seek(0)

        # Create a StreamingResponse with the PDF content
        logger.info("Creating PDF response")
        response = StreamingResponse(buffer, media_type="application/pdf")
        response.headers["Content-Disposition"] = f"attachment; filename={estimate_id}.pdf"
        return response
    async def _generate_estimateid(self) -> str:
        logger.info("Generating estimate ID")
        try:
            logger.info("Finding count of estimates")
            count = self.collection.count_documents({})  # Await count
            logger.info(f"Count of estimates: {count}")

            if count == 0:
                logger.info("No estimates found, starting with EST-001")
                return "EST-001"

        # Fetch the last inserted estimate
            last_estimate = self.collection.find_one(
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
    