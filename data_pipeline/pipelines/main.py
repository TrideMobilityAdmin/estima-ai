import sys
import os
import asyncio
from pathlib import Path

# Add parent directory to path for relative imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from extract.extract import connect_to_database, get_processed_files
from transform.transform import clean_data
from load.load import append_to_database
import yaml
from logs.Log_config import setup_logging

# Initialize logger
logger = setup_logging()

def load_config(config_path=None):
    """Load configuration from YAML file."""
    if config_path is None:
        # Try to find config relative to the current file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(current_dir, '..', 'config.yaml')
        
        # If not found, try alternate location
        if not os.path.exists(config_path):
            config_path = 'D:/Projects/gmr-mro/estima-ai/data_pipeline/config.yaml'
            
    with open(config_path, "r") as file:
        return yaml.safe_load(file)

def get_file_info(file_path):
    """Get file information including last modified timestamp."""
    try:
        stat_info = os.stat(file_path)
        return {
            "file_path": file_path,
            "modified_time": stat_info.st_mtime,  # Last modified timestamp
            "size": stat_info.st_size,           # File size
        }
    except Exception as e:
        logger.error(f"Error getting file info for {file_path}: {e}")
        return {
            "file_path": file_path,
            "modified_time": 0,
            "size": 0
        }

async def update_processed_files_db(db, newly_processed_files, successfully_processed=None):
    """Update the database with newly processed files.
    
    Args:
        db: Database connection
        newly_processed_files: Set of files that were newly processed
        successfully_processed: Optional set of files that were successfully processed
                               If provided, only mark files that were also successfully processed
    """
    if not newly_processed_files:
        return
        
    try:
        # If successfully_processed is provided, only mark files that were actually processed
        files_to_mark = newly_processed_files
        if successfully_processed is not None:
            files_to_mark = newly_processed_files.intersection(successfully_processed)
            
        if not files_to_mark:
            print("No files to mark as processed")
            return False
            
        operations = [{"file_path": file} for file in files_to_mark]
        if operations:
            result = await db["processed_file_paths"].insert_many(operations)
            num_added = len(result.inserted_ids)
            print(f"Added {num_added} new files to processed_file_paths collection")
            logger.info(f"Added {num_added} new files to processed_file_paths collection")
            
            # Log files that couldn't be processed if there's a discrepancy
            if successfully_processed is not None and len(files_to_mark) < len(newly_processed_files):
                not_processed = newly_processed_files - successfully_processed
                logger.warning(f"Some files were not successfully processed: {not_processed}")
                
            return True
    except Exception as e:
        print(f"Error updating processed files database: {e}")
        logger.error(f"Error updating processed files database: {e}")
        return False

