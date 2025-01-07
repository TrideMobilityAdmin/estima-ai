from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.base import RequestResponseEndpoint
from starlette.responses import JSONResponse
from app.pyjwt.jwt import validate_token

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint):
        auth_header = request.headers.get("Authorization")
        if auth_header is None:
            return JSONResponse(status_code=401, content={"error": "Authorization header is missing"})
        
        auth_parts = auth_header.split(" ")
        if len(auth_parts) != 2 or auth_parts[0] != "Bearer":
            return JSONResponse(status_code=401, content={"error": "Invalid token format"})
        
        token = auth_parts[1]
        username = validate_token(token)
        if username is None:
            return JSONResponse(status_code=401, content={"error": "Invalid token"})
        
        request.state.user = username
        response = await call_next(request)
        return response