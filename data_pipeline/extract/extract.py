from motor.motor_asyncio import AsyncIOMotorClient
import os
import pandas as pd
import yaml
from logs.Log_config import setup_logging

# Initialize logger
logger = setup_logging()

# Load config.yaml
def load_config(config_path='D:/Projects/gmr-mro/estima-ai/data_pipeline/config.yaml'):
    """Load configuration from YAML file."""
    with open(config_path, "r") as file:
        return yaml.safe_load(file)

# Step 1: Establish Database Connection
async def connect_to_database(db_uri, db_name):
    """
    Connect to MongoDB asynchronously and return the database object.
    """
    try:
        client = AsyncIOMotorClient(db_uri)
        db = client[db_name]  # Get database reference
        await client.admin.command("ping")  # Check connection
        print(f"✅ Connected to database: {db_name}")
        return db
    except Exception as e:
        print(f"❌ Error connecting to MongoDB: {e}")
        logger.error(f"Error connecting to MongoDB: {e}")
        return None
    
def detect_header_row(df, max_rows=3):
    """
    Detects the correct header row by finding the row with the most non-null values.
    """
    max_non_nulls = 0
    header_row_idx = 0

    for i in range(min(len(df), max_rows)):  # Iterate only over the first 'max_rows' rows
        non_nulls = df.iloc[i].notna().sum()  # Count non-null values in the row
        if non_nulls > max_non_nulls:
            max_non_nulls = non_nulls
            header_row_idx = i  # Update the header row index

    return header_row_idx

