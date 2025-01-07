from fastapi import FastAPI
from app.api.v1 import data_routes
from app.services.user import router as user_routes
from app.middleware.auth import AuthMiddleware

app = FastAPI()
app.add_middleware(AuthMiddleware)
# app.include_router(data_routes.router, prefix="/api/v1", tags=["Analytics"])
app.include_router(data_routes.router, prefix="/api/v1", tags=["Auth"])
app.include_router(user_routes.router, prefix="/api/v1/users", tags=["Users"])