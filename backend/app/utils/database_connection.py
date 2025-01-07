from pymongo import MongoClient
from app.core.config import settings


class DatabaseConnection:
    _client_instance = None

    def __new__(cls):
        if cls._client_instance is None:
            cls._client_instance = cls._connect_to_mongo()
        return super(DatabaseConnection, cls).__new__(cls)

    @staticmethod
    def _connect_to_mongo():
        """
        Establish a connection to MongoDB.
        """
        try:
            mongo_uri = settings.DATABASE_URL  # Connection string from config
            client = MongoClient(mongo_uri)
            print("Successfully connected to MongoDB.")
            return client
        except Exception as e:
            raise ConnectionError(f"Error connecting to MongoDB: {e}")

    def get_collection(self, db_name: str, collection_name: str):
        """
        Retrieve a specific collection from a MongoDB database.
        """
        try:
            database = self._client_instance[db_name]
            return database[collection_name]
        except Exception as e:
            raise ValueError(f"Error accessing collection {collection_name} in database {db_name}: {e}")

    def execute_query(self, db_name: str, collection_name: str, query: dict):
        """
        Perform a query on a MongoDB collection.
        """
        try:
            collection = self.get_collection(db_name, collection_name)
            return list(collection.find(query))
        except Exception as e:
            raise ValueError(f"Error executing query on {collection_name}: {e}")


if __name__ == "__main__":
    # Instantiate the database connection
    db_connection = DatabaseConnection()

    # Test get_collection and execute_query
    try:
        # Replace "gmr-mro" with your database name and "user" with your collection name
        collection = db_connection.get_collection("gmr-mro", "user")
        print(f"Collection Retrieved: {collection}")

        # Example query
        query_result = db_connection.execute_query("gmr-mro", "user", {"role": "admin"})
        print("Query Result:", query_result)
    except Exception as e:
        print("An error occurred:", e)
