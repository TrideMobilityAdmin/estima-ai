from datetime import timedelta
import pandas as pd

async def append_to_database(collection, data):
    """
    Insert cleaned data into MongoDB collection in batches.
    """
    try:
        if data.empty:
            print("Empty dataframe received. Skipping database insertion.")
            return None

        records = data.to_dict(orient="records")
        cleaned_records = [
            {key: (value.total_seconds() if isinstance(value, timedelta) else None if pd.isna(value) else value)
             for key, value in record.items()}
            for record in records
        ]

        inserted_count = 0
        for i in range(0, len(cleaned_records), 1000):
            batch = cleaned_records[i:i + 1000]
            try:
                result = await collection.insert_many(batch)
                inserted_count += len(result.inserted_ids)
            except Exception as batch_error:
                print(f"Error inserting batch {i // 1000}: {batch_error}")

        print(f"Successfully inserted {inserted_count} documents")
        return inserted_count
    except Exception as e:
        print(f"Error in append_to_database: {e}")
        return None