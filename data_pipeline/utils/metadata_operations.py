import pandas as pd
from prefect import task

@task
def ensure_metadata_table_exists(con):
    """
    Ensure the metadata table exists to track processed files.
    """
    con.execute("""
    CREATE TABLE IF NOT EXISTS Processed_Files (
        file_name TEXT PRIMARY KEY
    );
    """)

@task
def update_metadata_table(con, new_files):
    """
    Update the metadata table with newly processed files.
    """
    processed_files_df = pd.DataFrame({"file_name": new_files})
    con.register("processed_files_df", processed_files_df)
    con.execute("""
    INSERT INTO Processed_Files SELECT * FROM processed_files_df;
    """)
