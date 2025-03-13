from motor.motor_asyncio import AsyncIOMotorClient
import os
import pandas as pd
import yaml
from logs.Log_config import setup_logging
import re
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

def convert_package_number(package_number):
    match = re.search(r"HMV(\d{2})(\d{6})(\d{4})", package_number)
    if match:
        part1 = match.group(1)  # The first two digits after HMV
        part2 = match.group(2)  # The next six digits
        part3 = match.group(3)  # The last four digits
       
        return f"HMV{part1}/{part2}/{part3}"
    
    print("package_number does not match:", package_number)  
    return package_number 
def clean_fly_hours(value):
    if isinstance(value, str):
        if ":" in value:  # If it's a time format (hh:mm), convert to float (optional)
            parts = value.split(":")
            value = float(parts[0]) + float(parts[1]) / 60  # Convert to decimal hours
        else:
            value = pd.to_numeric(value, errors='coerce')  # Convert to float if possible
    return value

"""    
def detect_header_row(df, max_rows=4):
    \"""
    Detects the most likely header row using multiple heuristics.
    
    Parameters:
    -----------
    df : pandas.DataFrame
        The input DataFrame to analyze
    max_rows : int, default=5
        Maximum number of rows to check from the top
    
    Returns:
    --------
    int
        The index of the most likely header row
    \"""
    scores = []
    rows_to_check = min(len(df), max_rows)
    col=[]
    if prefix=""
    task_description_columns=config["task_description_columns"]
    
    
    for i in range(rows_to_check):
        row = df.iloc[i]
        score = 0
        
        # 1. Check for non-null values (weight: 2)
        non_null_ratio = row.notna().mean()
        score += non_null_ratio * 3
        
        # 2. Check for string data type (weight: 1.5)
        string_ratio = sum(isinstance(val, str) for val in row) / len(row)
        score += string_ratio * 2
        
        # 3. Penalize numeric-only values (weight: -2)
        numeric_ratio = sum(isinstance(val, (int, float)) and not isinstance(val, bool) 
                          for val in row) / len(row)
        score -= 3*numeric_ratio
        
        # 4. Check for common header characteristics (weight: 2)
        header_indicators = 0
        for val in row:
            if isinstance(val, str):
                val_lower = str(val).lower()

                    header_indicators += 1
        header_ratio = header_indicators / len(row)
        score += header_ratio * 3
        
        # 5. Penalize rows with very long strings (likely data, not headers)
        long_string_ratio = sum(isinstance(val, str) and len(str(val)) > 50 
                              for val in row) / len(row)
        score -= long_string_ratio * 2
        
        scores.append(score)
    
    # Get the row with the highest score
    header_row_idx = scores.index(max(scores))
    
    # Debug information
    print(f"Header detection scores for first {rows_to_check} rows: {dict(enumerate(scores))}")
    print(f"Selected header row: {header_row_idx}")
    
    return header_row_idx
    
"""
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

            if sheet_name in ["PRICING", "sheet1", "Sheet1", "Pricing"]:
                sub_task_parts_columns = config["sub_task_parts_columns"]
                sub_task_parts_column_mappings = config["sub_task_parts_column_mappings"]
                
                # Add alternative column mappings
                alternative_mappings = {
                    "Issued Part#": "issued_part_number",
                    "Package#": "package_number",
                    "Task#": "task_number",
                    "SOI_TRANNO": "soi_transaction"
                }
                
                # Merge with original mappings
                combined_mappings = {**sub_task_parts_column_mappings, **alternative_mappings}
                
                # Ensure consistent column names
                df.columns = df.iloc[1].astype(str)
                df = df[2:].reset_index(drop=True)
                
                # Check for columns using both original and alternative names
                available_columns = set(df.columns)
                expected_columns_set = set(combined_mappings.keys())
                
                # Find which columns are present in the file
                columns_found = available_columns.intersection(expected_columns_set)
                
                # Calculate truly missing columns (not present in either format)
                # For this, we need to check which target fields we can't populate
                target_fields = set(sub_task_parts_column_mappings.values())
                mappable_fields = set(combined_mappings[col] for col in columns_found)
                truly_missing = target_fields - mappable_fields
                
                if truly_missing:
                    print(f"⚠️ Warning: Missing columns in {file_path} that couldn't be mapped: {truly_missing}")
                    logger.warning(f"⚠️ Warning: Missing columns in {file_path} that couldn't be mapped: {truly_missing}")
                
                # Remove duplicate columns before reindexing
                df = df.loc[:, ~df.columns.duplicated()].copy()
                
                # Rename the columns using combined mappings
                df.rename(columns={k: v for k, v in combined_mappings.items() if k in df.columns}, inplace=True)
                
                # Now add any missing columns with None values
                expected_output_columns = list(sub_task_parts_column_mappings.values())
                for col in expected_output_columns:
                    if col not in df.columns:
                        df[col] = None
                
                # Finally, reorder columns to match expected order
                df = df[expected_output_columns]
                
            elif sheet_name == "HMV" or sheet_name[:2] == "20":
                df.columns = df.columns.astype(str).str.strip()  # Strip spaces from column names
                df = df.loc[:, ~df.columns.duplicated()].copy()  # Remove duplicate columns
                df = df.reset_index(drop=True)  # Reset index

                aircraft_details_column_mappings = config["aircraft_details_column_mappings"]
                aircraft_details_columns = [col.strip() for col in config["aircraft_details_columns"]]
                #print(f"Columns in {file_path}: {df.columns.tolist()}")
                #print(df["A/C AGE"].isna().sum(), " ", df["A/C AGE"].notna().sum())

                # Identify missing and extra columns
                missing_cols = set(aircraft_details_columns) - set(df.columns)
                extra_cols = set(df.columns) - set(aircraft_details_columns)

                if missing_cols:
                    print(f"⚠️ Warning: Missing columns in {file_path}: {missing_cols}")
                    logger.warning(f"⚠️ Warning: Missing columns in {file_path}: {missing_cols}")
                
                if extra_cols:
                    print(f"⚠️ Warning: Extra columns in {file_path}: {extra_cols}")
                    logger.warning(f"⚠️ Warning: Extra columns in {file_path}: {extra_cols}")

                df["year"] = int(folder_name)  # Add the 'year' column

                # Rename columns if they exist in the dataframe
                df.rename(columns={k: v for k, v in aircraft_details_column_mappings.items() if k in df.columns}, inplace=True)
                

                # Convert 'aircraft_age' and 'aircraft_age_2024' safely
                for col in ["aircraft_age", "aircraft_age_2024"]:
                    if col in df.columns:
                        df[col] = (
                            df[col]
                            .astype(str)  # Convert all values to string
                            .str.strip()  # Remove extra spaces
                            .str.extract(r'(\d+\.?\d*)')[0]  # Extract numeric part
                            .astype(float)  # Convert to float
                        )
                #print(df["aircraft_age"].isna().sum())
                #print(f"Columns in {file_path}: {df.columns.tolist()}")
                df["issue_date"] = pd.to_datetime(df["issue_date"], errors='coerce').fillna(pd.Timestamp('0001-01-01T00:00:00.000+00:00')).dt.strftime('%Y-%m-%dT%H:%M:%S.%f%z')
                # Add missing expected columns with None values
                expected_columns = list(aircraft_details_column_mappings.values())
                for col in expected_columns:
                    if col not in df.columns:
                        print(col)
                        df[col] = None
                        
                df['flight_hours'] = df['flight_hours'].apply(clean_fly_hours)

                # Reorder dataframe to match expected column order
                df = df[expected_columns]
                
            elif sheet_name == 'mlttable':
                df.columns = df.iloc[0].astype(str).str.strip()
                df = df[1:].reset_index(drop=True)

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
                df["package"] = folder_name  # Add folder name as a column
                df['package'] = df['package'].apply(convert_package_number)
                
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
                df['package'] = df['package'].apply(convert_package_number)
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
                df.columns = df.iloc[0].astype(str).str.strip()
                df = df[1:].reset_index(drop=True)
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
                df['package'] = df['package'].apply(convert_package_number)
                df.rename(columns={k: v for k, v in sub_task_description_columns_mappings.items() if k in df.columns}, inplace=True)

                # Now add any missing columns (using the final mapped column names)
                expected_columns = list(sub_task_description_columns_mappings.values())
                missing_columns = [col for col in expected_columns if col not in df.columns]
                print(f"Missing columns: {missing_columns}")

                # Add missing columns with None values
                for col in missing_columns:
                    df[col] = None
                
                # Optimize task_findings dictionary creation
                findings = df["log_item_number"].tolist()
                tasks = df["source_task_discrepancy_number"].tolist()
                task_findings_dict = dict(zip(findings, tasks))
                
                # task_findings_dict will be {'1': 'a', '2': 'b', '3': '1'}

                # Optimize the task reference resolution - handle potential infinite loops
                max_iterations = 10  # Safety measure to prevent infinite loops
                for finding in findings:
                    iteration = 0
                    current = finding
                    
                    # Check if the finding maps to itself
                    if current in task_findings_dict and current == task_findings_dict[current]:
                        continue
                    
                    # Follow the chain of references to find the final task
                    while (iteration < max_iterations and 
                        current in task_findings_dict and 
                        task_findings_dict[current] in task_findings_dict):
                        current = task_findings_dict[current]
                        iteration += 1
                    
                    # Update with the final resolved task
                    if current != finding and current in task_findings_dict:
                        task_findings_dict[finding] = task_findings_dict[current]

                # Get updated keys and values
                findings = list(task_findings_dict.keys())
                tasks = list(task_findings_dict.values())
                df["log_item_number"]=findings
                df["source_task_discrepancy_number"]=tasks

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
        aircraft_details = collect_files_by_prefix(aircraft_details_initial_name, ["HMV","2023","2022","2021","2020","2019"],data_path)      
        #task_description = collect_files_by_prefix(task_description_initial_name, 'mltaskmlsec1',data_path)
        #task_parts = collect_files_by_prefix(task_parts_initial_name, 'mlttable',data_path)
        #sub_task_description = collect_files_by_prefix(sub_task_description_initial_name, 'mldpmlsec1',data_path)
        #sub_task_parts = collect_files_by_prefix(sub_task_parts_initial_name,['PRICING',"Sheet1",'sheet1',"Pricing"],data_path)
        return aircraft_details,pd.DataFrame(),pd.DataFrame(), pd.DataFrame(),pd.DataFrame()

        #return aircraft_details, task_description, task_parts, sub_task_description, sub_task_parts
    except Exception as e:
        print(f"Error fetching processed files: {e}")
        return pd.DataFrame(),  pd.DataFrame(), pd.DataFrame(), pd.DataFrame(), pd.DataFrame()