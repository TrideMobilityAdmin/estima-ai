from fastapi import FastAPI
from app.api.v1 import data_routes, auth_routes
from fastapi.middleware.cors import CORSMiddleware
from app.middleware.csrf_protect import CSRFMiddleware
from app.middleware.host_header_middleware import HostValidationMiddleware
from app.middleware.method_restrict_middleware import MethodRestrictionMiddleware

app = FastAPI(
    title="Estamaai APIs",
    description="API for aircraft maintenance estimation and analysis",
    version="1.0.0",
)

app.include_router(auth_routes.router)
app.include_router(data_routes.router)


TRUSTED_ORIGINS = [
    "http://10.100.3.13:80",
    "http://10.100.3.13/",
    "http://localhost:5173",
    "http://localhost:80",
    "https://localhost:3000",
    "http://localhost:8000/docs#",
    "http://10.100.3.13:8000/api/v1",
    "http://10.100.3.13:8000/docs",
    "http://10.100.3.13:8000/",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=TRUSTED_ORIGINS,
    # allow_origins=["*"],  # Use ["http://localhost:3000"] for better security
    allow_credentials=True,
    # allow_methods=["*"],
    allow_methods=["GET", "POST", "PUT", "DELETE"], 
    # allow_headers=["*"],
    allow_headers=["Authorization", "Content-Type", "X-CSRF-Token"],
)

app.add_middleware(CSRFMiddleware)
app.add_middleware(HostValidationMiddleware)
app.add_middleware(MethodRestrictionMiddleware)

@app.get("/")
async def root():
    return {"message": "Welcome to Estamaai APIs!"}


