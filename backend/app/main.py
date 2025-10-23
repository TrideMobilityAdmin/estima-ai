from fastapi import FastAPI
from app.api.v1 import data_routes, auth_routes
from fastapi.middleware.cors import CORSMiddleware

from app.middleware.csrf_middleware import CSRFMiddleware


app = FastAPI(
    title="Estamaai APIs",
    description="API for aircraft maintenance estimation and analysis",
    version="1.0.0",
)

# app.include_router(auth_routes.router)
# app.include_router(data_routes.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://10.100.3.13/",
        "http://10.100.3.13/",
        "http://10.100.3.13:80",
        ],  # Use ["http://localhost:3000"] for better security
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-CSRF-Token"],
    # expose_headers=["X-CSRF-Token"],
)
# Add CSRF Protection Middleware
app.add_middleware(CSRFMiddleware)

app.include_router(auth_routes.router)
app.include_router(data_routes.router)

@app.get("/")
async def root():
    return {"message": "Welcome to Estamaai APIs!"}
