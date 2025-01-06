from prefect import task

@task
def append_to_database(con, data, table_name="Mro_data"):
    """
    Append data to the specified DuckDB table.
    """
    con.register("temp_data", data)
    con.execute(f"""
    CREATE TABLE IF NOT EXISTS {table_name} AS SELECT * FROM temp_data;
    """)
    con.execute(f"""
    INSERT INTO {table_name} SELECT * FROM temp_data;
    """)
