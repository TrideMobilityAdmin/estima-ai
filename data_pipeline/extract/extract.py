from prefect import task
from motor.motor_asyncio import AsyncIOMotorClient
import pandas as pd
import os
from typing import List, Tuple, Optional
from prefect import get_run_logger

@task(retries=3, retry_delay_seconds=30)
async def connect_to_database(db_name: str = "gmr-mro") -> Optional[AsyncIOMotorClient]:
    """
    Establishes connection with MongoDB database.
    
    Args:
        db_name: Name of the database to connect to
    
    Returns:
        Database connection object if successful, None otherwise
    """
    logger = get_run_logger()
    try:
        connection_string = "mongodb://admin:Tride%401234@telematics-mongo1.evrides.in:22022,telematics-mongo2.evrides.in:22022,telematics-mongo3.evrides.in:22022/?authSource=admin&replicaSet=trideRepl"
        client = AsyncIOMotorClient(connection_string)
        db = client[db_name]
        
        await client.admin.command('ping')
        logger.info(f"Successfully connected to database: {db_name}")
        return db
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {str(e)}")
        raise

@task(retries=2)
async def extract_excel_data(
    file_path: str,
    sheet_name: str,
    header_row: int,
    data_start_row: int,
    folder_name: str
) -> pd.DataFrame:
    """
    Extracts data from an Excel file.
    
    Args:
        file_path: Path to the Excel file
        sheet_name: Name of the sheet to read
        header_row: Row number containing headers
        data_start_row: Row number where data starts
        folder_name: Name of the folder containing the file
    
    Returns:
        Pandas DataFrame containing the extracted data
    """
    logger = get_run_logger()
    try:
        df = pd.read_excel(
            file_path,
            engine='openpyxl',
            sheet_name=sheet_name
        )
        df.columns = df.iloc[header_row].astype(str)
        df = df[data_start_row:]
        df = df.reset_index(drop=True)
        df['Folder_Name'] = folder_name
        
        logger.info(f"Successfully extracted data from {file_path}. Shape: {df.shape}")
        return df
    except Exception as e:
        logger.error(f"Failed to extract data from {file_path}: {str(e)}")
        raise

@task
async def get_all_data(data_path: str = r"D:\Projects\gmr-mro\Data_Pipeline\Data\2024") -> Tuple[pd.DataFrame, ...]:
    """
    Extracts all required data from Excel files.
    
    Args:
        data_path: Base path containing all data files
    
    Returns:
        Tuple of DataFrames containing all extracted data
    """
    logger = get_run_logger()
    
    try:
        # Extract aircraft details
        aircraft_details = await extract_excel_data(
            os.path.join(data_path, "AIRCRAFT DETAILS-2024.xlsx"),
            "Sheet1",  # Adjust sheet name if needed
            0,
            1,
            os.path.basename(data_path)
        )
        
        # Extract other files using file patterns
        file_configs = [
            ("mltaskmlsec1", "mltaskmlsec1", 0, 1),
            ("mlttable", "mlttable", 0, 1),
            ("mldpmlsec1", "mldpmlsec1", 0, 1),
            ("Material Consumption Pricing", "PRICING", 1, 2)
        ]
        
        dataframes = [aircraft_details]
        
        for file_prefix, sheet_name, header_row, data_start_row in file_configs:
            dfs = []
            for root, _, files in os.walk(data_path):
                matching_files = [f for f in files if f.startswith(file_prefix)]
                for file in matching_files:
                    df = await extract_excel_data(
                        os.path.join(root, file),
                        sheet_name,
                        header_row,
                        data_start_row,
                        os.path.basename(root)
                    )
                    dfs.append(df)
            
            if dfs:
                combined_df = pd.concat(dfs, ignore_index=True)
                dataframes.append(combined_df)
            else:
                logger.warning(f"No files found for pattern: {file_prefix}")
                dataframes.append(pd.DataFrame())
        
        return tuple(dataframes)
    
    except Exception as e:
        logger.error(f"Failed to extract all data: {str(e)}")
        raise