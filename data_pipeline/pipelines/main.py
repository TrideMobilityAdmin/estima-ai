import sys
import os
import asyncio
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from extract.extract import connect_to_database, get_processed_files
from transform.transform import clean_data
from load.load import append_to_database
import os


from pathlib import Path

# `cwd`: current directory is straightforward
cwd = Path.cwd()
dir = os.path.dirname(__file__)

async def main():
    """
    Main execution function to manage the data pipeline.
    """
    try:
        print("Starting main process...")
        db = await connect_to_database()
        if db is None:
            print("Failed to connect to database")
            return
        

        data_path = os.path.join(dir,"..","..", "Data", "2024")
        aircraft_details, task_description, task_parts, sub_task_description, sub_task_parts = await get_processed_files(
            data_path, "mltaskmlsec1", "mlttable", "mldpmlsec1", "Material Consumption Pricing"
        )

        collections_to_process = [
            ("aircraft_details", aircraft_details),
            ("task_description", task_description),
            ("task_parts", task_parts),
            ("sub_task_description", sub_task_description),
            ("sub_task_parts", sub_task_parts)
        ]

        for collection_name, dataframe in collections_to_process:
            if not dataframe.empty:
                try:
                    processed_data = clean_data(dataframe)
                    await append_to_database(db[collection_name], processed_data)
                except Exception as collection_error:
                    print(f"Error processing {collection_name}: {collection_error}")

        print("Process completed")
    except Exception as e:
        print(f"Unexpected error in main: {e}")

if __name__ == "__main__":
    asyncio.run(main())
