from fastapi import FastAPI
from app.api.v1 import data_routes, auth_routes
from fastapi.middleware.cors import CORSMiddleware

from app.middleware.csrf_middleware import CSRFMiddleware
from app.middleware.security_header_middleware import SecurityHeadersMiddleware


app = FastAPI(
    title="Estamaai APIs",
    description="API for aircraft maintenance estimation and analysis",
    version="1.0.0",
)



app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://estimaai.gmrgroup.in",
        "http://localhost:5173",
        "https://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "https://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["POST", "GET", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-CSRF-Token", "Cookie", "X-Csrf-Token"],
    expose_headers=["X-CSRF-Token", "X-Csrf-Token", "Set-Cookie"],
)
# Add CSRF Protection Middleware
app.add_middleware(CSRFMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

app.include_router(auth_routes.router)
app.include_router(data_routes.router)

@app.get("/")
async def root():
    return {"message": "Welcome to Estamaai APIs!"}
