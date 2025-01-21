from fastapi import FastAPI
from app.api.v1 import data_routes,auth_routes
app = FastAPI(
    title="Estamaai APIs",
    description="API for aircraft maintenance estimation and analysis",
    version="1.0.0"
)

app.include_router(auth_routes.router)
app.include_router(data_routes.router)

@app.get("/")
async def root():
    return {"message": "Welcome to Estamaai APIs!"}