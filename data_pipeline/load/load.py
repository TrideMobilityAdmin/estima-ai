from prefect import task, get_run_logger
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Dict, List
import pandas as pd
import json
from datetime import timedelta, datetime
from bson import ObjectId, json_util


def serialize(obj):
    """
    Serializes objects to be JSON-compatible.

    Args:
        obj: The object to serialize.

    Returns:
        Serialized object.

    Raises:
        TypeError: If the object type is not serializable.
    """
    if isinstance(obj, (int, float, str, bool, type(None))):
        return obj
    elif isinstance(obj, timedelta):
        return obj.total_seconds()
    elif isinstance(obj, dict):
        return {key: serialize(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [serialize(value) for value in obj]
    elif isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, pd.Timestamp):  # Add explicit handling for pandas Timestamp
        return obj.isoformat()
    elif isinstance(obj, ObjectId):  # Add handling for MongoDB ObjectId
        return str(obj)
    elif isinstance(obj, (int, float, str, list, dict, type(None))):
        return obj
    else:
        # Instead of raising an error, convert to string representation
        return str(obj)


@task(retries=3, cache_key_fn=None)
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
        
        # Convert DataFrame to records and serialize
        records = data.to_dict(orient="records")
        logger.info(f"Preparing to insert {len(records)} records into {collection_name}")
        
        # Serialize the records using our custom serializer
        serialized_records = [serialize(record) for record in records]
        
        # Verify serialization worked
        try:
            # Use json_util for the final verification to handle MongoDB-specific types
            json_util.dumps(serialized_records)
        except TypeError as e:
            logger.error(f"Data serialization error: {str(e)}")
            raise
        
        # Insert serialized data
        result = await db[collection_name].insert_many(serialized_records)
        logger.info(f"Successfully inserted {len(result.inserted_ids)} documents into {collection_name}")
    
    except Exception as e:
        logger.error(f"Failed to load data into {collection_name}: {str(e)}")
        raise


@task(cache_key_fn=None)
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