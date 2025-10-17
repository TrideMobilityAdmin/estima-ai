from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

class MethodRestrictionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 🚫 Always block TRACE for security
        if request.method == "TRACE":
            raise HTTPException(status_code=405, detail="TRACE method not allowed")

        # ✅ Allow OPTIONS only for safe (CORS preflight) routes
        ALLOWED_OPTIONS_PATHS = [
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/logout",
            "/api/v1/auth/change_password",
            "/docs",
            "/openapi.json",
        ]

        if request.method == "OPTIONS" and request.url.path not in ALLOWED_OPTIONS_PATHS:
            raise HTTPException(status_code=405, detail="OPTIONS method not allowed")

        return await call_next(request)
