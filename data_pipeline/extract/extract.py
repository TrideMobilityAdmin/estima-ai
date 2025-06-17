import os
import pandas as pd
import yaml
from logs.Log_config import setup_logging
import re
from fuzzywuzzy import process
from difflib import SequenceMatcher
from pymongo import MongoClient
import numpy as np
from typing import List, Dict, Optional
# Initialize logger
logger = setup_logging()
#'/home/CNLT7197/estima-ai/data_pipeline/config.yaml'
# Load config.yaml
def load_config(config_path=None):
    """Load configuration from YAML file."""
    if config_path is None:
        # Try to find config relative to the current file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(current_dir, '..', 'config.yaml')
        
        # If not found, try alternate location
        if not os.path.exists(config_path):
            config_path = '/home/CNLT7197/estima-ai/data_pipeline/config.yaml'
            
    with open(config_path, "r") as file:
        return yaml.safe_load(file)

# Step 1: Establish Database Connection
def connect_to_database(db_uri: str, db_name: str):
    """
    Connect to MongoDB synchronously using pymongo and return the database object.
    """
    try:
        client = MongoClient(db_uri)
        db = client[db_name]  # Get database reference
        client.admin.command("ping")  # Check connection
        print(f"✅ Connected to database: {db_name}")
        return db
    except Exception as e:
        print(f"❌ Error connecting to MongoDB: {e}")
        logger.error("Error connecting to MongoDB", exc_info=True)
        return None


