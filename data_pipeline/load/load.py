from prefect import task
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Dict, List
import pandas as pd
import json
from prefect import get_run_logger
from datetime import timedelta

@task(retries=3)
async def load_to_mongodb(
    db: AsyncIOMotorClient,
    collection_name: str,
    data: pd.DataFrame
) -> None:
    """
    Loads data into MongoDB collection.
    
    Args:
        db: Database connection
        collection_name: Name of the collection to load data into
        data: DataFrame containing the data to load
    """
    logger = get_run_logger()
    
    try:
        if data.empty:
            logger.warning(f"No data to load for collection {collection_name}")
            return
        
        # Convert DataFrame to records
        records = data.to_dict(orient="records")
        logger.info(f"Preparing to insert {len(records)} records into {collection_name}")
        
        # Handle special data types
        for record in records:
            for key, value in record.items():
                if isinstance(value, timedelta):
                    record[key] = value.total_seconds()
        
        # Verify data is serializable
        try:
            json.dumps(records)
        except TypeError as e:
            logger.error(f"Data serialization error: {str(e)}")
            raise
        
        # Insert data
        result = await db[collection_name].insert_many(records)
        logger.info(f"Successfully inserted {len(result.inserted_ids)} documents into {collection_name}")
    
    except Exception as e:
        logger.error(f"Failed to load data into {collection_name}: {str(e)}")
        raise

@task
async def load_all_data(
    db: AsyncIOMotorClient,
    transformed_data: Dict[str, pd.DataFrame]
) -> None:
    """
    Loads all transformed data into MongoDB.
    
    Args:
        db: Database connection
        transformed_data: Dictionary of transformed DataFrames
    """
    logger = get_run_logger()
    
    try:
        for collection_name, data in transformed_data.items():
            await load_to_mongodb(db, collection_name, data)
        logger.info("Successfully loaded all data into MongoDB")
    
    except Exception as e:
        logger.error(f"Error in load_all_data: {str(e)}")
        raise