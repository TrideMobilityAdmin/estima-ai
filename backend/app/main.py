from fastapi import FastAPI
from app.api.v1 import data_routes

app = FastAPI()

app.include_router(data_routes.router, prefix="/api/v1", tags=["Analytics"])
