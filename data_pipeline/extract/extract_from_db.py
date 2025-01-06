import duckdb
from prefect import task

@task
def connect_to_database(db_name="Mro_warehouse.db"):
    """
    Connect to the DuckDB database.
    """
    return duckdb.connect(db_name)

@task
def get_processed_files(con):
    """
    Get a list of already processed files from the metadata table.
    """
    try:
        return con.execute("SELECT file_name FROM Processed_Files").fetchdf()["file_name"].tolist()
    except Exception as e:
        print(f"Error fetching processed files: {e}")
        return []
