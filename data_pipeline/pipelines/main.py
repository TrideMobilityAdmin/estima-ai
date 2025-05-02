import sys
import os
import asyncio
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from extract.extract import connect_to_database, get_processed_files
from transform.transform import clean_data
from load.load import append_to_database
import os

import yaml
from pathlib import Path
from logs.Log_config import setup_logging

# Initialize logger
logger = setup_logging()

# `cwd`: current directory is straightforward
cwd = Path.cwd()
dir = os.path.dirname(__file__)

# Load config.yaml
def load_config(config_path='D:/Projects/gmr-mro/estima-ai/data_pipeline/config.yaml'):
    """Load configuration from YAML file."""
    with open(config_path, "r") as file:
        return yaml.safe_load(file)
# Load config.yaml
def load_config(config_path='D:/Projects/gmr-mro/estima-ai/data_pipeline/config.yaml'):
    """Load configuration from YAML file."""
    with open(config_path, "r") as file:
        return yaml.safe_load(file)

async def update_processed_files_db(db, newly_processed_files):
    """Update the database with newly processed files."""
    if not newly_processed_files:
        return
        
    try:
        operations = [{"file_path": file} for file in newly_processed_files]
        if operations:
            result = await db["processed_file_paths"].insert_many(operations)
            print(f"Added {len(operations)} new files to processed_file_paths collection")
            logger.info(f"Added {len(operations)} new files to processed_file_paths collection")
            return True
    except Exception as e:
        print(f"Error updating processed files database: {e}")
        logger.error(f"Error updating processed files database: {e}")
        return False

async def process_collection(db, collection_name, dataframe):
    """Process a single collection's data."""
    if dataframe.empty:
        print(f"Skipping {collection_name}: Empty dataframe")
        return False
        
    try:
        processed_data = clean_data(dataframe)
        if processed_data.empty:
            print(f"Skipping {collection_name}: No data after cleaning")
            return False
            
        await append_to_database(db[collection_name], processed_data)
        print(f"Successfully processed {collection_name}")
        logger.info(f"Successfully processed {collection_name}")
        return True
    except Exception as e:
        print(f"Error processing {collection_name}: {e}")
        logger.error(f"Error processing {collection_name}: {e}")
        return False
    
async def main():
    """
    Main execution function to manage the data pipeline.
    """
    try:
        print("Starting main process...")
        # Load configuration
        config = load_config()
        db_uri = config["database"]["uri"]
        db_name = config["database"]["database"]
        db = await connect_to_database(db_uri, db_name)
        if db is None:
            print("Failed to connect to database")
            logger.error("Failed to connect to database")
            return
        processed_files_cursor = db["processed_file_paths"].find({})
        processed_file_paths = set([file_path["file_path"] for file_path in processed_files_cursor])
    
        

        #data_path = os.path.join(dir,"..","..", "Data")
        data_path=r"D:\Projects\gmr-mro\estima-ai\Data"
        aircraft_details, task_description, task_parts, sub_task_description, sub_task_parts,newly_processed_files= await get_processed_files(processed_file_paths,data_path,"AIRCRAFT", "mltaskmlsec1", "mlttable", "mldpmlsec1", "Material"
        )
        if newly_processed_files:
            operations = [{"file_path": file} for file in newly_processed_files]
            if operations:
                await db["processed_file_paths"].insert_many(operations)
                print(f"Added {len(operations)} new files to processed_file_paths collection")

        collections_to_process = [
            ("aircraft_details", aircraft_details),
            ("task_description", task_description),
            ("task_parts", task_parts),
            ("sub_task_description", sub_task_description),
            ("sub_task_parts", sub_task_parts)
        ]

        for collection_name, dataframe in collections_to_process:
            if not dataframe.empty:
                try:
                    processed_data = clean_data(dataframe)
                    await append_to_database(db[collection_name], processed_data)
                except Exception as collection_error:
                    print(f"Error processing {collection_name}: {collection_error}")

        print("Process completed")
        logger.info("Process completed")
    except Exception as e:
        print(f"Unexpected error in main: {e}")
        logger.error(f"Unexpected error in main: {e}")

if __name__ == "__main__":
    asyncio.run(main())
