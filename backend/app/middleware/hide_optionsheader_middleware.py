from starlette.middleware.base import BaseHTTPMiddleware

class HideOptionsHeaderMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        allow_methods = response.headers.get("access-control-allow-methods")
        if allow_methods:
            # Remove OPTIONS only from the visible header
            methods = [m.strip() for m in allow_methods.split(",") if m.strip().upper() != "OPTIONS"]
            response.headers["access-control-allow-methods"] = ", ".join(methods)
        return response
