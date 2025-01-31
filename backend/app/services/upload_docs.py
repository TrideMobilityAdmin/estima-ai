from fastapi import FastAPI, File, UploadFile, HTTPException
from typing import List, Dict, Any
import pandas as pd
import numpy as np
import json
from app.log.logs import logger
from datetime import datetime, timedelta,timezone
import io
from app.db.database_connection import MongoDBClient

class ExcelUploadService:
    def __init__(self):
        self.mongo_client = MongoDBClient()
        self.collection = self.mongo_client.get_collection("estima_input_upload")
    
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
            # print(f"After removing duplicates. Shape: {cleaned_data.shape}")
            
            for column in cleaned_data.columns:
                if cleaned_data[column].dtype == 'timedelta64[ns]':
                    logger.info(f"Converting timedelta column: {column}")
                    cleaned_data[column] = cleaned_data[column].dt.total_seconds()
                
                elif cleaned_data[column].dtype == 'datetime64[ns]':
                    logger.info(f"Converting datetime column: {column}")
                    cleaned_data[column] = cleaned_data[column].dt.strftime('%Y-%m-%dT%H:%M:%S')
                
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
                        processed_record[str(key)] = value.isoformat()
                    else:
                        processed_record[str(key)] = value

                        # to split task
                if 'Task' in processed_record and isinstance(processed_record['Task'], str):
                    processed_record['Task'] = processed_record['Task'].split(',')
                
                processed_record['upload_timestamp'] =  datetime.now(timezone.utc).isoformat(timespec='milliseconds')
                processed_record['original_filename'] = file.filename
                
                records.append(processed_record)
            
            try:
                json.dumps(records)
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