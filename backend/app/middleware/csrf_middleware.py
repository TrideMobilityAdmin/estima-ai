from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import secrets
from typing import Optional

class CSRFMiddleware(BaseHTTPMiddleware):
    """
    CSRF Protection Middleware using Double Submit Cookie pattern
    """
    
    SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}
    CSRF_HEADER_NAME = "X-CSRF-Token"
    CSRF_COOKIE_NAME = "csrf_token"
    
    # Endpoints that don't require CSRF (typically login)
    EXEMPT_PATHS = {"/api/v1/auth/login", "/api/v1/auth/register", "/"}
    
    async def dispatch(self, request: Request, call_next):
        # Skip CSRF for safe methods
        if request.method in self.SAFE_METHODS:
            response = await call_next(request)
            # Set CSRF token cookie on safe methods
            if self.CSRF_COOKIE_NAME not in request.cookies:
                csrf_token = secrets.token_urlsafe(32)
                response.set_cookie(
                    key=self.CSRF_COOKIE_NAME,
                    value=csrf_token,
                    httponly=False,  # Must be False so JavaScript can read it
                    secure=True,      # Set to True in production (HTTPS)
                    samesite="strict",
                    max_age=3600
                )
            return response
        
        # Check if path is exempt
        if request.url.path in self.EXEMPT_PATHS:
            response = await call_next(request)
            # Generate and set CSRF token on login
            if request.url.path == "/api/v1/auth/login":
                csrf_token = secrets.token_urlsafe(32)
                response.set_cookie(
                    key=self.CSRF_COOKIE_NAME,
                    value=csrf_token,
                    httponly=False,
                    secure=False,# ✅ keep false for localhost; True in production (https)
                    samesite="Lax",
                    max_age=3600
                )
                response.headers[self.CSRF_HEADER_NAME] = csrf_token 
            return response
        
        # Validate CSRF token for non-safe methods
        csrf_token_header = request.headers.get(self.CSRF_HEADER_NAME)
        csrf_token_cookie = request.cookies.get(self.CSRF_COOKIE_NAME)
        
        if not csrf_token_header or not csrf_token_cookie:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token missing"
            )
        
        if not secrets.compare_digest(csrf_token_header, csrf_token_cookie):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token validation failed"
            )
        
        response = await call_next(request)
        return response