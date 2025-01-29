from motor.motor_asyncio import AsyncIOMotorClient
import os
import pandas as pd

# Step 1: Establish Database Connection
async def connect_to_database(db_name="gmr-mro-test"):
    """
    Connect to MongoDB, create database if it does not exist, and return the database object.
    """
    try:
        client = AsyncIOMotorClient("mongodb://admin:Tride%401234@telematics-mongo1.evrides.in:22022,telematics-mongo2.evrides.in:22022,telematics-mongo3.evrides.in:22022/?authSource=admin&replicaSet=trideRepl")
        existing_dbs = await client.list_database_names()

        if db_name not in existing_dbs:
            db = client[db_name]
            placeholder_collection = db["placeholder"]
            await placeholder_collection.insert_one({"placeholder": True})
            print(f"Database '{db_name}' created with a placeholder collection.")
        else:
            db = client[db_name]
            print(f"Database '{db_name}' already exists.")

        await client.admin.command('ping')
        print(f"Connected to database: {db_name}")
        return db
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        return None

# Step 2: File Processing and Data Extraction
async def get_processed_files(data_path, task_description_initial_name, task_parts_initial_name, sub_task_description_initial_name, sub_task_parts_initial_name):
    """
    Extract and combine data from Excel files into dataframes.
    """
    try:
        def read_and_process_file(file_path, sheet_name, folder_name):
            """Utility to read and process an individual Excel file."""
            df = pd.read_excel(file_path, engine='openpyxl', sheet_name=sheet_name)
            df.columns = df.iloc[0].astype(str).str.replace('.', '', regex=False)
            df = df[1:].reset_index(drop=True)
            df['Folder_Name'] = folder_name
            return df

        def collect_files_by_prefix(prefix, sheet_name):
            """Utility to collect and process files by prefix."""
            collected_data = []
            for root, dirs, files in os.walk(data_path):
                for file in files:
                    if file.startswith(prefix):
                        file_path = os.path.join(root, file)
                        folder_name = os.path.basename(root)
                        print(f"Reading file: {file_path}")
                        collected_data.append(read_and_process_file(file_path, sheet_name, folder_name))
            return pd.concat(collected_data, ignore_index=True) if collected_data else pd.DataFrame()

        # Collecting data
        aircraft_details = pd.read_excel(os.path.join(data_path, "AIRCRAFT DETAILS-2024.xlsx"))
        task_description = collect_files_by_prefix(task_description_initial_name, 'mltaskmlsec1')
        task_parts = collect_files_by_prefix(task_parts_initial_name, 'mlttable')
        sub_task_description = collect_files_by_prefix(sub_task_description_initial_name, 'mldpmlsec1')
        sub_task_parts = collect_files_by_prefix(sub_task_parts_initial_name, 'PRICING')

        return aircraft_details, task_description, task_parts, sub_task_description, sub_task_parts
    except Exception as e:
        print(f"Error fetching processed files: {e}")
        return pd.DataFrame(), pd.DataFrame(), pd.DataFrame(), pd.DataFrame(), pd.DataFrame()