import pandas as pd
import numpy as np

def clean_data(data):
    """
    Clean and prepare the dataframe for database insertion.
    """
    try:
        if data.empty:
            return data

        data.columns = data.columns.astype(str)
        cleaned_data = data.drop_duplicates()

        for column in cleaned_data.columns:
            try:
                if pd.api.types.is_datetime64_any_dtype(cleaned_data[column]):
                    cleaned_data[column] = cleaned_data[column].apply(lambda x: x.isoformat() if pd.notnull(x) else None)
                elif pd.api.types.is_timedelta64_dtype(cleaned_data[column]):
                    cleaned_data[column] = cleaned_data[column].dt.total_seconds()
                elif np.issubdtype(cleaned_data[column].dtype, np.number):
                    cleaned_data[column] = cleaned_data[column].astype(float)
            except Exception as col_error:
                print(f"Column {column} conversion error: {col_error}")

        cleaned_data = cleaned_data.replace([float('inf'), float('-inf')], None)
        cleaned_data = cleaned_data.where(pd.notnull(cleaned_data), None)

        return cleaned_data
    except Exception as e:
        print(f"Data cleaning error: {e}")
        return data