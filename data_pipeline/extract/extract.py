from motor.motor_asyncio import AsyncIOMotorClient
import os
import pandas as pd
import yaml
from logs.Log_config import setup_logging
import re
from fuzzywuzzy import process

from difflib import SequenceMatcher
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





def get_best_match(target, candidates):
    """
    Find the best matching string from a list of candidates using SequenceMatcher.
    
    Args:
        target (str): The expected column name.
        candidates (list): List of candidate strings.
    
    Returns:
        tuple: (best match string, similarity score) or (None, 0) if no match found.
    """
    best_match = None
    best_score = 0

    for candidate in candidates:
        score = SequenceMatcher(None, target.lower(), candidate.lower()).ratio() * 100  # Convert to percentage
        if score > best_score:
            best_match = candidate
            best_score = score

    return (best_match, best_score) if best_score > 70 else (None, 0)  # Threshold set at 70%

def detect_header_row(df, expected_columns, max_rows_to_check=6):
    """
    Dynamically detect which row contains the header by checking for matches with expected columns.
    
    Args:
        df (pd.DataFrame): DataFrame with potential header rows.
        expected_columns (list): List of expected column names.
        max_rows_to_check (int): Maximum number of rows to check for headers.
    
    Returns:
        int or None: Best header row index or None if not found.
    """
    best_match_score = 0
    best_row_index = None

    # Check each of the first few rows
    for i in range(min(max_rows_to_check, len(df))):
        row_values = df.iloc[i].astype(str).fillna('').tolist()  # Convert row to list of strings

        # Skip rows with too many missing values
        if sum(pd.isna(df.iloc[i])) > len(row_values) / 2:
            continue

        # Calculate match score for this row
        row_score = 0
        for expected_col in expected_columns:
            best_match = get_best_match(expected_col, row_values)  # Find best match
            row_score += best_match[1]  # Add similarity score

        # If this row has better matches than previous best, update best row
        if row_score > best_match_score:
            best_match_score = row_score
            best_row_index = i

    return best_row_index


