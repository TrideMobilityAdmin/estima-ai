from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

class MethodRestrictionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "TRACE":
            raise HTTPException(status_code=405, detail="TRACE method not allowed")
        return await call_next(request)