async def process_collection(db, collection_name, dataframe, updated_files=None):
    """Process a single collection's data.
    
    Args:
        db: Database connection
        collection_name: Name of collection to process
        dataframe: Data to process
        updated_files: Optional set of files that were updated (not new)
    
    Returns:
        bool: True if processing succeeded, False otherwise
    """
    if dataframe.empty:
        print(f"Skipping {collection_name}: Empty dataframe")
        return False
        
    try:
        # Clean the data
        processed_data = clean_data(dataframe)
        if processed_data.empty:
            print(f"Skipping {collection_name}: No data after cleaning")
            return False
        
        # Check for existence of data with the same file_path
        file_paths = []
        if "file_path" in processed_data.columns:
            file_paths = processed_data["file_path"].unique()
            print(f"Processing {len(file_paths)} unique files for {collection_name}")
            
            # Count how many records we're adding
            record_count = len(processed_data)
            print(f"Adding {record_count} records to {collection_name}")
            
            # If we have updated files, delete their old data first
            if updated_files:
                updated_for_collection = [fp for fp in file_paths if fp in updated_files]
                if updated_for_collection:
                    print(f"Removing old data for {len(updated_for_collection)} updated files in {collection_name}")
                    try:
                        delete_result = await db[collection_name].delete_many({"file_path": {"$in": updated_for_collection}})
                        print(f"Deleted {delete_result.deleted_count} old records for updated files")
                    except Exception as delete_error:
                        logger.error(f"Error deleting old data: {delete_error}")
        
        # Insert into database
        inserted_count = await append_to_database(db[collection_name], processed_data)
        
        if inserted_count is not None and inserted_count > 0:
            print(f"Successfully processed {collection_name}: {inserted_count} records inserted")
            logger.info(f"Successfully processed {collection_name}: {inserted_count} records inserted")
            return True
        else:
            print(f"No records inserted for {collection_name}")
            logger.warning(f"No records inserted for {collection_name}")
            return False
            
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
        
        # Connect to database
        db = await connect_to_database(db_uri, db_name)
        if db is None:
            print("Failed to connect to database")
            logger.error("Failed to connect to database")
            return
            
        # Get processed file paths with their modification timestamps
        processed_files_cursor = db["processed_file_paths"].find({})
        processed_file_paths = set()
        file_info_map = {}
        
        async for doc in processed_files_cursor:
            file_path = doc["file_path"]
            processed_file_paths.add(file_path)
            # Store timestamp information for later comparison
            file_info_map[file_path] = {
                "db_modified_time": doc.get("modified_time", 0),
                "db_size": doc.get("size", 0),
                "db_id": doc.get("_id")
            }
        
        # Determine data path - try relative path first, then fallback to absolute
        current_dir = os.path.dirname(os.path.abspath(__file__))
        data_path = os.path.join(current_dir, '..', '..', 'Data')
        
        # Fallback to absolute path if directory doesn't exist
        if not os.path.exists(data_path):
            data_path = r"D:\Projects\gmr-mro\estima-ai\Data"
        
        # Prepare to track files that need updating (modified since last processed)
        files_to_process = set()
        updated_files = set()  # Track files that are updates (not new)
        file_info_dict = {}
        
        # Find all relevant files and check if they need processing
        for root, _, files in os.walk(data_path):
            for file in files:
                if any(file.startswith(prefix) for prefix in ["AIRCRAFT", "mltaskmlsec1", "mlttable", "mldpmlsec1", "Material"]):
                    file_path = os.path.join(root, file)
                    file_info = get_file_info(file_path)
                    
                    # Check if file exists in processed_file_paths
                    if file_path in processed_file_paths:
                        # Check if file was modified since last processed
                        db_info = file_info_map.get(file_path, {})
                        db_modified_time = db_info.get("db_modified_time", 0)
                        db_size = db_info.get("db_size", 0)
                        
                        # If file was modified or size changed, process it again
                        if file_info["modified_time"] > db_modified_time or file_info["size"] != db_size:
                            files_to_process.add(file_path)
                            updated_files.add(file_path)
                            print(f"File modified since last process: {file_path}")
                            
                            # Mark file as existing in DB for update operation
                            file_info["exists_in_db"] = True
                            file_info["db_id"] = db_info.get("db_id")
                    else:
                        # New file, process it
                        files_to_process.add(file_path)
                        file_info["exists_in_db"] = False
                    
                    # Store file info for all files we're tracking
                    file_info_dict[file_path] = file_info
        
        print(f"Found {len(files_to_process)} files to process ({len(updated_files)} updates, {len(files_to_process) - len(updated_files)} new)")
        
        # Extract data from files - note: we're passing processed_file_paths which doesn't include updated files
        # This is intentional because we want get_processed_files to reprocess the updated files
        aircraft_details, task_description, task_parts, sub_task_description, sub_task_parts, newly_processed_files = await get_processed_files(
            processed_file_paths - updated_files,  # Exclude updated files so they get reprocessed
            data_path,
            "AIRCRAFT", 
            "mltaskmlsec1", 
            "mlttable", 
            "mldpmlsec1", 
            "Material"
        )
        
        # Process all collections and track successful file processing
        collections_to_process = [
            ("aircraft_details", aircraft_details),
            ("task_description", task_description),
            ("task_parts", task_parts),
            ("sub_task_description", sub_task_description),
            ("sub_task_parts", sub_task_parts)
        ]
        
        # Keep track of which files were successfully processed 
        successfully_processed_files = set()
        
        for collection_name, dataframe in collections_to_process:
            if not dataframe.empty:
                # Get the file paths in this dataframe
                if "file_path" in dataframe.columns:
                    collection_files = set(dataframe["file_path"].unique())
                    
                    # Process this collection (pass updated_files to handle properly)
                    success = await process_collection(db, collection_name, dataframe, updated_files)
                    
                    if success:
                        # Add successfully processed files to our tracking set
                        successfully_processed_files.update(collection_files)
                else:
                    logger.warning(f"No 'file_path' column in {collection_name} dataframe")
                    await process_collection(db, collection_name, dataframe)
        
        # Add newly processed files AND updated files to track all changes
        all_processed_files = set().union(newly_processed_files, updated_files)
        
        # Only update entries for files that were successfully loaded
        await update_processed_files_db(db, file_info_dict, successfully_processed_files)

        print("Process completed")
        logger.info("Process completed")
    except Exception as e:
        print(f"Unexpected error in main: {e}")
        logger.error(f"Unexpected error in main: {e}")

if __name__ == "__main__":
    asyncio.run(main())