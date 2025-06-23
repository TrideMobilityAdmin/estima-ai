import sys
import os
import asyncio
from pathlib import Path

# Add parent directory to path for relative imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from email_service.email_service import send_email
from extract.extract import connect_to_database, get_processed_files
from transform.transform import clean_data
from load.load import append_to_database
import yaml
from logs.Log_config import setup_logging
import pandas as pd
import warnings
import datetime as dt
# Suppress FutureWarning to keep logs clean
warnings.simplefilter(action='ignore', category=FutureWarning)
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
            config_path = '/home/estimaai/estima-ai/data_pipeline/config.yaml'
            
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

def update_processed_files_db(db, newly_processed_files, successfully_processed=None):
    """Update the database with newly processed files.

    Args:
        db: Database connection
        newly_processed_files: Iterable of files that were newly processed
        successfully_processed: Optional iterable of files that were successfully processed
    """
    if not newly_processed_files:
        return

    try:
        # Convert to sets for set operations
        newly_processed_files_set = set(newly_processed_files)
        successfully_processed_set = set(successfully_processed) if successfully_processed is not None else None

        files_to_mark = newly_processed_files_set
        if successfully_processed_set is not None:
            files_to_mark = newly_processed_files_set.intersection(successfully_processed_set)

        if not files_to_mark:
            print("No files to mark as processed")
            return False

        operations = []
        for file in files_to_mark:
            try:
                stat = os.stat(file)
                operations.append({
                    "file_path": file,
                    "modified_time": stat.st_mtime,  # Unix timestamp
                    "size": stat.st_size  # in bytes
                })
            except FileNotFoundError:
                print(f"⚠️ File not found: {file}")
        if operations:
            result = db["processed_file_paths"].insert_many(operations)
            num_added = len(result.inserted_ids)
            print(f"✅ Added {num_added} new files to processed_file_paths collection")
            logger.info(f"Added {num_added} new files to processed_file_paths collection")

            if successfully_processed_set is not None and len(files_to_mark) < len(newly_processed_files_set):
                not_processed = newly_processed_files_set - successfully_processed_set
                logger.warning(f"⚠️ Some files were not successfully processed: {not_processed}")

            return True

    except Exception as e:
        print(f"❌ Error updating processed files database: {e}")
        logger.error(f"Error updating processed files database: {e}")
        return False


def process_collection(db, collection_name, dataframe, updated_files=None):
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
                        delete_result =  db[collection_name].delete_many({"file_path": {"$in": updated_for_collection}})
                        print(f"Deleted {delete_result.deleted_count} old records for updated files")
                    except Exception as delete_error:
                        logger.error(f"Error deleting old data: {delete_error}")
        
        # Insert into database
        inserted_count =  append_to_database(db[collection_name], processed_data)
        
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
def update_lh_rh_tasks(task):
    """
    Convert LH/RH suffix to a standardized format.
    
    Args:
        task: String containing task number/name
        
    Returns:
        String with standardized LH/RH format
    """
    if not isinstance(task, str):
        return task
    task = task.strip()
    if task.endswith(" LH") or task.endswith("_LH"):
        return task[:-3] + " (LH)"
    elif task.endswith("LH"):
        return task[:-2] + " (LH)"
    elif task.endswith(" RH") or task.endswith("_RH"):
        return task[:-3] + " (RH)"
    elif task.endswith("RH"):
        return task[:-2] + " (RH)"
    else:
        return task

def remove_outliers(df, column_name, threshold=500):
    """
    Remove outliers from a dataframe based on a threshold value.
    
    Args:
        df: Pandas DataFrame
        column_name: Column to check for outliers
        threshold: Maximum value to keep (values above will be filtered out)
        
    Returns:
        DataFrame with outliers removed
    """
    if column_name not in df.columns:
        raise ValueError(f"Column '{column_name}' not found in dataframe")
    
    return df[df[column_name].between(0, threshold)].copy()

def convert_task_numbers_format(df, task_number_columns=["task_number","source_task_discrepancy_number_updated"]):
    """
    Apply LH/RH formatting to task numbers in a dataframe.
    
    Args:
        df: Pandas DataFrame
        task_number_column: Column containing task numbers
        
    Returns:
        DataFrame with updated task numbers
    """
    
    for  task_number_column  in task_number_columns:
        if task_number_column  in df.columns:
            result_df = df.copy()
            result_df[task_number_column] = result_df[task_number_column].apply(update_lh_rh_tasks)
            return result_df

def outlier_removal_and_lhrh_conversion(task_description, task_parts, sub_task_description, sub_task_parts, 
                                       manhour_column="actual_man_hours", task_columns=["task_number","source_task_discrepancy_number_updated"], 
                                       threshold=500):
    """
    Perform outlier removal and LHRH conversion on the provided dataframes.
    
    Args:
        task_description: DataFrame containing task descriptions
        task_parts: DataFrame containing task parts
        sub_task_description: DataFrame containing sub-task descriptions
        sub_task_parts: DataFrame containing sub-task parts
        manhour_column: Column name for manhours data
        task_column: Column name for task number data
        threshold: Maximum manhour value to keep
        
    Returns:
        Tuple of processed DataFrames:
        (task_description_processed, task_parts_processed, 
         sub_task_description_processed, sub_task_parts_processed)
    """
    if not task_description.empty: 
        # Process task description - remove outliers and convert task format
        task_description_processed = remove_outliers(task_description, manhour_column, threshold)
        task_description_processed = convert_task_numbers_format(task_description_processed, task_columns)
    else:
        task_description_processed = pd.DataFrame()
    if not task_parts.empty : 
        # Process task parts - just convert task format
        task_parts_processed = convert_task_numbers_format(task_parts, task_columns)
    else:
        task_parts_processed = pd.DataFrame()
    if not sub_task_description.empty:
        # Process sub-task description - remove outliers and convert task format
        sub_task_description_processed = remove_outliers(sub_task_description, manhour_column, threshold)
        sub_task_description_processed = convert_task_numbers_format(sub_task_description_processed, task_columns)
    else:
        sub_task_description_processed = pd.DataFrame()
        
    if not sub_task_parts.empty:
    
        # Process sub-task parts - just convert task format
        sub_task_parts_processed = convert_task_numbers_format(sub_task_parts, task_columns)
    else:
        sub_task_parts_processed = pd.DataFrame()
    
    # Return the processed dataframes
    return (task_description_processed, task_parts_processed, 
            sub_task_description_processed, sub_task_parts_processed)
