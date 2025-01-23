# main.py
from prefect import flow
from extract.extract import connect_to_database, get_all_data
from transform.transform import transform_all_data
from load.load import load_all_data
from prefect import get_run_logger
import asyncio



@flow(name="GMR MRO ETL Pipeline")
async def main_flow():
    """Main ETL flow that orchestrates the entire pipeline."""
    logger = get_run_logger()
    try:
        # Extract

        db = await connect_to_database()
        raw_data = await get_all_data()
        
        # Transform
        transformed_data = await transform_all_data(raw_data)
        
        # Load
        await load_all_data(db, transformed_data)
        
    except Exception as e:
        logger.error(f"Pipeline failed: {str(e)}")
        raise


def main():
    """Main function to run the pipeline"""
    try:
        # Create a new event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        # Run the flow
        loop.run_until_complete(main_flow())
        
        # Print results
        print("\nResults:")
        print("ETL pipeline completed successfully")

    finally:
        # Clean up
        loop.close()
        
if __name__ == "__main__":
    main()

