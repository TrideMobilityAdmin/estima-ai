from prefect import flow
from data_pipeline.extract.extract_from_db import get_processed_files, connect_to_database
from data_pipeline.utils.metadata_operations import ensure_metadata_table_exists, update_metadata_table
from data_pipeline.utils.file_operations import get_excel_files
from data_pipeline.transform.clean_data import clean_data
from data_pipeline.load.load_to_db import append_to_database

@flow
def etl_pipeline():
    """
    Prefect ETL Pipeline.
    """
    # Define paths and connect to the database
    excel_files_path = r"D:\DNAdithya\Projects\gmr-mro\code\Excel_Files"
    con = connect_to_database()

    # Ensure metadata table exists
    ensure_metadata_table_exists(con)

    # Get list of all Excel files and already processed files
    all_files = get_excel_files(excel_files_path)
    processed_files = get_processed_files(con)

    # Filter out already processed files
    new_files = [f for f in all_files if f not in processed_files]
    if not new_files:
        print("No new files to process.")
        con.execute("PRAGMA force_checkpoint;")
        con.close()
        return

    # Combine new Excel files and load into database
    combined_data = pd.read_excel(new_files)
    cleaned_data = clean_data(combined_data)

    append_to_database(con, cleaned_data)

    # Update metadata table with processed files
    update_metadata_table(con, new_files)

    # Finalize and close connection
    con.execute("PRAGMA force_checkpoint;")
    con.close()
    print("Data successfully imported into the database.")
