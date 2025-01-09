import logging
from typing import Optional, List, Dict, Any
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.errors import (
    ConnectionFailure, 
    OperationFailure, 
    ServerSelectionTimeoutError,
)
from app.core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DatabaseError(Exception):
    """Custom exception for database-related errors"""
    pass

class DatabaseConnection:
    _client_instance: Optional[MongoClient] = None
    
    def __new__(cls, *args, **kwargs) -> 'DatabaseConnection':
        if cls._client_instance is None:
            # Only initialize the connection once
            cls._client_instance = cls._connect_to_mongo()
        return super(DatabaseConnection, cls).__new__(cls)

    def __init__(self, config: Optional[dict] = None):
        # Initialize instance variables here if needed
        self.logger = logging.getLogger(__name__)
        self.config = config

    @staticmethod
    def _connect_to_mongo() -> MongoClient:
        """
        Establish a connection to MongoDB with proper error handling.
        
        Returns:
            MongoClient: MongoDB client instance
            
        Raises:
            DatabaseError: If connection fails
        """
        try:
            mongo_uri = settings.DATABASE_URL
            client = MongoClient(
                mongo_uri,
                serverSelectionTimeoutMS=5000  # 5 second timeout
            )
            # Verify connection
            client.admin.command('ping')
            logger.info("Successfully connected to MongoDB")
            return client
            
        except ConnectionFailure as e:
            logger.error(f"Failed to connect to MongoDB: {str(e)}")
            raise DatabaseError(f"Could not connect to MongoDB: {str(e)}")
            
        except ServerSelectionTimeoutError as e:
            logger.error(f"Server selection timeout: {str(e)}")
            raise DatabaseError(f"Server selection timeout: {str(e)}")
            
        except Exception as e:
            logger.error(f"Unexpected error while connecting to MongoDB: {str(e)}")
            raise DatabaseError(f"Unexpected error while connecting: {str(e)}")

    def get_database(self, db_name: str) -> Database:
        """
        Get a database instance.
        
        Args:
            db_name: Name of the database
            
        Returns:
            Database instance
            
        Raises:
            DatabaseError: If database access fails
        """
        try:
            return self._client_instance[db_name]
        except Exception as e:
            logger.error(f"Error accessing database {db_name}: {str(e)}")
            raise DatabaseError(f"Could not access database {db_name}: {str(e)}")

    def get_collection(self, db_name: str, collection_name: str) -> Collection:
        """
        Retrieve a specific collection from a MongoDB database.
        
        Args:
            db_name: Name of the database
            collection_name: Name of the collection
            
        Returns:
            Collection instance
            
        Raises:
            DatabaseError: If collection access fails
        """
        try:
            database = self.get_database(db_name)
            return database[collection_name]
            
        except DatabaseError as e:
            logger.error(f"Database error while accessing collection {collection_name}: {str(e)}")
            raise
            
        except Exception as e:
            logger.error(f"Error accessing collection {collection_name} in database {db_name}: {str(e)}")
            raise DatabaseError(f"Could not access collection {collection_name}: {str(e)}")

    def execute_query(self, db_name: str, collection_name: str, query: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Perform a query on a MongoDB collection.
        
        Args:
            db_name: Name of the database
            collection_name: Name of the collection
            query: MongoDB query dictionary
            
        Returns:
            List of documents matching the query
            
        Raises:
            DatabaseError: If query execution fails
        """
        try:
            collection = self.get_collection(db_name, collection_name)
            return list(collection.find(query))
            
        except OperationFailure as e:
            logger.error(f"Query operation failed on {collection_name}: {str(e)}")
            raise DatabaseError(f"Query operation failed: {str(e)}")
            
        except Exception as e:
            logger.error(f"Error executing query on {collection_name}: {str(e)}")
            raise DatabaseError(f"Error executing query: {str(e)}")

    def execute_aggregation(self, db_name: str, collection_name: str, pipeline: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Perform an aggregation on a MongoDB collection.
        
        Args:
            db_name: Name of the database
            collection_name: Name of the collection
            pipeline: MongoDB aggregation pipeline
            
        Returns:
            List of documents from the aggregation result
            
        Raises:
            DatabaseError: If aggregation execution fails
        """
        try:
            collection = self.get_collection(db_name, collection_name)
            return list(collection.aggregate(pipeline))
            
        except OperationFailure as e:
            logger.error(f"Aggregation operation failed on {collection_name}: {str(e)}")
            raise DatabaseError(f"Aggregation operation failed: {str(e)}")
            
        except Exception as e:
            logger.error(f"Error executing aggregation on {collection_name}: {str(e)}")
            raise DatabaseError(f"Error executing aggregation: {str(e)}")

    def __del__(self):
        """Cleanup method to close the MongoDB connection"""
        if self._client_instance:
            try:
                self._client_instance.close()
                logger.info("MongoDB connection closed")
            except Exception as e:
                logger.error(f"Error closing MongoDB connection: {str(e)}")


if __name__ == "__main__":
    try:
        # Instantiate the database connection
        db_connection = DatabaseConnection()

        # Test get_collection and execute_query
        query_result = db_connection.execute_query(
            "gmr-mro",
            "user",
            {"role": "admin"}
        )
        logger.info(f"Query Result: {query_result}")

    except DatabaseError as e:
        logger.error(f"Database operation failed: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")