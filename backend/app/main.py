from fastapi import FastAPI
from app.api.v1 import data_routes
from app.core.dependencies import shutdown_container

app = FastAPI()

app.include_router(data_routes.router, prefix="/api/v1", tags=["Analytics"])

@app.on_event("shutdown")
async def shutdown():
    await shutdown_container()