def update_part_master_data(db, parts_collection_name="sub_task_parts_lhrh"):
    sub_task_parts = db[parts_collection_name]
    sub_task_parts = list(sub_task_parts.find({}))
    sub_task_parts = pd.DataFrame(sub_task_parts)

    if sub_task_parts.empty:
        print("No data found in the parts collection.")
        if logger:
            logger.warning("No data found in the parts collection.")
        return

    # Group and aggregate
    parts_master = sub_task_parts.groupby("issued_part_number").agg({
        "part_description": "first",
        "issued_unit_of_measurement": "first",
        "freight_cost": "max",
        "admin_charges": "max",
        "base_price_usd": "max"
    })
    parts_master.rename(columns={"freight_cost": "agg_freight_cost",
                                 "admin_charges": "agg_admin_charges",
                                 "base_price_usd": "agg_base_price_usd"}, inplace=True)

    # Save to collection
    parts_master_collection = db["parts_master"]
    parts_master_collection.delete_many({})  # Clear existing data

    if not parts_master.empty:
        parts_master.reset_index(inplace=True)
        parts_master_collection.insert_many(parts_master.to_dict("records"))
        print(f"Updated parts master with {len(parts_master)} records")
        if logger:
            logger.info(f"Updated parts master with {len(parts_master)} records")
    
    
    
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
        db =  connect_to_database(db_uri, db_name)
        if db is None:
            print("Failed to connect to database")
            logger.error("Failed to connect to database")
            return
  
        # Get processed file paths with their modification timestamps
        processed_files_cursor = db["processed_file_paths"].find({})
        processed_file_paths = set()
        file_info_map = {}
        
        for doc in processed_files_cursor:
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
        #data_path = os.path.join(current_dir, '..', '..', 'Data')
        
        # Fallback to absolute path if directory doesn't exist
        #if not os.path.exists(data_path):
        #data_path = r"D:\Projects\gmr-mro\Data_Pipeline\Data"
        #data_path=config["excel_files"]["data_path"] 
        data_path = r"D:\Projects\gmr-mro\test_data_pipeline"
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
        files_to_process = set(files_to_process).union(set(updated_files))
        error_message = f"No files to process at {dt.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"

        if len(files_to_process)>0:
            error_message=f"Found issues in the following files while  processing at {dt.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}."

            aircraft_details, task_description, task_parts, sub_task_description, sub_task_parts, newly_processed_files,error_message =  get_processed_files(
                files_to_process,  
                error_message
            )
            
            task_description_max500mh_lhrh, task_parts_lhrh, sub_task_description_max500mh_lhrh, sub_task_parts_lhrh = outlier_removal_and_lhrh_conversion(
                task_description, 
                task_parts, 
                sub_task_description, 
                sub_task_parts
            )
            # Process all collections and track successful file processing
            collections_to_process = [
                ("aircraft_details", aircraft_details),
                ("task_description", task_description),
                ("task_parts", task_parts),
                ("sub_task_description", sub_task_description),
                ("sub_task_parts", sub_task_parts),
                ("task_description_max500mh_lhrh", task_description_max500mh_lhrh),
                ("task_parts_lhrh", task_parts_lhrh),
                ("sub_task_description_max500mh_lhrh", sub_task_description_max500mh_lhrh),
                ("sub_task_parts_lhrh", sub_task_parts_lhrh)
            ]
            
            # Keep track of which files were successfully processed 
            successfully_processed_files = set()
            
            for collection_name, dataframe in collections_to_process:
                if not dataframe.empty:
                    # Get the file paths in this dataframe
                    if "file_path" in dataframe.columns:
                        collection_files = set(dataframe["file_path"].unique())
                        
                        # Process this collection (pass updated_files to handle properly)
                        success =  process_collection(db, collection_name, dataframe, updated_files)
                        
                        if success:
                            # Add successfully processed files to our tracking set
                            successfully_processed_files.update(collection_files)
                    else:
                        logger.warning(f"No 'file_path' column in {collection_name} dataframe")
                        process_collection(db, collection_name, dataframe)
            
            # Add newly processed files AND updated files to track all changes
            all_processed_files = set().union(newly_processed_files, updated_files)
            
            # Only update entries for files that were successfully loaded
            update_processed_files_db(db, file_info_dict, successfully_processed_files)
            update_part_master_data(db, "sub_task_parts_lhrh")
            
        print("Process completed")
        logger.info("Process completed")
        body = error_message
        receiver_email = "niraja_adithya_dasireddi@outlook.com"
        send_email("Data Pipeline Failed Files Report", body, receiver_email)
        #print(f"Email is successfully sent to the {receiver_email}")
        
    except Exception as e:
        print(f"Unexpected error in main: {e}")
        logger.error(f"Unexpected error in main: {e}")




if __name__ == "__main__":
    asyncio.run(main())