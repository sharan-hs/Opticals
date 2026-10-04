import logging
from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app import __version__
from app.core.database import get_db
from app.core.migrations import is_up_to_date

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["health"])

CheckStatus = Literal["ok", "error", "skipped"]


class Liveness(BaseModel):
    status: Literal["ok"] = "ok"
    version: str = __version__


class Readiness(BaseModel):
    status: Literal["ok", "unavailable"]
    database: CheckStatus
    migrations: CheckStatus


@router.get("", response_model=Liveness)
def liveness() -> Liveness:
    """The process is up. Doesn't touch the database."""
    return Liveness()


@router.get(
    "/ready",
    response_model=Readiness,
    responses={503: {"model": Readiness, "description": "Not ready to serve traffic"}},
)
def readiness(db: Session = Depends(get_db)) -> Readiness | JSONResponse:
    """Database reachable and migrated to the version this code expects."""
    database: CheckStatus = "ok"
    migrations: CheckStatus = "skipped"
    try:
        db.execute(text("SELECT 1"))
        migrations = "ok" if is_up_to_date(db.connection()) else "error"
    except SQLAlchemyError:
        logger.exception("Readiness check: database unavailable")
        database = "error"

    if database == "ok" and migrations == "ok":
        return Readiness(status="ok", database=database, migrations=migrations)
    body = Readiness(status="unavailable", database=database, migrations=migrations)
    return JSONResponse(body.model_dump(), status_code=503)