def predict_column_mappings(df, expected_mappings):
    """
    Dynamically predict column mappings using fuzzy matching.
    
    Args:
        df: DataFrame with the original column names
        expected_mappings: Dictionary of expected column names to their standardized names
    
    Returns:
        Dictionary mapping actual column names to standardized names
    """
    # Get all column names from the DataFrame
    actual_columns = list(df.columns)
    
    # Create a mapping for each expected column
    dynamic_mappings = {}
    
    for expected_col, standardized_name in expected_mappings.items():
        # Find the best match among actual columns
        best_match = process.extractOne(expected_col, actual_columns)
        
        if best_match and best_match[1] > 70:  # Match score above 70%
            dynamic_mappings[best_match[0]] = standardized_name
            logger.info(f"Mapped '{best_match[0]}' to '{standardized_name}' with score {best_match[1]}")
        else:
            logger.warning(f"Could not find a good match for '{expected_col}'")
    
    return dynamic_mappings


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
            file_extension = os.path.splitext(file_path)[1]
            engine = "openpyxl" if file_extension == ".xlsx" else "pyxlsb" if file_extension == ".xlsb" else "xlrd"

            df = pd.read_excel(file_path, engine=engine, sheet_name=sheet_name)

            if sheet_name.lower() in ["pricing", "sheet1", "price","page"]:
                sub_task_parts_columns = config["sub_task_parts_columns"]
                sub_task_parts_column_mappings = config["sub_task_parts_column_mappings"]

                # Alternative mappings
                alternative_mappings = {
                    "Issued Part#": "issued_part_number",
                    "Package#": "package_number",
                    "Task#": "task_number",
                    "SOI_TRANNO": "soi_transaction"
                }

                # Merge mappings
                combined_mappings = {**sub_task_parts_column_mappings, **alternative_mappings}

                # Detect the header row
                header_row_index = detect_header_row(df, combined_mappings.keys())

                if header_row_index is None:
                    logger.warning(f"Could not detect header row in {file_path}")
                    return None

                # Set the column names correctly
                df.columns = df.iloc[header_row_index].astype(str).values  # ✅ Convert to array/list

                logger.info(f"Detected header row at index{file_path} {header_row_index}, columns: {df.columns}")

                # Extract data rows (everything after the header)
                df = df.iloc[header_row_index + 1:].reset_index(drop=True)

                print(f"The Excel is read as DataFrame, header row was at index {header_row_index}")

                # Rename columns using mappings
                df.rename(columns={k: v for k, v in combined_mappings.items() if k in df.columns}, inplace=True)

                expected_output_columns = list(sub_task_parts_column_mappings.values())
                mapped_columns = set(df.columns)
                truly_missing = set(expected_output_columns) - mapped_columns
                if len(truly_missing) > 4:
                    
                    return pd.DataFrame()
                

                if truly_missing:
                    warning_msg = f"⚠️ Warning: Missing columns in {file_path} that couldn't be mapped: {truly_missing}"
                    print(warning_msg)
                    logger.warning(warning_msg)

                # Remove duplicate columns
                df = df.loc[:, ~df.columns.duplicated()].copy()

                # Ensure all expected columns exist
                for col in expected_output_columns:
                    if col not in df.columns:
                        df[col] = "None"

                # Reorder columns to match expected order
                df = df[expected_output_columns]


                
                
            elif  sheet_name == "HMV" or sheet_name[:2] == "20" :
                if sheet_name[2:] == "19":
                    return pd.DataFrame()
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
                df["issue_date"] = pd.to_datetime(df["issue_date"], errors='coerce')
                df["issue_date"] = df["issue_date"].dt.tz_localize('UTC')
                df["issue_date"] = df["issue_date"].fillna(pd.Timestamp('0001-01-01T00:00:00.000', tz='UTC'))       
                # Add missing expected columns with None values
                expected_columns = list(aircraft_details_column_mappings.values())
                for col in expected_columns:
                    if col not in df.columns:
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
                # Ensure first row is used as column names safely
                df.columns = df.iloc[0].astype(str).str.strip()
                df = df[1:].reset_index(drop=True)
                df = df.loc[:, ~df.columns.duplicated()].copy()

                sub_task_description_columns = config["sub_task_description_columns"]
                sub_task_description_columns_mappings = config["sub_task_description_columns_mappings"]

                # Check for missing and extra columns
                missing_cols = set(sub_task_description_columns) - set(df.columns)
                extra_cols = set(df.columns) - set(sub_task_description_columns)
                
                if missing_cols:
                    warning_msg = f"⚠️ Warning: Missing columns in {file_path}: {missing_cols}"
                    print(warning_msg)
                    logger.warning(warning_msg)
                
                if extra_cols:
                    warning_msg = f"⚠️ Warning: Extra columns in {file_path}: {extra_cols}"
                    print(warning_msg)
                    logger.warning(warning_msg)

                df["package"] = folder_name
                df["package"] = df["package"].apply(convert_package_number)

                # Rename columns safely
                df.rename(columns={k: v for k, v in sub_task_description_columns_mappings.items() if k in df.columns}, inplace=True)

                # Add any missing columns (based on mapped names)
                expected_columns = list(sub_task_description_columns_mappings.values())
                missing_columns = [col for col in expected_columns if col not in df.columns]

                # Print missing columns for debugging
                if missing_columns:
                    print(f"Missing columns: {missing_columns}")

                # Add missing columns with None values
                for col in missing_columns:
                    df[col] = None

                # Ensure required columns exist before proceeding
                required_columns = ["log_item_number", "source_task_discrepancy_number"]
                for col in required_columns:
                    if col not in df.columns:
                        print(f"⚠️ Warning: Required column '{col}' is missing in {file_path}. Skipping task_findings processing.")
                        logger.warning(f"⚠️ Warning: Required column '{col}' is missing in {file_path}. Skipping task_findings processing.")
                        return  # Exit this branch early if required columns are missing

                # Initialize the new column
                df["source_task_discrepancy_number_updated"] = ""

                # Create task_findings_dict
                findings = df["log_item_number"].tolist()
                tasks = df["source_task_discrepancy_number"].tolist()
                task_findings_dict = dict(zip(findings, tasks))

                # Resolve task references safely (avoid infinite loops)
                max_iterations = 10  # Safety limit
                for finding in findings:
                    iteration = 0
                    current = finding
                    
                    while iteration < max_iterations:
                        if current not in task_findings_dict or task_findings_dict[current] == current:
                            break  # Stop if there's no further reference or self-referencing
                        next_value = task_findings_dict[current]
                        if next_value == finding:  # Circular reference detected
                            break
                        current = next_value
                        iteration += 1
                    
                    # Update with the resolved reference
                    task_findings_dict[finding] = current

                # Assign resolved values back to DataFrame
                df["source_task_discrepancy_number_updated"] = df["log_item_number"].map(task_findings_dict)

                # Ensure correct column order
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
                            logger.error(f"❌ Error processing file: {file_path}: {e}")
                            print(f"❌ Error processing file: {file_path}: {e}")
                            
            collected_data = [df for df in collected_data if not df.empty and not df.isna().all().all()]

            return pd.concat(collected_data, ignore_index=True) if collected_data else pd.DataFrame()


        # Collecting data
        aircraft_details = collect_files_by_prefix(aircraft_details_initial_name, ["HMV","2023","2022","2021","2020","2019"],data_path)      
        task_description = collect_files_by_prefix(task_description_initial_name, 'mltaskmlsec1',data_path)
        task_parts = collect_files_by_prefix(task_parts_initial_name, 'mlttable',data_path)
        sub_task_description = collect_files_by_prefix(sub_task_description_initial_name, 'mldpmlsec1',data_path)
        sub_task_parts = collect_files_by_prefix(sub_task_parts_initial_name,['PRICING',"Sheet1",'sheet1',"Pricing","Price"],data_path)
        return aircraft_details,pd.DataFrame(),pd.DataFrame(), pd.DataFrame(),pd.DataFrame()

        #return aircraft_details, task_description, task_parts, sub_task_description, sub_task_parts
    except Exception as e:
        print(f"Error fetching processed files: {e}")
        return pd.DataFrame(),  pd.DataFrame(), pd.DataFrame(), pd.DataFrame(), pd.DataFrame()