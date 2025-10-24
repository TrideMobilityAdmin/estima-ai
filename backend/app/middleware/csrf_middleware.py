from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import secrets

class CSRFMiddleware(BaseHTTPMiddleware):
    """
    CSRF Protection Middleware using Double Submit Cookie pattern.
    """

    SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
    CSRF_HEADER_NAME = "X-CSRF-Token"
    CSRF_COOKIE_NAME = "csrf_token"

    # Endpoints that don't require CSRF (typically login)
    EXEMPT_PATHS = {"/api/v1/auth/login", "/api/v1/auth/register", "/", "/debug/csrf"}

    async def dispatch(self, request: Request, call_next):
        # Handle OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            origin = request.headers.get("origin")
            response = JSONResponse({"message": "OK"})
            
            if origin in ["http://localhost:5173", "http://localhost:5174"]:
                response.headers.update({
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Origin, X-CSRF-Token, X-Csrf-Token, Cookie",
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Max-Age": "3600",
                })
            return response
            
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
                    secure=False,     # Set to False for localhost development
                    samesite="Lax",  # Changed to Lax for better compatibility
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
        
        # Debug logging
        print(f"🔍 CSRF Debug - Method: {request.method}")
        print(f"🔍 CSRF Debug - URL: {request.url}")
        print(f"🔍 CSRF Debug - Headers: {dict(request.headers)}")
        print(f"🔍 CSRF Debug - Cookies: {dict(request.cookies)}")
        print(f"🔍 CSRF Debug - Header Token: {csrf_token_header}")
        print(f"🔍 CSRF Debug - Cookie Token: {csrf_token_cookie}")
        
        if not csrf_token_header or not csrf_token_cookie:
            print(f"❌ CSRF Debug - Missing tokens: header={bool(csrf_token_header)}, cookie={bool(csrf_token_cookie)}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token missing"
            )
        
        if not secrets.compare_digest(csrf_token_header, csrf_token_cookie):
            print(f"❌ CSRF Debug - Token mismatch: header={csrf_token_header[:10]}..., cookie={csrf_token_cookie[:10]}...")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token validation failed"
            )
        
        print(f"✅ CSRF Debug - Validation successful")
        
        response = await call_next(request)
        return response