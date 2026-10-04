"""Every error response uses one envelope:

{"error": {"code": "...", "message": "...", "details": ...}, "request_id": "..."}
"""

import logging
from collections.abc import Mapping
from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import request_id_var

logger = logging.getLogger(__name__)


class AppError(Exception):
    """Base for errors the API reports to clients. Raise subclasses from services."""

    status_code = 400
    code = "BAD_REQUEST"
    message = "The request could not be processed."

    def __init__(
        self, message: str | None = None, *, code: str | None = None, details: Any = None
    ) -> None:
        self.message = message or self.message
        self.code = code or self.code
        self.details = details
        super().__init__(self.message)


class BusinessRuleError(AppError):
    status_code = 400
    code = "BUSINESS_RULE"


class UnauthorizedError(AppError):
    status_code = 401
    code = "UNAUTHORIZED"
    message = "Authentication required."


class ForbiddenError(AppError):
    status_code = 403
    code = "FORBIDDEN"
    message = "You don't have permission to do that."


class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"
    message = "Not found."


class ConflictError(AppError):
    status_code = 409
    code = "CONFLICT"
    message = "This conflicts with existing data."


_HTTP_CODES = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    413: "PAYLOAD_TOO_LARGE",
    429: "RATE_LIMITED",
}


def error_body(code: str, message: str, details: Any = None) -> dict[str, Any]:
    error: dict[str, Any] = {"code": code, "message": message}
    if details is not None:
        error["details"] = details
    return {"error": error, "request_id": request_id_var.get()}


def error_response(
    status_code: int,
    code: str,
    message: str,
    details: Any = None,
    headers: Mapping[str, str] | None = None,
) -> JSONResponse:
    return JSONResponse(
        error_body(code, message, details), status_code=status_code, headers=headers
    )


async def _app_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, AppError)  # noqa: S101
    return error_response(exc.status_code, exc.code, exc.message, exc.details)


async def _http_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, StarletteHTTPException)  # noqa: S101
    code = _HTTP_CODES.get(exc.status_code, "HTTP_ERROR")
    message = exc.detail if isinstance(exc.detail, str) else HTTPStatus(exc.status_code).phrase
    return error_response(exc.status_code, code, message, headers=exc.headers)


async def _validation_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)  # noqa: S101
    # Submitted values are left out on purpose: they may be passwords.
    details = [
        {
            "location": str(err["loc"][0]) if err["loc"] else "",
            "field": ".".join(str(part) for part in err["loc"][1:]),
            "message": err["msg"],
            "type": err["type"],
        }
        for err in exc.errors()
    ]
    return error_response(422, "VALIDATION_ERROR", "Some fields are invalid.", details)


async def _integrity_error(_: Request, exc: Exception) -> JSONResponse:
    # Usually a unique constraint (duplicate slug, SKU, email). The constraint
    # name is safe to expose and lets clients point at the right field.
    constraint = getattr(getattr(getattr(exc, "orig", None), "diag", None), "constraint_name", None)
    logger.warning("Integrity error", extra={"constraint": constraint})
    details = {"constraint": constraint} if constraint else None
    return error_response(409, "CONFLICT", ConflictError.message, details)


def register_exception_handlers(app: FastAPI) -> None:
    # Unhandled exceptions become a 500 envelope in RequestContextMiddleware,
    # which keeps the request id and lets CORS headers still be added.
    app.add_exception_handler(AppError, _app_error)
    app.add_exception_handler(StarletteHTTPException, _http_error)
    app.add_exception_handler(RequestValidationError, _validation_error)
    app.add_exception_handler(IntegrityError, _integrity_error)
