import logging
from typing import List, Dict, Any, Optional
from statistics import mean
from fastapi import HTTPException
from pydantic import ValidationError
from pymongo.errors import OperationFailure, ServerSelectionTimeoutError

from app.utils.database_connection import DatabaseConnection
from app.models.task_models import TaskProbabilityModel, TaskManHoursModel, SparePartsModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class TaskAnalyticsError(Exception):
    """Custom exception for Task Analytics related errors"""
    pass

class TaskAnalyticsService:
    def __init__(self, db: DatabaseConnection):
        """
        Initialize TaskAnalyticsService with database connection.
        
        Args:
            db: DatabaseConnection instance
        """
        self.db = db
        self.logger = logging.getLogger(__name__)

    def _validate_source_task(self, source_task: str) -> None:
        """
        Validate source_task parameter.
        
        Args:
            source_task: Task identifier to validate
            
        Raises:
            HTTPException: If validation fails
        """
        if not source_task or not isinstance(source_task, str):
            self.logger.error(f"Invalid source_task parameter: {source_task}")
            raise HTTPException(
                status_code=400,
                detail="Invalid source_task parameter. Must be a non-empty string."
            )

    def _safe_get_field(self, document: Dict[str, Any], field: str) -> Optional[Any]:
        """
        Safely extract field from document with logging.
        
        Args:
            document: MongoDB document
            field: Field to extract
            
        Returns:
            Field value or None if not found
        """
        value = document.get(field)
        if value is None:
            self.logger.warning(f"Field '{field}' not found in document")
        return value

    def get_findings(self, source_task: str) -> TaskProbabilityModel:
        """
        Retrieves findings data from the MongoDB collection.
        
        Args:
            source_task: Source task identifier
            
        Returns:
            TaskProbabilityModel instance
            
        Raises:
            HTTPException: If data not found or other errors occur
        """
        self.logger.info(f"Retrieving findings for source_task: {source_task}")
        self._validate_source_task(source_task)

        try:
            query = {"SourceTask": source_task}
            results = self.db.execute_query("gmr-mro", "Mro_data", query)

            if not results:
                self.logger.warning(f"No findings data found for source_task: {source_task}")
                raise HTTPException(
                    status_code=404,
                    detail=f"No data found for Source_Task: {source_task}"
                )

            findings = []
            probs = []
            for result in results:
                finding = self._safe_get_field(result, "Findings")
                prob = self._safe_get_field(result, "Probs")
                if finding is not None and prob is not None:
                    findings.append(finding)
                    probs.append(prob)

            if not findings or not probs:
                self.logger.error(f"Missing required fields in findings data for source_task: {source_task}")
                raise HTTPException(
                    status_code=404,
                    detail="Missing required fields in findings data"
                )

            return TaskProbabilityModel(
                Source_Task=source_task,
                Findings=findings,
                Probs=probs
            )

        except ValidationError as e:
            self.logger.error(f"Validation error in findings data: {str(e)}")
            raise HTTPException(status_code=422, detail=str(e))
        except (OperationFailure, ServerSelectionTimeoutError) as e:
            self.logger.error(f"Database operation failed for findings: {str(e)}")
            raise HTTPException(status_code=503, detail="Database operation failed")
        except Exception as e:
            self.logger.error(f"Unexpected error in get_findings: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal server error")

    def get_man_hours(self, source_task: str) -> TaskManHoursModel:
        """
        Retrieves man-hours data using aggregation.
        
        Args:
            source_task: Source task identifier
            
        Returns:
            TaskManHoursModel instance
            
        Raises:
            HTTPException: If data not found or other errors occur
        """
        self.logger.info(f"Retrieving man hours for source_task: {source_task}")
        self._validate_source_task(source_task)

        try:
            pipeline = [
                {
                    "$match": {"SourceTask": source_task}
                },
                {
                    "$project": {
                        "ActualManHrs": 1
                    }
                }
            ]

            results = self.db.execute_aggregation("gmr-mro", "spares-costing", pipeline)

            if not results:
                self.logger.warning(f"No man hours data found for source_task: {source_task}")
                raise HTTPException(
                    status_code=404,
                    detail=f"No data found for SourceTask: {source_task}"
                )

            manhours = [
                result["ActualManHrs"] 
                for result in results 
                if self._safe_get_field(result, "ActualManHrs") is not None
            ]

            if not manhours:
                self.logger.error(f"No valid manhours data for source_task: {source_task}")
                raise HTTPException(
                    status_code=404,
                    detail=f"No valid manhours data for SourceTask: {source_task}"
                )

            return TaskManHoursModel(
                Source_Task=source_task,
                Max=max(manhours),
                Min=min(manhours),
                Avg=mean(manhours)
            )

        except ValidationError as e:
            self.logger.error(f"Validation error in man hours data: {str(e)}")
            raise HTTPException(status_code=422, detail=str(e))
        except (OperationFailure, ServerSelectionTimeoutError) as e:
            self.logger.error(f"Database operation failed for man hours: {str(e)}")
            raise HTTPException(status_code=503, detail="Database operation failed")
        except Exception as e:
            self.logger.error(f"Unexpected error in get_man_hours: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal server error")

    def get_spare_parts(self, source_task: str) -> SparePartsModel:
        """
        Retrieves spare parts data from the MongoDB collection.
        
        Args:
            source_task: Source task identifier
            
        Returns:
            SparePartsModel instance
            
        Raises:
            HTTPException: If data not found or other errors occur
        """
        self.logger.info(f"Retrieving spare parts for source_task: {source_task}")
        self._validate_source_task(source_task)

        try:
            query = {"SourceTask": source_task}
            results = self.db.execute_query("gmr-mro", "Mro_data", query)

            if not results:
                self.logger.warning(f"No spare parts data found for source_task: {source_task}")
                raise HTTPException(
                    status_code=404,
                    detail=f"No spare parts found for Source_Task: {source_task}"
                )

            parts = []
            prices = []
            for result in results:
                part = self._safe_get_field(result, "parts")
                price = self._safe_get_field(result, "price")
                if part is not None and price is not None:
                    parts.append(part)
                    prices.append(price)

            if not parts or not prices:
                self.logger.error(f"Missing required fields in spare parts data for source_task: {source_task}")
                raise HTTPException(
                    status_code=404,
                    detail="Missing required fields in spare parts data"
                )

            return SparePartsModel(
                Source_Task=source_task,
                Parts=parts,
                Price=prices
            )

        except ValidationError as e:
            self.logger.error(f"Validation error in spare parts data: {str(e)}")
            raise HTTPException(status_code=422, detail=str(e))
        except (OperationFailure, ServerSelectionTimeoutError) as e:
            self.logger.error(f"Database operation failed for spare parts: {str(e)}")
            raise HTTPException(status_code=503, detail="Database operation failed")
        except Exception as e:
            self.logger.error(f"Unexpected error in get_spare_parts: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal server error")