def convert_package_number(package_number):
    if not isinstance(package_number, str):
        return package_number
        
    match = re.search(r"HMV(\d{2})(\d{6})(\d{4})", package_number)
    if match:
        part1 = match.group(1)  # The first two digits after HMV
        part2 = match.group(2)  # The next six digits
        part3 = match.group(3)  # The last four digits
       
        return f"HMV{part1}/{part2}/{part3}"
    
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
def get_processed_files(files_to_process, data_path,error_message,aircraft_details_initial_name, task_description_initial_name, 
                              task_parts_initial_name, sub_task_description_initial_name, 
                              sub_task_parts_initial_name):
    """
    Extract and combine data from Excel files into dataframes.
    Returns processed dataframes and a set of newly processed files.
    """
    try:
        error_message="Found issues in the following files while  processing."
        config = load_config()  # Load once to avoid multiple reads
        newly_processed_files = set()

        def read_and_process_file(file_path, sheet_name, folder_name):
            """Read and process an individual Excel file."""
            try:
                file_extension = os.path.splitext(file_path)[1]
                engine = "openpyxl" if file_extension in [".xlsx", ".xlsm"] else "pyxlsb" if file_extension == ".xlsb" else "xlrd"



                # First, read the Excel file using ExcelFile to inspect sheets
                excel_file = pd.ExcelFile(file_path, engine=engine)
                #print(f"sheet names: {excel_file.sheet_names}")

                # Then, read the specific sheet into a DataFrame
                df = pd.read_excel(excel_file, sheet_name=sheet_name)

                #print(f"df.shape: {df.shape}")
                #print(f"df.columns: {df.columns}")




                if sheet_name.lower() in ["pricing", "sheet1", "price", "page"]:

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
                    print("df.shape:", df.shape, "of file:", file_path)

                    if header_row_index is not None:
                        df.columns = df.iloc[header_row_index].astype(str).values
                        print("df.columns:", df.columns, "of file:", file_path)

                        logger.info(f"Detected header row at index {header_row_index} for {file_path}, columns: {df.columns}")

                        # Extract data rows (everything after the header)
                        df = df.iloc[header_row_index + 1:].reset_index(drop=True)
                    else:
                        # If no header row is detected, use the first row as header and log a warning
                        
                        logger.warning(f"Could not detect header row in {file_path}")
                        print(f"Could not detect header row in {file_path}")




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
                            df[col] = None
                    # Convert to string
                    string_cols = [
                        'registration_number', 'package_number', 'task_number',
                        'task_description', 'issued_part_number', 'part_description',
                        'issued_unit_of_measurement', 'stock_status', 'base_currency',
                        'soi_transaction'
                    ]

                    # Apply conversions
                    for col in string_cols:
                        if col in df.columns:
                            # Replace NaN with None
                            df[col] = df[col].where(pd.notnull(df[col]), None)
                            
                            # Convert non-None values to string (but keep None as None)
                            df[col] = df[col].apply(lambda x: str(x) if x is not None else None)

                        
                    numeric_convert = ['base_price_usd', 'freight_cost', 'admin_charges', 'total_billable_price', 'billable_value_usd', 'used_quantity']

                    for col in numeric_convert:
                        df[col] = pd.to_numeric(df[col], errors='coerce')

                    # Reorder columns to match expected order
                    df = df[expected_output_columns]
                    df["file_path"] = file_path
                    df = df.where(pd.notnull(df), None)
                    print("Processed sub_task_parts file:", file_path)
                    
                elif sheet_name == "HMV" or sheet_name[:2] == "20":
                    df.columns = df.columns.astype(str).str.strip()  # Strip spaces from column names
                    df = df.loc[:, ~df.columns.duplicated()].copy()  # Remove duplicate columns
                    df = df.reset_index(drop=True)  # Reset index

                    aircraft_details_column_mappings = config["aircraft_details_column_mappings"]
                    aircraft_details_columns = [col.strip() for col in config["aircraft_details_columns"]]

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
                                        
                    # Add missing expected columns with None values
                    expected_columns = list(aircraft_details_column_mappings.values())
                    missing_columns = [col for col in expected_columns if col not in df.columns]
                    for col in missing_columns:
                        df[col] = None
                    df['flight_hours'] = df['flight_hours'].apply(clean_fly_hours)

                    # Handling aircraft age columns
                    for col in ["aircraft_age", "aircraft_age_2024"]:
                        if col in df.columns:
                            # Try to extract numeric values from strings, handle errors safely
                            df[col] = (
                                df[col]
                                .astype(str)  # Convert all values to string
                                .str.strip()  # Remove extra spaces
                                .str.extract(r'(\d+\.?\d*)')[0]  # Extract numeric part
                                .astype(float, errors='ignore')  # Convert to float with error handling
                            )
                            # Additional safety conversion with proper error handling
                            df[col] = pd.to_numeric(df[col], errors='coerce')


                    # Handle datetime columns
                    datetime_cols = ["issue_date", 'start_date', 'end_date', 'last_maintenance_date']
                    for col in datetime_cols:
                        if col in df.columns:
                            # Convert to datetime with error handling
                            df[col] = pd.to_datetime(df[col], errors='coerce')
                            # Only localize non-NaT values to avoid TypeError
                            mask = ~df[col].isna()
                            if mask.any():
                                df.loc[mask, col] = df.loc[mask, col].dt.tz_localize('UTC')
                            # Fill NaT values with a default timestamp (already timezone aware)
                            df[col] = df[col].fillna(pd.Timestamp('0001-01-01T00:00:00.000', tz='UTC'))

                    # Define string columns
                    string_cols = [
                        'customer_order_number', 'customer_name', 'package_number',
                        'aircraft_registration_number', 'aircraft_model',
                        'release_tracking_number', 'package_details', 'check_category',
                        'train_data', 'test_data', 'type_of_check'
                    ]

                    # Convert string columns, handling None values

                    for col in string_cols:
                        if col in df.columns:
                            # Replace NaN with None
                            df[col] = df[col].where(pd.notnull(df[col]), None)
                            
                            # Convert non-None values to string (but keep None as None)
                            df[col] = df[col].apply(lambda x: str(x) if x is not None else None)


                    # Define numeric columns
                    numeric_cols = ['year', 'flight_hours', 'flight_cycles', 'aircraft_age', 
                                'aircraft_age_2024', 'turnaround_time']

                    # Convert numeric columns with error handling
                    for col in numeric_cols:
                        if col in df.columns:
                            df[col] = pd.to_numeric(df[col], errors='coerce')



                    # Ensure the dataframe has all expected columns before reordering
                    reorder_columns = [col for col in expected_columns if col in df.columns]
                    df = df.reindex(columns=reorder_columns)

                    # Add file path column
                    df["file_path"] = file_path
                    df = df.where(pd.notnull(df), None)
                    
                elif sheet_name == 'mlttable':
                    df.columns = df.iloc[0].astype(str).str.strip()
                    df = df[1:].reset_index(drop=True)

                    df = df.loc[:, ~df.columns.duplicated()].copy()
                    task_parts_columns_mappings = config["task_parts_columns_mappings"]
                    task_parts_columns = config["task_parts_columns"]
                    
                    # Ensure correct columns
                    missing_cols = set(task_parts_columns) - set(df.columns)
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
                    string_cols=['rt_mode_flag', 'delete_flag', 'task_number', 'requested_part_number',
                    'issued_part_number', 'issued_serial_number', 'issued_lot_number',
                    
                    'part_description', 'requested_stock_status', 'material_request_number',
                    'part_type', 'issued_stock_status', 'issue_number',  'package_number']
                    # Add missing columns with None values
                    
                    # Apply conversions
                    for col in string_cols:
                        if col in df.columns:
                            # Replace NaN with None
                            df[col] = df[col].where(pd.notnull(df[col]), None)
                            
                            # Convert non-None values to string (but keep None as None)
                            df[col] = df[col].apply(lambda x: str(x) if x is not None else None)

                        
                    numeric_convert = ['issued_quantity', 'used_quantity', 'unit_of_measurement',
                    'pending_return_quantity', 'returned_quantity_excess','material_cost',
                    'requested_quantity']

                    for col in numeric_convert:
                        df[col] = pd.to_numeric(df[col], errors='coerce')
                        
                    for col in missing_columns:
                        df[col] = None

                    # Finally, reorder columns to match expected order
                    df = df[expected_columns]
                    df["file_path"] = file_path
                    df = df.where(pd.notnull(df), None)
                    
                elif sheet_name == 'mltaskmlsec1':
                    df.columns = df.iloc[0].astype(str).str.strip()
                    df = df[1:].reset_index(drop=True)
                    df = df.loc[:, ~df.columns.duplicated()].copy()
                    task_description_columns = config["task_description_columns"]
                    task_description_columns_mappings = config["task_description_columns_mappings"]
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
                    
                    # Handle datetime columns
                    datetime_cols = ['planned_start_date',
                        'planned_end_date',  'actual_start_date',
                        'actual_end_date']
                    for col in datetime_cols:
                        if col in df.columns:
                            # Convert to datetime with error handling
                            df[col] = pd.to_datetime(df[col], errors='coerce')
                            # Only localize non-NaT values to avoid TypeError
                            mask = ~df[col].isna()
                            if mask.any():
                                df.loc[mask, col] = df.loc[mask, col].dt.tz_localize('UTC')
                            # Fill NaT values with a default timestamp (already timezone aware)
                            df[col] = df[col].fillna(pd.Timestamp('0001-01-01T00:00:00.000', tz='UTC'))

                    # Define string columns
                    string_cols = [
                        '', 'rt_mode_flag', 'delete_flag', 'sequence_number', 'task_number',
                        'ata_number', 'description', 'status', 'work_center_number',
                        'sign_off_status', 'task_type', 'task_category', 'job_type',
                        'execution_phase', 'execution_category', 'mechanic_required',
                        'inspection_required', 'rii_required',  'tracking_number',
                        'long_description', 'hold_status', 'estimation_status', 'skill_number',
                        'wbs_code', 'package_number', 'source_task_discrepancy_number',
                        'source_tracking_number', 'zone_number', 'parent_task_number',
                        'root_task_number', 'previous_execution_comments', 'mechanic_sign_off',
                        'inspection_sign_off', 'rii_sign_off', 'additional_sign_off',
                        'previous_sign_off_comments', 'workscoping_comments', 'repair_agency',
                        'repair_classification', 'maintenance_manual_reference_number'
                    ]
                    

                    # Convert string columns, handling None values
                    for col in string_cols:
                        if col in df.columns:
                            # Replace NaN with None
                            df[col] = df[col].where(pd.notnull(df[col]), None)
                            
                            # Convert non-None values to string (but keep None as None)
                            df[col] = df[col].apply(lambda x: str(x) if x is not None else None)


                    # Define numeric columns
                    numeric_cols = ['estimated_man_hours','actual_man_hours']

                    # Convert numeric columns with error handling
                    for col in numeric_cols:
                        if col in df.columns:
                            df[col] = pd.to_numeric(df[col], errors='coerce')
                        else:
                            df[col] = None
                    
                    

                    # Add missing columns with None values
                    for col in missing_columns:
                        df[col] = None

                    # Finally, reorder columns to match expected order
                    df = df[expected_columns]
                    df["file_path"] = file_path
                    df = df.where(pd.notnull(df), None)
                
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
                    
                    # Handle datetime columns
                    datetime_cols = ['planned_start_date',
                        'planned_end_date',  'actual_start_date',
                        'actual_end_date']
                    for col in datetime_cols:
                        if col in df.columns:
                            # Convert to datetime with error handling
                            df[col] = pd.to_datetime(df[col], errors='coerce')
                            # Only localize non-NaT values to avoid TypeError
                            mask = ~df[col].isna()
                            if mask.any():
                                df.loc[mask, col] = df.loc[mask, col].dt.tz_localize('UTC')
                            # Fill NaT values with a default timestamp (already timezone aware)
                            df[col] = df[col].fillna(pd.Timestamp('0001-01-01T00:00:00.000', tz='UTC'))
                            
                    string_cols = ['', 'rt_mode_flag', 'delete_flag', 'task_type', 'log_item_number',
                    'ata_number', 'task_description', 'corrective_action',
                    'discrepancy_number', 'action_taken', 'task_status',
                    'source_task_discrepancy_number',
                    'source_task_discrepancy_number_updated', 'source_tracking_number',
                    'work_center_number', 'sign_off_status', 'contract_classification',
                    'task_category', 'execution_phase', 'execution_category',
                    'part_required', 'corrosion_related', 'major_item', 'is_repeat',
                    'reported_by', 'reported_date', 'mechanical_required',
                    'mechanical_sign_off', 'inspection_required', 'inspection_sign_off',
                    'rii_required', 'sequence_number', 'tracking_number', 'hold_status',
                    'estimation_status', 'deferral_calendar', 'deferral_type',
                    'package_number', 'zone_number', 'skill_number', 'additional_sign_off',
                    'part_number', 'serial_number', 'part_description', 'position_code',
                    'previous_sign_off_comments', 'radio_communication',
                    'mechanical_skill_number', 'inspection_skill_number', 'rii_sign_off',
                    'rii_skill_number']
                    # Convert string columns, handling None values
                    for col in string_cols:
                        if col in df.columns:
                            # Replace NaN with None
                            df[col] = df[col].where(pd.notnull(df[col]), None)
                            
                            # Convert non-None values to string (but keep None as None)
                            df[col] = df[col].apply(lambda x: str(x) if x is not None else None)

                    # Define numeric columns
                    numeric_cols = ['estimated_man_hours','actual_man_hours']

                    # Convert numeric columns with error handling
                    for col in numeric_cols:
                        if col in df.columns:
                            df[col] = pd.to_numeric(df[col], errors='coerce')
                        else:
                            df[col] = None
                    # Add missing columns with None values
                    for col in missing_columns:
                        df[col] = None

                    # Ensure required columns exist before proceeding
                    required_columns = ["log_item_number", "source_task_discrepancy_number"]
                    for col in required_columns:
                        if col not in df.columns:
                            print(f"⚠️ Warning: Required column '{col}' is missing in {file_path}. Skipping task_findings processing.")
                            logger.warning(f"⚠️ Warning: Required column '{col}' is missing in {file_path}. Skipping task_findings processing.")
                            return pd.DataFrame()  # Return empty DataFrame if required columns are missing

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
                    df["file_path"] = file_path
                    df = df.where(pd.notnull(df), None)
                    
                else:
                    df.columns = df.iloc[0].astype(str).str.replace(".", "", regex=False)
                    df = df[1:].reset_index(drop=True)
                    df["package"] = folder_name  # Add folder name as a column
                    df["file_path"] = file_path
                    df = df.where(pd.notnull(df), None)

                return df
                
            except Exception as e:
                logger.error(f"Error processing file {file_path}, sheet {sheet_name}: {e}")
                print(f"Error processing file {file_path}, sheet {sheet_name}: {e}")
                return pd.DataFrame()
                # Collecting data
                
        def validate_filename_keywords( filename: str) -> Optional[str]:
            """
            Validate if filename contains required keywords.
            
            Args:
                filename (str): Name of the file to validate
                
            Returns:
                Optional[str]: Expected file type if valid, None otherwise
            """
            filename_lower = filename.lower()
            
            if "mltaskmlsec1" in filename_lower:
                return "mltaskmlsec1"
            elif "mldpmlsec1" in filename_lower:
                return "mldpmlsec1"
            elif "material" in filename_lower:
                return "material"
            elif "mlttable" in filename_lower:
                return "mlttable"
            else:
                return None
        
        def files_check(file_path, sheet_names, folder_name):
            """
            Check and process individual files.
            
            Args:
                file_path (str): Full path to the file
                sheet_names (list): List of expected sheet names
                folder_name (str): Name of the folder containing the file
                
            Returns:
                pd.DataFrame: Processed dataframe or empty dataframe
            """
            print(f"Processing file: {file_path}")
            try:
                filename = os.path.basename(file_path)  # Extract filename from path
                file_extension = os.path.splitext(filename)[1].lower()
                
                if not file_extension:
                    file_extension = f".{filename.split('.')[-1].lower()}"
                
                # Check if file extension is supported
                if file_extension in [".xlsx", ".xlsm", ".xlsb", ".xls"]:
                    extension = file_extension
                else:
                    error_message += (
                        f", Unsupported file extension {file_extension} for {filename}. "
                        "Supported extensions are: .xlsx, .xlsm, .xlsb, .xls"
                    )
                    raise Exception(
                        f"Unsupported file extension {file_extension} for {file_path}. "
                        "Supported extensions are: .xlsx, .xlsm, .xlsb, .xls"
                    )
                
                # Read Excel file and get available sheets
                excel_file = pd.ExcelFile(file_path)
                available_sheets = excel_file.sheet_names
                sheet_names_lower = [name.lower() for name in sheet_names]
                valid_sheets = [sheet for sheet in available_sheets 
                            if sheet.lower() in sheet_names_lower]
        
                sheet_name = valid_sheets[0] if valid_sheets else None
                if not sheet_name:
                    print(f"⚠️ Skipping file {file_path}: None of the required sheets found.")
                    error_message += f"\n File {file_path} does not contain any of the required sheets: {sheet_names}. So, Skipping it."
                    return pd.DataFrame()  # Return empty DataFrame if no valid sheet found

                # Process the file (assuming read_and_process_file function exists)
                df = read_and_process_file(file_path, sheet_name, folder_name)

                if df is not None and not df.empty:
                    df.reset_index(drop=True, inplace=True)
                    print(f"✅ Processed file: {file_path}")
                    return df
                else:
                    print(f"⚠️ No valid data found in file: {file_path}")
                    error_message += f"\n File {file_path} does not contain required columns names in the sheet {sheet_name}. So, Skipping it."
                    return pd.DataFrame()  

            except Exception as e:
                logger.error(f"❌ Error processing file: {file_path}: {e}")
                print(f"❌ Error processing file: {file_path}: {e}")
                return pd.DataFrame()
        


        def process_files( files_to_process):
            """
            Process multiple files based on their keywords.
            
            Args:
                files_to_process (list): List of file paths
                
            Returns:
                tuple: Five dataframes containing processed data
            """
            aircraft_details = pd.DataFrame()
            task_description = pd.DataFrame()
            task_parts = pd.DataFrame()
            sub_task_description = pd.DataFrame()
            sub_task_parts = pd.DataFrame()
            
            for file_path in files_to_process:
                # Skip any file path that contains '2019' in its directory structure
                if "2019" in os.path.normpath(file_path).split(os.sep):
                    continue
                
                # Extract filename and folder name from the full path
                filename = os.path.basename(file_path)
                folder_name = os.path.basename(os.path.dirname(file_path))
                
                # Validate filename keywords
                file_keyword = validate_filename_keywords(filename)
                
                if file_keyword:
                    if file_keyword == "mltaskmlsec1":
                        sheet_names = ["mltaskmlsec1"]
                        df = files_check(file_path, sheet_names, folder_name)
                        aircraft_details = pd.concat([aircraft_details, df], ignore_index=True)
                        
                    elif file_keyword == "mldpmlsec1":
                        sheet_names = ["mldpmlsec1"]
                        df = files_check(file_path, sheet_names, folder_name)
                        sub_task_description = pd.concat([sub_task_description, df], ignore_index=True)
                        
                    elif file_keyword == "material":
                        sheet_names = ["pricing", "Pricing", "sheet1", "price", "page"]
                        df = files_check(file_path, sheet_names, folder_name)
                        sub_task_parts = pd.concat([sub_task_parts, df], ignore_index=True)
                        
                    elif file_keyword == "mlttable":
                        sheet_names = ["mlttable"]
                        df = files_check(file_path, sheet_names, folder_name)
                        task_parts = pd.concat([task_parts, df], ignore_index=True)
                else:
                    error_message += f"\n File {file_path} does not have  any expected keywords like mltaskmlsec1, mldpmlsec1, material, mlttable in the file name. So, Skipping it."
            
            return aircraft_details, task_description, task_parts, sub_task_description, sub_task_parts,error_message
        
        aircraft_details, task_description, task_parts, sub_task_description, sub_task_parts,error_message=process_files(files_to_process)
        return aircraft_details, task_description, task_parts, sub_task_description, sub_task_parts, newly_processed_files, error_message
    except Exception as e:
        error_message="Unexpected error occured duing the processing the data pipeline"
        logger.error(f"Error in get_processed_files: {e}")
        print(f"Error fetching processed files: {e}")
        return pd.DataFrame(), pd.DataFrame(), pd.DataFrame(), pd.DataFrame(), pd.DataFrame(), set(),error_message