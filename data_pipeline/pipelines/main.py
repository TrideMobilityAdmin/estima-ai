# main.py
from prefect import flow
from extract.extract import connect_to_database, get_all_data
from transform.transform import transform_all_data
from load.load import load_all_data
from prefect import get_run_logger

logger = get_run_logger()

@flow(name="GMR MRO ETL Pipeline")
async def main_flow():
    """Main ETL flow that orchestrates the entire pipeline."""
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

if __name__ == "__main__":
    from prefect.engine import get_default_executor
    executor = get_default_executor()
    executor.submit(main_flow())