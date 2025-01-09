import logging
from typing import Optional, Callable
from functools import lru_cache
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from dependency_injector import containers, providers
from dependency_injector.wiring import inject, Provide
from pymongo.errors import ConnectionFailure, OperationFailure
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.auth import auth_handler
auth_scheme = HTTPBearer()


from app.services.task_analytics_service import TaskAnalyticsService
from app.utils.database_connection import DatabaseConnection
from app.models.user import UserInDB
from app.core.config import Settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DependencyError(Exception):
    """Custom exception for dependency-related errors"""
    pass

class SecurityConfig:
    """Security configuration for the application"""
    oauth2_scheme = OAuth2PasswordBearer(
        tokenUrl="login",
        scheme_name="JWT",
        auto_error=True
    )

class Container(containers.DeclarativeContainer):
    """Dependency Injection Container"""
    
    config = providers.Singleton(Settings)
    
    # Database
    database_connection = providers.Singleton(
        DatabaseConnection,
        config=config
    )
    
    # Services
    task_analytics_service = providers.Factory(
        TaskAnalyticsService,
        db=database_connection
    )
    
    # Add lifecycle hooks for proper initialization and cleanup
    def init_resources(self) -> None:
        """Initialize container resources"""
        try:
            logger.info("Initializing container resources")
            self.database_connection().ping()
        except Exception as e:
            logger.error(f"Failed to initialize container resources: {str(e)}")
            raise DependencyError("Failed to initialize dependencies")
    
    def cleanup_resources(self) -> None:
        """Cleanup container resources"""
        try:
            logger.info("Cleaning up container resources")
            self.database_connection().close()
        except Exception as e:
            logger.error(f"Error during resource cleanup: {str(e)}")

@lru_cache()
def get_container() -> Container:
    """
    Get or create the dependency injection container.
    
    Returns:
        Container: Application's DI container
        
    Raises:
        DependencyError: If container initialization fails
    """
    try:
        container = Container()
        container.init_resources()
        return container
    except Exception as e:
        logger.error(f"Failed to create container: {str(e)}")
        raise DependencyError("Failed to initialize dependency container")

@lru_cache()
def get_settings() -> Settings:
    """
    Get application settings.
    
    Returns:
        Settings: Application settings
        
    Raises:
        DependencyError: If settings initialization fails
    """
    try:
        return Settings()
    except Exception as e:
        logger.error(f"Failed to load settings: {str(e)}")
        raise DependencyError("Failed to load application settings")

async def get_task_service(
    container: Container = Depends(get_container)
) -> TaskAnalyticsService:
    """
    Get TaskAnalyticsService instance.
    
    Args:
        container: DI container
        
    Returns:
        TaskAnalyticsService: Service instance
        
    Raises:
        HTTPException: If service initialization fails
    """
    try:
        service = container.task_analytics_service()
        logger.debug("TaskAnalyticsService instance created")
        return service
    except Exception as e:
        logger.error(f"Failed to create TaskAnalyticsService: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service temporarily unavailable"
        )

async def get_current_user(
    request: Request,
    token: str = Depends(SecurityConfig.oauth2_scheme)
) -> UserInDB:
    """
    Get current authenticated user.
    
    Args:
        request: FastAPI request
        token: JWT token
        
    Returns:
        UserInDB: Current user
        
    Raises:
        HTTPException: If authentication fails
    """
    try:
        # Get client info for logging
        client_host = request.client.host if request.client else "unknown"
        
        logger.info(f"Authenticating user from {client_host}")
        
        # Validate token and get user
        user = await auth_handler.get_user_from_token(token)
        
        if not user:
            logger.warning(f"Invalid token attempt from {client_host}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Check if user is active
        if not getattr(user, 'is_active', True):
            logger.warning(f"Inactive user attempt: {user.username}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Inactive user"
            )
            
        logger.info(f"User authenticated: {user.username}")
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

def validate_permissions(required_permissions: list) -> Callable:
    """
    Create a dependency for permission validation.
    
    Args:
        required_permissions: List of required permissions
        
    Returns:
        Callable: Dependency function
        
    Usage:
        @router.get("/protected", dependencies=[Depends(validate_permissions(["read:items"]))])
    """
    async def permission_dependency(
        current_user: UserInDB = Depends(get_current_user)
    ) -> None:
        user_permissions = getattr(current_user, 'permissions', [])
        
        logger.debug(f"Checking permissions for user {current_user.username}")
        logger.debug(f"Required: {required_permissions}")
        logger.debug(f"User has: {user_permissions}")
        
        if not all(perm in user_permissions for perm in required_permissions):
            logger.warning(
                f"Permission denied for user {current_user.username}"
                f" - Required: {required_permissions}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
            
        logger.info(f"Permission check passed for user {current_user.username}")
    
    return permission_dependency

# Shutdown event handler
async def shutdown_container() -> None:
    """Cleanup resources on application shutdown"""
    try:
        container = get_container()
        container.cleanup_resources()
        logger.info("Container resources cleaned up")
    except Exception as e:
        logger.error(f"Error during container cleanup: {str(e)}")