# Step 2: File Processing and Data Extraction
async def get_processed_files(data_path, aircraft_details_initial_name, task_description_initial_name, 
                              task_parts_initial_name, sub_task_description_initial_name, 
                              sub_task_parts_initial_name):
    """
    Extract and combine data from Excel files into dataframes.
    """
    try:
        
        config = load_config()  # Load once to avoid multiple reads

        def read_and_process_file(file_path, sheet_name, folder_name):
            """Read and process an individual Excel file."""
            df = pd.read_excel(file_path, engine="openpyxl", sheet_name=sheet_name)
            #print(f"Processing file: {file_path}")

            if sheet_name in ["PRICING", "sheet1","Sheet1","Pricing"] :
                sub_task_parts_columns = config["sub_task_parts_columns"]
                sub_task_parts_column_mappings = config["sub_task_parts_column_mappings"]

                # Ensure consistent column names
                #header_row_idx = detect_header_row(df)
                df.columns = df.iloc[1].astype(str)
                df = df[2:].reset_index(drop=True)

                # Ensure correct columns
                missing_cols = set(sub_task_parts_columns) - set(df.columns)
                #print(f"Missing columns: {missing_cols}")
                extra_cols = set(df.columns) - set(sub_task_parts_columns)

                if missing_cols:
                    print(f"⚠️ Warning: Missing columns in {file_path}: {missing_cols}")
                    logger.warning(f"⚠️ Warning: Missing columns in {file_path}: {missing_cols}")
                if extra_cols:
                    print(f"⚠️ Warning: Extra columns in {file_path}: {extra_cols}")
                    logger.warning(f"⚠️ Warning: Extra columns in {file_path}: {extra_cols}")

                # Remove duplicate columns before reindexing
                df = df.loc[:, ~df.columns.duplicated()].copy()

                # First rename the columns that exist
                df.rename(columns={k: v for k, v in sub_task_parts_column_mappings.items() if k in df.columns}, inplace=True)

                # Now add any missing columns (using the final mapped column names)
                expected_columns = list(sub_task_parts_column_mappings.values())
                missing_columns = [col for col in expected_columns if col not in df.columns]


                # Add missing columns with None values
                for col in missing_columns:
                    df[col] = None

                # Finally, reorder columns to match expected order
                df = df[expected_columns]

                # Reorder columns according to the mapped values
                df = df[list(sub_task_parts_column_mappings.values())]
                
            elif sheet_name == "HMV" or sheet_name[:2] == "20":
                
                df.columns = df.columns.astype(str).str.strip()  # Strip spaces from column names
                #df.columns = df.columns.str.replace(r'[^\w]', '', regex=True).str.strip()
                df = df.reset_index(drop=True)
                
                aircraft_details_column_mappings = config["aircraft_details_column_mappings"]
                df = df.loc[:, ~df.columns.duplicated()].copy()
                aircraft_details_columns = [col.strip() for col in config["aircraft_details_columns"]]
                                # Ensure correct columns
                missing_cols = set(aircraft_details_columns) - set(df.columns)
                #print(f"Missing columns: {missing_cols}")
                extra_cols = set(df.columns) - set(aircraft_details_columns)
                if missing_cols:
                    print(f"⚠️ Warning: Missing columns in {file_path}: {missing_cols}")
                    logger.warning(f"⚠️ Warning: Missing columns in {file_path}: {missing_cols}")
                if extra_cols:
                    print(f"⚠️ Warning: Extra columns in {file_path}: {extra_cols}")
                    logger.warning(f"⚠️ Warning: Extra columns in {file_path}: {extra_cols}")
                df["year"] = folder_name


                # First rename the columns that exist
                df.rename(columns={k: v for k, v in aircraft_details_column_mappings.items() if k in df.columns}, inplace=True)

                # Now add any missing columns (using the final mapped column names)
                expected_columns = list(aircraft_details_column_mappings.values())
                missing_columns = [col for col in expected_columns if col not in df.columns]

                # Add missing columns with None values
                for col in missing_columns:
                    df[col] = None

                # Finally, reorder columns to match expected order
                df = df[expected_columns]


                df = df[list(aircraft_details_column_mappings.values())]
                
            elif sheet_name == 'mlttable':
                df.columns = df.iloc[0].astype(str).str.strip()
                df = df[1:].reset_index(drop=True)
                df["package"] = folder_name  # Add folder name as a column
                df = df.loc[:, ~df.columns.duplicated()].copy()
                task_parts_columns_mappings = config["task_parts_columns_mappings"]
                task_parts_columns=config["task_parts_columns"]
                # Ensure correct columns
                missing_cols = set(task_parts_columns) - set(df.columns)
                
                #print(f"Missing columns: {missing_cols}")
                extra_cols = set(df.columns) - set(task_parts_columns)
                if missing_cols:
                    print(f"⚠️ Warning: Missing columns in {file_path}: {missing_cols}")
                    logger.warning(f"⚠️ Warning: Missing columns in {file_path}: {missing_cols}")
                if extra_cols:
                    print(f"⚠️ Warning: Extra columns in {file_path}: {extra_cols}")
                    logger.warning(f"⚠️ Warning: Extra columns in {file_path}: {extra_cols}")
                
                # First rename the columns that exist
                df.rename(columns={k: v for k, v in task_parts_columns_mappings.items() if k in df.columns}, inplace=True)

                # Now add any missing columns (using the final mapped column names)
                expected_columns = list(task_parts_columns_mappings.values())
                missing_columns = [col for col in expected_columns if col not in df.columns]
                print(f"Missing columns: {missing_columns}")

                # Add missing columns with None values
                for col in missing_columns:
                    df[col] = None

                # Finally, reorder columns to match expected order
                df = df[expected_columns]

                # Reorder columns according to the mapped values
                df = df[list(task_parts_columns_mappings.values())]

                
            elif sheet_name == 'mltaskmlsec1':
                df.columns = df.iloc[0].astype(str).str.strip()
                df = df[1:].reset_index(drop=True)
                df = df.loc[:, ~df.columns.duplicated()].copy()
                task_description_columns=config["task_description_columns"]
                task_description_columns_mappings=config["task_description_columns_mappings"]
                missing_cols = set(task_description_columns) - set(df.columns)
                extra_cols = set(df.columns) - set(task_description_columns)
                if missing_cols:
                    print(f"⚠️ Warning: Missing columns in {file_path}: {missing_cols}")
                    logger.warning(f"⚠️ Warning: Missing columns in {file_path}: {missing_cols}")
                if extra_cols:
                    print(f"⚠️ Warning: Extra columns in {file_path}: {extra_cols}")
                    logger.warning(f"⚠️ Warning: Extra columns in {file_path}: {extra_cols}")
                df["package"] = folder_name
                df.rename(columns={k: v for k, v in task_description_columns_mappings.items() if k in df.columns}, inplace=True)

                # Now add any missing columns (using the final mapped column names)
                expected_columns = list(task_description_columns_mappings.values())
                missing_columns = [col for col in expected_columns if col not in df.columns]
                print(f"Missing columns: {missing_columns}")

                # Add missing columns with None values
                for col in missing_columns:
                    df[col] = None

                # Finally, reorder columns to match expected order
                df = df[expected_columns]


                df = df[list(task_description_columns_mappings.values())]
            
            elif sheet_name == 'mldpmlsec1':
                header_row_idx = detect_header_row(df)
                df.columns = df.iloc[header_row_idx ].astype(str)
                df = df.loc[:, ~df.columns.duplicated()].copy()
                sub_task_description_columns=config["sub_task_description_columns"]
                sub_task_description_columns_mappings=config["sub_task_description_columns_mappings"]
                missing_cols = set(sub_task_description_columns) - set(df.columns)
                extra_cols = set(df.columns) - set(sub_task_description_columns)
                if missing_cols:
                    print(f"⚠️ Warning: Missing columns in {file_path}: {missing_cols}")
                    logger.warning(f"⚠️ Warning: Missing columns in {file_path}: {missing_cols}")
                if extra_cols:
                    print(f"⚠️ Warning: Extra columns in {file_path}: {extra_cols}")
                    logger.warning(f"⚠️ Warning: Extra columns in {file_path}: {extra_cols}")
                df["package"] = folder_name
                df.rename(columns={k: v for k, v in sub_task_description_columns_mappings.items() if k in df.columns}, inplace=True)

                # Now add any missing columns (using the final mapped column names)
                expected_columns = list(sub_task_description_columns_mappings.values())
                missing_columns = [col for col in expected_columns if col not in df.columns]
                print(f"Missing columns: {missing_columns}")

                # Add missing columns with None values
                for col in missing_columns:
                    df[col] = None

                # Finally, reorder columns to match expected order
                df = df[expected_columns]


                df = df[list(sub_task_description_columns_mappings.values())]
                
            else:
                df.columns = df.iloc[0].astype(str).str.replace(".", "", regex=False)
                df = df[1:].reset_index(drop=True)
                df["package"] = folder_name  # Add folder name as a column

            return df

        def collect_files_by_prefix(prefix, sheet_names, data_path):
            """Collect and process files by prefix."""
            collected_data = []

            # Ensure sheet_names is a list
            if isinstance(sheet_names, str):
                sheet_names = [sheet_names]

            for root, _, files in os.walk(data_path):
                for file in files:
                    if file.startswith(prefix):
                        file_path = os.path.join(root, file)
                        folder_name = os.path.basename(root)
                        print(f"Processing file: {file_path}")

                        try:
                            # Get available sheet names from the file
                            available_sheets = pd.ExcelFile(file_path).sheet_names
                            valid_sheets = [sheet for sheet in sheet_names if sheet in available_sheets]

                            if not valid_sheets:
                                print(f"⚠️ Skipping file {file_path}: None of the required sheets found.")
                                continue  # Skip this file

                            all_sheets_data = []  # Store data from all valid sheets

                            for sheet_name in valid_sheets:
                                df = read_and_process_file(file_path, sheet_name, folder_name)

                                if df is not None and not df.empty:
                                    df.reset_index(drop=True, inplace=True)
                                    all_sheets_data.append(df)

                            # Append combined data for the current file
                            if all_sheets_data:
                                collected_data.append(pd.concat(all_sheets_data, ignore_index=True))

                            print(f"✅ Processed file: {file_path}")

                        except Exception as e:
                            print(f"❌ Error processing file: {file_path}: {e}")
            collected_data = [df for df in collected_data if not df.empty and not df.isna().all().all()]

            return pd.concat(collected_data, ignore_index=True) if collected_data else pd.DataFrame()


        # Collecting data
        #aircraft_details = collect_files_by_prefix(aircraft_details_initial_name, ["HMV","2023","2022","2021","2020","2019"],data_path)      
        #task_description = collect_files_by_prefix(task_description_initial_name, 'mltaskmlsec1',data_path)
        #task_parts = collect_files_by_prefix(task_parts_initial_name, 'mlttable',data_path)
        #sub_task_description = collect_files_by_prefix(sub_task_description_initial_name, 'mldpmlsec1',data_path)
        #sub_task_parts = collect_files_by_prefix(sub_task_parts_initial_name,['PRICING',"Sheet1",'sheet1',"Pricing"],data_path)
        return pd.DataFrame(),task_description,pd.DataFrame(), pd.DataFrame(),pd.DataFrame()

        #return aircraft_details, task_description, task_parts, sub_task_description, sub_task_parts
    except Exception as e:
        print(f"Error fetching processed files: {e}")
        return pd.DataFrame(), pd.DataFrame(), pd.DataFrame(), pd.DataFrame(), pd.DataFrame()