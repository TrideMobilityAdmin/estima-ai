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

    # Endpoints that don't require CSRF (like login/register)
    EXEMPT_PATHS = {"/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/logout", "/"}

    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "")
        print(f"🔥 CSRF Middleware Triggered: {request.method} {request.url.path}")
        print(f"🌐 Origin: {origin}")
        
        # ✅ Detect if running in local/cross-origin environment
        is_local = any(host in origin for host in ["localhost", "127.0.0.1"])
        is_cross_origin = origin and not any(host in origin for host in ["10.100.3.13"])
        
        # For cross-origin requests (localhost -> VM), use SameSite=None with Secure=True
        # For same-origin requests (VM -> VM), use SameSite=Lax
        samesite = "None" if is_cross_origin else "Lax"
        # CRITICAL: SameSite=None requires Secure=True (even in dev)
        secure = is_cross_origin
        
        print(f"🔧 Cookie settings: SameSite={samesite}, Secure={secure}, Cross-origin={is_cross_origin}")
        
        try:
            # ✅ 1️⃣ Always allow preflight OPTIONS requests (CORS pre-checks)
            if request.method == "OPTIONS":
                print("🟢 OPTIONS request — skipping CSRF validation")
                return await call_next(request)

            # ✅ 2️⃣ Allow safe methods (GET, HEAD, etc.)
            if request.method in self.SAFE_METHODS:
                response = await call_next(request)
                # Set CSRF cookie if missing
                if self.CSRF_COOKIE_NAME not in request.cookies:
                    csrf_token = secrets.token_urlsafe(32)
                    print(f"🍪 Setting new CSRF cookie (safe method): {csrf_token[:10]}...")
                    response.set_cookie(
                        key=self.CSRF_COOKIE_NAME,
                        value=csrf_token,
                        httponly=False,  # Must be False so JS can read it
                        secure=secure,
                        samesite=samesite,
                        domain=None,  # Let browser infer
                        max_age=3600,
                        path="/",
                    )
                return response

            # ✅ 3️⃣ Skip validation for exempt routes
            if request.url.path in self.EXEMPT_PATHS:
                print(f"🟢 Exempt path: {request.url.path}")
                response = await call_next(request)
                # If it's a login endpoint, issue a new CSRF token
                if request.url.path == "/api/v1/auth/login":
                    csrf_token = secrets.token_urlsafe(32)
                    print(f"🆕 Generating new CSRF token for login: {csrf_token[:10]}...")
                    response.set_cookie(
                        key=self.CSRF_COOKIE_NAME,
                        value=csrf_token,
                        httponly=False,
                        secure=secure,
                        samesite=samesite,
                        domain=None,
                        max_age=3600,
                        path="/",
                    )
                    # Also send in header for easy retrieval
                    response.headers[self.CSRF_HEADER_NAME] = csrf_token
                    print(f"✅ CSRF token set in cookie and header")
                return response

            # ✅ 4️⃣ Validate CSRF tokens for unsafe methods
            csrf_token_header = request.headers.get(self.CSRF_HEADER_NAME)
            csrf_token_cookie = request.cookies.get(self.CSRF_COOKIE_NAME)
            
            print(f"📦 Header token: {csrf_token_header[:20] if csrf_token_header else 'None'}...")
            print(f"📦 Cookie token: {csrf_token_cookie[:20] if csrf_token_cookie else 'None'}...")
            print(f"🍪 All cookies: {request.cookies}")

            if not csrf_token_header or not csrf_token_cookie:
                print("❌ CSRF token missing!")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="CSRF token missing",
                )

            if not secrets.compare_digest(csrf_token_header, csrf_token_cookie):
                print("❌ CSRF validation failed!")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="CSRF token validation failed",
                )

            print("✅ CSRF validation passed")
            response = await call_next(request)
            return response

        except HTTPException as e:
            # ✅ Ensure response still includes CORS headers
            print(f"🚨 CSRF Error: {e.detail}")
            response = JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail},
            )
            # Include CORS headers to prevent browser block
            response.headers["Access-Control-Allow-Origin"] = origin or "*"
            response.headers["Access-Control-Allow-Credentials"] = "true"
            return response

        except Exception as e:
            print("🔥 Unexpected CSRF middleware error:", str(e))
            response = JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "Internal Server Error in CSRF middleware"},
            )
            response.headers["Access-Control-Allow-Origin"] = origin or "*"
            response.headers["Access-Control-Allow-Credentials"] = "true"
            return response