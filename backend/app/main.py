from fastapi import FastAPI, Request
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
        "http://localhost:5174",
        "http://10.100.3.13",
        "http://10.100.3.13:80",
        "http://10.100.3.13:8000",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:5173"],

          # Use ["http://localhost:3000"] for better security
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-CSRF-Token", "Cookie", "X-Csrf-Token"],
    expose_headers=["X-CSRF-Token", "X-Csrf-Token", "Set-Cookie"],
)
# Add CSRF Protection Middleware
app.add_middleware(CSRFMiddleware)

app.include_router(auth_routes.router)
app.include_router(data_routes.router)

@app.get("/")
async def root():
    return {"message": "Welcome to Estamaai APIs!"}

@app.get("/health")
async def health_check():
    """Simple health check endpoint without CSRF"""
    return {"status": "healthy", "message": "Server is running"}

@app.options("/{path:path}")
async def options_handler(path: str):
    """Handle CORS preflight requests"""
    return {"message": "OK"}

@app.get("/debug/csrf")
async def debug_csrf(request: Request): 
    """Debug endpoint to check CSRF token status"""
    return {
        "headers": dict(request.headers),
        "cookies": dict(request.cookies),
        "csrf_header": request.headers.get("X-CSRF-Token"),
        "csrf_cookie": request.cookies.get("csrf_token"),
        "method": request.method,
        "url": str(request.url)
    }

@app.get("/debug/cors")
async def debug_cors(request: Request):
    """Debug endpoint to test CORS configuration"""
    return {
        "message": "CORS test successful",
        "origin": request.headers.get("origin"),
        "method": request.method,
        "headers": dict(request.headers)
    }