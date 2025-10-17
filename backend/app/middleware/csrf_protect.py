# app/middleware/csrf_protect.py
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        SAFE_METHODS = ("GET", "HEAD", "OPTIONS", "TRACE")

        # Paths to skip CSRF validation
        EXEMPT_PATHS = [
            "/api/v1/auth/login",
            "/api/v1/auth/logout",
            "/docs",
            "/openapi.json",
            "/api/v1/auth/register"
        ]

        # Skip validation for safe methods or exempted endpoints
        if request.method in SAFE_METHODS or request.url.path in EXEMPT_PATHS:
            return await call_next(request)

        csrf_token = request.headers.get("X-CSRF-Token")
        session_token = request.cookies.get("csrf_token")
        

        if not csrf_token or not session_token or csrf_token != session_token:
            raise HTTPException(status_code=403, detail="CSRF validation failed")

        return await call_next(request)
