from fastapi import FastAPI, File, UploadFile, HTTPException
from typing import List, Dict, Any
import pandas as pd
import numpy as np
import json
import re
from app.models.estimates import ComparisonResponse,ComparisonResult
from app.log.logs import logger
from datetime import datetime, timedelta,timezone
import io
from app.db.database_connection import MongoDBClient

class ExcelUploadService:
    def __init__(self):
        self.mongo_client = MongoDBClient()
        self.collection = self.mongo_client.get_collection("estima_input_upload")
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
            
        if not file.filename.endswith(('.xls', '.xlsx', '.xlsm')):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Only .xls, .xlsx, and .xlsm files are allowed"
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
            excel_data = pd.read_excel(io.BytesIO(content))
            
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

    def save_to_mongodb(self, data: List[Dict[Any, Any]]) -> Dict[str, Any]:
        try:
            result = self.collection.insert_many(data)
            return {
                "status": "success",
                "inserted_count": len(result.inserted_ids),
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
        json_data = await self.process_excel_file(file)
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
    

    
        
       