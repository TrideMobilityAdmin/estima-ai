from app.models.task_models import CappingData
from statistics import mean
from fastapi import HTTPException,Depends,status
from app.log.logs import logger
from typing import List , Dict,Optional
import pandas as pd
from app.middleware.auth import get_current_user
from typing import List
from datetime import datetime
from fastapi import UploadFile, File
from bson import ObjectId
from datetime import datetime,timezone
from app.models.estimates import ConfigurationsResponse
from app.db.database_connection import MongoDBClient
class ConfigurationService:
    def __init__(self):
        self.mongo_client = MongoDBClient()
        self.configurations_collection=self.mongo_client.get_collection("configurations")
        self.capping_data_collection=self.mongo_client.get_collection("capping_data")
    async def get_all_configurations(self) -> ConfigurationsResponse:
        """
        Get all configurations from the database
        """
        logger.info("Fetching all configurations")

        try:
            configurations_cursor = self.configurations_collection.find()

            ConfigurationsResponse = []
            for config in configurations_cursor:
                ConfigurationsResponse.append(config)
            logger.info(f"Found {len(ConfigurationsResponse)} configurations")
            return ConfigurationsResponse

        except Exception as e:
            logger.error(f"Error fetching configurations: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error fetching configurations: {str(e)}"
            )   
    async def create_configurations(self,config_req:ConfigurationsResponse) -> ConfigurationsResponse:
        """
        Create configurations in the database
        """
        logger.info("Creating configurations")
        try:
            # Convert the Pydantic model to a dictionary
            config_dict = config_req.dict(by_alias=True, exclude={"id"}) 
            result = self.configurations_collection.insert_one(config_dict)
            logger.info(f"Created configuration with ID: {result.inserted_id}")
            config_dict["_id"] = str(result.inserted_id)
            logger.info(f"Created configuration with ID: {result.inserted_id}")
            return ConfigurationsResponse(**config_dict)
            
        except Exception as e:
            logger.error(f"Error creating configurations: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error creating configurations: {str(e)}"
            )
        
    async def update_configurations(self,config_id: str,config_req:ConfigurationsResponse) -> ConfigurationsResponse:
        """
        Update configurations in the database
        """
        logger.info(f"Updating configuration with ID: {config_id}")
        try:
            # Convert the Pydantic model to a dictionary
            if not ObjectId.is_valid(config_id):
                raise HTTPException(status_code=400, detail="Invalid ObjectId format")
            config_dict = config_req.dict(by_alias=True, exclude={"id"})
            result = self.configurations_collection.update_one({"_id":ObjectId(config_id)},{"$set":config_dict})
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail=f"Configuration with ID {config_id} not found")
            logger.info(f"Updated configuration with ID: {config_id}")
            updated_config = self.configurations_collection.find_one({"_id": ObjectId(config_id)})
            return ConfigurationsResponse(**updated_config) if updated_config else None

        except Exception as e:
            logger.error(f"Error updating configurations: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error updating configurations: {str(e)}")
    
    async def get_all_capping_data(self) -> CappingData:
        """
        Get all capping_data from the database
        """
        logger.info("Fetching all capping_data")

        try:
            capping_cursor = self.capping_data_collection.find()

            CappingData = []
            for capping in capping_cursor:
                CappingData.append(capping)
            logger.info(f"Found {len(CappingData)} capping_data")
            return CappingData

        except Exception as e:
            logger.error(f"Error fetching capping_data: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error fetching capping_data: {str(e)}"
            ) 
        