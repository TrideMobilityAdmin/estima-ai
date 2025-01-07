from app.services.task_analytics_service import TaskAnalyticsService
from app.utils.database_connection import DatabaseConnection
from dependency_injector import containers, providers
# core/dependencies.py
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from typing import List, Optional
from .auth import get_user_from_token
from app.models.user import UserInDB

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class Container(containers.DeclarativeContainer):
    database_connection = providers.Singleton(DatabaseConnection)
    task_analytics_service = providers.Factory(TaskAnalyticsService, db=database_connection)
    
def get_task_service():
    container = Container()
    return container.task_analytics_service()


# Dependency to get current user from token
def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    user = get_user_from_token(token)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user
