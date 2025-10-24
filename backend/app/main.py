from fastapi import FastAPI, Request
from app.api.v1 import data_routes, auth_routes
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-CSRF-Token", "Cookie", "X-Csrf-Token"],
    expose_headers=["X-CSRF-Token", "X-Csrf-Token", "Set-Cookie"],
    max_age=3600,  # Cache preflight requests for 1 hour
)
# Add CSRF Protection Middleware
app.add_middleware(CSRFMiddleware)

# Add global CORS handler
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    """Add CORS headers to all responses, including error responses"""
    origin = request.headers.get("origin")
    allowed_origins = [
        "http://localhost:5173",
        "http://localhost:5174", 
        "http://10.100.3.13",
        "http://10.100.3.13:80",
        "http://10.100.3.13:8000",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:5173"
    ]
    
    try:
        response = await call_next(request)
    except Exception as e:
        # Create a JSON response for the error
        response = JSONResponse(
            status_code=500,
            content={"detail": str(e)}
        )
    
    # Add CORS headers to all responses, including errors
    if origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
    
    # Critical CORS headers
    response.headers.update({
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRF-Token, Cookie, X-Csrf-Token",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Expose-Headers": "X-CSRF-Token, X-Csrf-Token, Set-Cookie",
        "Vary": "Origin"  # Important for proper caching with CORS
    })
    
    return response

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
async def options_handler(path: str, request: Request):
    """Handle CORS preflight requests"""
    origin = request.headers.get("origin")
    allowed_origins = [
        "http://localhost:5173",
        "http://localhost:5174", 
        "http://10.100.3.13",
        "http://10.100.3.13:80",
        "http://10.100.3.13:8000",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:5173"
    ]
    
    response = JSONResponse({"message": "OK"})
    
    if origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
    else:
        response.headers["Access-Control-Allow-Origin"] = "*"
    
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-CSRF-Token, Cookie, X-Csrf-Token"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Max-Age"] = "86400"
    
    return response

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