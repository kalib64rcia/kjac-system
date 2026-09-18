"""API.md-compliant error envelopes.

All errors return {success:false, error:{code,message,details}, meta:{timestamp}}.
Services raise AppError(code, message, status, details); anything else falls
back to generic HTTP_* codes.
"""

from datetime import UTC, datetime
from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded


class AppError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        http_status: int = status.HTTP_400_BAD_REQUEST,
        details: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.http_status = http_status
        self.details = details or []


def _envelope(code: str, message: str, details: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "success": False,
        "error": {"code": code, "message": message, "details": details},
        "meta": {"timestamp": datetime.now(UTC).isoformat(), "request_id": None},
    }


def _add_cors_headers(response: JSONResponse, request: Request) -> JSONResponse:
    """Add CORS headers to error responses for cross-origin requests.
    
    This ensures browsers can read error responses from the API when called
    from the frontend (localhost:5173). Without these headers, error responses
    (409, 429, 422, 400, etc.) are blocked by browser CORS policy, preventing
    proper error handling in the frontend.
    """
    origin = request.headers.get("origin", "")
    
    # Allow localhost origins for development (matches main.py CORS regex)
    # Matches http://localhost:PORT pattern
    import re
    is_allowed = bool(re.match(r"^http://localhost:\d+$", origin))
    
    if is_allowed:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, X-Admin-2FA"
        response.headers["Access-Control-Expose-Headers"] = "X-Total-Count, X-Page-Count"
    
    return response


async def _app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    response = JSONResponse(
        status_code=exc.http_status,
        content=_envelope(exc.code, exc.message, exc.details),
    )
    return _add_cors_headers(response, request)


async def _http_handler(request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
    response = JSONResponse(
        status_code=exc.status_code,
        content=_envelope(f"HTTP_{exc.status_code}", detail, []),
    )
    return _add_cors_headers(response, request)


async def _validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    details = [
        {"field": ".".join(str(p) for p in err["loc"] if p != "body"), "message": err["msg"]}
        for err in exc.errors()
    ]
    response = JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_envelope("VAL_001", "Validation failed", details),
    )
    return _add_cors_headers(response, request)


async def _rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    default = _rate_limit_exceeded_handler(request, exc)
    response = JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content=_envelope("RATE_001", "Rate limit exceeded. Retry shortly.", []),
        headers=dict(default.headers),
    )
    return _add_cors_headers(response, request)


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _app_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(HTTPException, _http_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, _validation_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)  # type: ignore[arg-type]
