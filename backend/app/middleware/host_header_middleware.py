# app/middleware/host_header_middleware.py
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

ALLOWED_HOSTS = {
    "localhost",
    "localhost:8000",
    "127.0.0.1",
    "127.0.0.1:8000",
    "10.100.3.13",
    "10.100.3.13:8000",
    "10.100.3.13:80",
    "10.100.3.13:3000",  # Add your frontend port
    "10.100.3.13:5173",  # Add your frontend port
}

class HostValidationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # ✅ Allow CORS preflight OPTIONS to pass through
        if request.method == "OPTIONS":
            return await call_next(request)

        host = request.headers.get("host", "").split(':')[0]  # Get only host without port
        referer = request.headers.get("referer", "")
        
        # Extract host from referer if present
        referer_host = ""
        if referer:
            try:
                from urllib.parse import urlparse
                referer_host = urlparse(referer).hostname
            except:
                pass

        # Allow if host is in allowed hosts or referer host is in allowed hosts
        if host in ALLOWED_HOSTS or referer_host in ALLOWED_HOSTS:
            return await call_next(request)
            
        print(f"🚫 Host validation failed: host={host}, referer_host={referer_host}")
        raise HTTPException(status_code=400, detail="Invalid Host header")