from fastapi import FastAPI
from app.api.v1 import data_routes, auth_routes
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(
    title="Estamaai APIs",
    description="API for aircraft maintenance estimation and analysis",
    version="1.0.0",
)

app.include_router(auth_routes.router)
app.include_router(data_routes.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Use ["http://localhost:3000"] for better security
    allow_credentials=True,
    allow_methods=["POST", "GET", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to Estamaai APIs!"}
