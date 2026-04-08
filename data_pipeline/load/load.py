from datetime import timedelta, datetime
import pandas as pd
import numpy as np
import logging

# Get logger
logger = logging.getLogger(__name__)

def append_to_database(collection, data):
    """
    Insert cleaned data into MongoDB collection in batches.
    Properly handles datetime and timedelta objects.
    """
    try:
        if data.empty:
            print("Empty dataframe received. Skipping database insertion.")
            return None

        records = data.to_dict(orient="records")
        
        def convert_value(value):
            """Convert various data types to MongoDB-compatible formats."""
            # Handle pandas/numpy NaT (Not a Time)
            if pd.isna(value):
                return None
            # Handle timedelta
            elif isinstance(value, timedelta):
                return value.total_seconds()
            # Handle pandas Timestamp (including timezone-aware)
            elif isinstance(value, pd.Timestamp):
                return value.to_pydatetime()
            # Handle numpy datetime64
            elif isinstance(value, np.datetime64):
                return pd.Timestamp(value).to_pydatetime()
            # Handle datetime objects with timezone (keep as-is for MongoDB)
            elif isinstance(value, datetime):
                return value
            # Handle date objects
            elif hasattr(value, "isoformat"):  # datetime, date, time-like objects
                try:
                    return value if isinstance(value, datetime) else value.isoformat()
                except:
                    return str(value)
            # Default: return as-is
            else:
                return value
        
        cleaned_records = [
            {key: convert_value(value) for key, value in record.items()}
            for record in records
        ]

        inserted_count = 0
        for i in range(0, len(cleaned_records), 1000):
            batch = cleaned_records[i:i + 1000]
            try:
                result =  collection.insert_many(batch)
                inserted_count += len(result.inserted_ids)
            except Exception as batch_error:
                # Log serialization errors but don't print them - they're often non-fatal
                error_str = str(batch_error).lower()
                if "cannot interpret" not in error_str and "datetime64" not in error_str:
                    print(f"Error inserting batch {i // 1000}: {batch_error}")
                    logger.warning(f"Error inserting batch {i // 1000}: {batch_error}")
                # Continue trying to insert other batches

        print(f"Successfully inserted {inserted_count} documents")
        return inserted_count
    except Exception as e:
        print(f"Error in append_to_database: {e}")
        return None