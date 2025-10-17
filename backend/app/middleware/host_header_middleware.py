from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

ALLOWED_HOSTS = {"localhost", "127.0.0.1","127.0.0.1:8000","10.100.3.13", "10.100.3.13:8000","10.100.3.13:80"}

class HostValidationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        host = request.headers.get("host", "")
        forwarded_host = request.headers.get("x-forwarded-host", "")

        if host not in ALLOWED_HOSTS and forwarded_host not in ALLOWED_HOSTS:
            raise HTTPException(status_code=400, detail="Invalid Host header")

        return await call_next(request)
