import duckdb

class DatabaseConnection:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = duckdb.connect("Mro_warehouse.db")
        return cls._instance

    def execute_query(self, query: str, params: tuple):
        return self._instance.execute(query, params).fetchall()
