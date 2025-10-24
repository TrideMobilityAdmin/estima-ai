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

# Define allowed origins
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://10.100.3.13",
    "http://10.100.3.13:80",
    "http://10.100.3.13:8000",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:5173"
]

# Add CORS middleware with more specific configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=None,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Content-Type",
        "Authorization", 
        "Accept",
        "Origin",
        "X-CSRF-Token",
        "X-Csrf-Token",
        "Cookie",
    ],
    expose_headers=[
        "Content-Type",
        "Authorization",
        "X-CSRF-Token",
        "X-Csrf-Token",
        "Set-Cookie"
    ],
    max_age=3600,
    allow_origins_regex=None
)
# Add CSRF Protection Middleware
app.add_middleware(CSRFMiddleware)

# Add global CORS handler
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    """Add CORS headers to all responses, including error responses"""
    origin = request.headers.get("origin")
    
    try:
        response = await call_next(request)
    except Exception as e:
        # Create a JSON response for the error
        response = JSONResponse(
            status_code=500,
            content={"detail": str(e)}
        )
        # Log the error for debugging
        print(f"Server Error: {str(e)}")
    
    # Add CORS headers to all responses, including errors
    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept, Origin, X-CSRF-Token, X-Csrf-Token, Cookie"
        response.headers["Access-Control-Expose-Headers"] = "Content-Type, Authorization, X-CSRF-Token, X-Csrf-Token, Set-Cookie"
        response.headers["Vary"] = "Origin, Access-Control-Request-Method, Access-Control-Request-Headers"
    
    # Debug headers
    print(f"Response Headers: {dict(response.headers)}")
    print(f"Request Origin: {origin}")
    print(f"Status Code: {response.status_code}")
    
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
    
    response = JSONResponse(
        content={"message": "OK"},
        status_code=200
    )
    
    if origin in ALLOWED_ORIGINS:
        response.headers.update({
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Origin, X-CSRF-Token, X-Csrf-Token, Cookie",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600",
            "Access-Control-Expose-Headers": "Content-Type, Authorization, X-CSRF-Token, X-Csrf-Token, Set-Cookie",
            "Vary": "Origin, Access-Control-Request-Method, Access-Control-Request-Headers"
        })
    
    # Debug logging for preflight requests
    print(f"Preflight Request Headers: {dict(request.headers)}")
    print(f"Preflight Response Headers: {dict(response.headers)}")
    
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