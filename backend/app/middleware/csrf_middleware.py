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

    EXEMPT_PATHS = {"/api/v1/auth/login", "/api/v1/auth/register","/api/v1/auth/logout","/"}

    # ✅ Define allowed origins explicitly (matches your main.py CORS config)
    ALLOWED_ORIGINS = {
        "https://estimaai.gmrgroup.in",
        "http://localhost:5173",
        "https://localhost:5173",
        "http://localhost:5174",
        "https://localhost:5174",
        "http://127.0.0.1:5173",
        "https://127.0.0.1:5173",
    }

    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "") 
              
        try:
            # ✅  Always allow preflight OPTIONS requests (CORS pre-checks)
            if request.method == "OPTIONS":            
                return await call_next(request)

           
            if request.method in self.SAFE_METHODS:
                response = await call_next(request)
                # Set CSRF cookie if missing
                if self.CSRF_COOKIE_NAME not in request.cookies:
                    csrf_token = secrets.token_urlsafe(32)
                    secure_flag = request.url.scheme == "https"
                    response.set_cookie(
                        key=self.CSRF_COOKIE_NAME,
                        value=csrf_token,
                        httponly=False,
                        secure=secure_flag, 
                        samesite="lax",
                        max_age=3600,
                        path="/",
                    )
                return response

            # ✅ 3️⃣ Skip validation for exempt routes
            if request.url.path in self.EXEMPT_PATHS:
                
                response = await call_next(request)
                if request.url.path == "/api/v1/auth/login":
                    csrf_token = secrets.token_urlsafe(32)
                    secure_flag = request.url.scheme == "https"
                    response.set_cookie(
                        key=self.CSRF_COOKIE_NAME,
                        value=csrf_token,
                        httponly=False,
                        secure=secure_flag,
                        samesite="lax",
                        max_age=3600,
                        path="/",
                    )
                    response.headers[self.CSRF_HEADER_NAME] = csrf_token
                return response

            # ✅ 4️⃣ Validate CSRF tokens for unsafe methods
            csrf_token_header = request.headers.get(self.CSRF_HEADER_NAME)
            csrf_token_cookie = request.cookies.get(self.CSRF_COOKIE_NAME)
            

            if not csrf_token_header or not csrf_token_cookie:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="CSRF token missing",
                )

            if not secrets.compare_digest(csrf_token_header, csrf_token_cookie):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="CSRF token validation failed",
                )
  
            response = await call_next(request)
            return response

        except HTTPException as e:
            # ✅ Ensure response still includes CORS headers
            response = JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail},
            )
            # Only add CORS headers if the origin is in the allowed list
            if origin and origin in self.ALLOWED_ORIGINS:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"

            return response

        except Exception as e:
            response = JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "Internal Server Error in CSRF middleware"},
            )
            # Only add CORS headers if the origin is in the allowed list
            if origin and origin in self.ALLOWED_ORIGINS:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"

            return response


