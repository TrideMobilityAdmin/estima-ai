# transform.py
from prefect import task
import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple
from datetime import timedelta
from prefect import get_run_logger

@task
def clean_dataframe(df: pd.DataFrame, name: str) -> pd.DataFrame:
    """
    Cleans and transforms a DataFrame.
    
    Args:
        df: Input DataFrame to clean
        name: Name of the dataset for logging
    
    Returns:
        Cleaned DataFrame
    """
    logger = get_run_logger()
    try:
        logger.info(f"Starting cleanup for {name} dataset")
        
        if df.empty:
            logger.warning(f"Empty DataFrame received for {name}")
            return df
        
        # Convert column names to strings
        df.columns = df.columns.astype(str)
        
        # Remove duplicates
        df = df.drop_duplicates()
        logger.info(f"Removed duplicates. New shape: {df.shape}")
        
        # Handle special data types
        for column in df.columns:
            try:
                if df[column].dtype == 'datetime64[ns]' or isinstance(df[column].dtype, pd.DatetimeTZDtype):
                    df[column] = df[column].apply(
                        lambda x: x.isoformat() if pd.notnull(x) else None
                    )
                elif df[column].dtype == 'timedelta64[ns]':
                    df[column] = df[column].apply(
                        lambda x: x.total_seconds() if pd.notnull(x) else None
                    )
                elif np.issubdtype(df[column].dtype, np.number):
                    df[column] = df[column].astype(float)
            except Exception as e:
                logger.warning(f"Error processing column {column}: {str(e)}")
        
        # Replace invalid values
        df = df.replace([float('inf'), float('-inf')], None)
        df = df.where(pd.notnull(df), None)
        
        logger.info(f"Successfully cleaned {name} dataset")
        return df
    
    except Exception as e:
        logger.error(f"Error cleaning {name} dataset: {str(e)}")
        raise

@task
def transform_all_data(dataframes: Tuple[pd.DataFrame, ...]) -> Dict[str, pd.DataFrame]:
    """
    Transforms all datasets.
    
    Args:
        dataframes: Tuple of DataFrames to transform
    
    Returns:
        Dictionary of transformed DataFrames
    """
    logger = get_run_logger()
    
    try:
        names = [
            "aircraft_details",
            "task_description",
            "task_parts",
            "sub_task_description",
            "sub_task_parts"
        ]
        
        transformed_data = {}
        
        for df, name in zip(dataframes, names):
            transformed_df = clean_dataframe(df, name)
            transformed_data[name] = transformed_df
            
        return transformed_data
    
    except Exception as e:
        logger.error(f"Error in transform_all_data: {str(e)}")
        raise
