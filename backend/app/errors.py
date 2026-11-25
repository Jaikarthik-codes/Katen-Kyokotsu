"""One JSON error shape for every failure: {"error": {"code", "message", "details"}}."""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import InterfaceError, OperationalError
from sqlalchemy.exc import TimeoutError as PoolTimeoutError
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger("app")


class ApiError(Exception):
    """Raise from route code to return a specific status and error code."""

    def __init__(self, status: int, code: str, message: str, details: list | None = None):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details or []


def error_response(
    status: int, code: str, message: str, details: list | None = None
) -> JSONResponse:
    body = {"error": {"code": code, "message": message, "details": details or []}}
    return JSONResponse(status_code=status, content=body)


async def _api_error(_: Request, exc: ApiError) -> JSONResponse:
    return error_response(exc.status, exc.code, exc.message, exc.details)


async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    details = [{"loc": list(e["loc"]), "msg": e["msg"], "type": e["type"]} for e in exc.errors()]
    return error_response(422, "validation_error", "Request validation failed", details)


async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    if exc.status_code == 404:
        return error_response(404, "not_found", "Not found")
    return error_response(exc.status_code, "http_error", str(exc.detail))


async def _db_unavailable(_: Request, exc: Exception) -> JSONResponse:
    # Connection-level failures only. Other database errors (bad input, bugs, a missing
    # table) fall through to the 500 handler so they are logged with a full traceback.
    log.error("database unavailable: %s: %s", type(exc).__name__, getattr(exc, "orig", None) or exc)
    return error_response(503, "db_unavailable", "Database unavailable")


async def _unhandled(_: Request, exc: Exception) -> JSONResponse:
    log.exception("unhandled error", exc_info=exc)
    return error_response(500, "internal_error", "Internal server error")


def install_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(ApiError, _api_error)
    app.add_exception_handler(RequestValidationError, _validation_error)
    app.add_exception_handler(StarletteHTTPException, _http_error)
    for exc_type in (OperationalError, InterfaceError, PoolTimeoutError):
        app.add_exception_handler(exc_type, _db_unavailable)
    app.add_exception_handler(Exception, _unhandled)
