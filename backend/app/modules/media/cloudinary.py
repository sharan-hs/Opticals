"""Cloudinary: signed browser uploads, checking an uploaded asset, deleting it.

Implemented over HTTPS directly (a few lines) rather than adding the SDK.
"""

import base64
import hashlib
import json
import logging
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any

from app.core.config import get_settings
from app.core.errors import AppError

logger = logging.getLogger(__name__)

ALLOWED_FORMATS = ("jpg", "jpeg", "png", "webp")
MAX_BYTES = 10 * 1024 * 1024
TIMEOUT_SECONDS = 10


class ImagesNotConfiguredError(AppError):
    status_code = 503
    code = "IMAGES_NOT_CONFIGURED"
    message = "Image uploads aren't set up yet (Cloudinary API key missing)."


class ImageNotFoundError(AppError):
    status_code = 400
    code = "IMAGE_NOT_FOUND"
    message = "That image isn't in Cloudinary. Upload it first."


@dataclass(frozen=True)
class Asset:
    public_id: str
    version: int
    width: int
    height: int
    format: str
    bytes: int


def sign(params: dict[str, Any], api_secret: str) -> str:
    """Cloudinary signature: SHA-1 of the sorted params plus the secret."""
    to_sign = "&".join(f"{key}={params[key]}" for key in sorted(params) if params[key] != "")
    return hashlib.sha1((to_sign + api_secret).encode(), usedforsecurity=False).hexdigest()


def _require_config() -> tuple[str, str, str]:
    settings = get_settings()
    if not settings.cloudinary_configured:
        raise ImagesNotConfiguredError()
    assert settings.cloudinary_api_key and settings.cloudinary_api_secret  # noqa: S101
    return (
        settings.cloudinary_cloud_name,
        settings.cloudinary_api_key,
        settings.cloudinary_api_secret,
    )


def upload_signature(subfolder: str) -> dict[str, Any]:
    """Parameters the browser sends with the file straight to Cloudinary."""
    cloud, api_key, secret = _require_config()
    folder = f"{get_settings().cloudinary_upload_folder.strip('/')}/{subfolder.strip('/')}"
    params: dict[str, Any] = {
        "allowed_formats": ",".join(ALLOWED_FORMATS),
        "folder": folder,
        "timestamp": int(time.time()),
    }
    return {
        **params,
        "signature": sign(params, secret),
        "api_key": api_key,
        "cloud_name": cloud,
        "upload_url": f"https://api.cloudinary.com/v1_1/{cloud}/image/upload",
        "max_bytes": MAX_BYTES,
    }


def _request(url: str, *, data: bytes | None = None, auth: tuple[str, str] | None = None) -> Any:
    request = urllib.request.Request(url, data=data, method="POST" if data else "GET")  # noqa: S310
    if auth:
        token = base64.b64encode(f"{auth[0]}:{auth[1]}".encode()).decode()
        request.add_header("Authorization", f"Basic {token}")
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:  # noqa: S310
        return json.loads(response.read())


def fetch_asset(public_id: str) -> Asset:
    """The server's view of an uploaded image (never trust the browser's)."""
    cloud, api_key, secret = _require_config()
    url = (
        f"https://api.cloudinary.com/v1_1/{cloud}/resources/image/upload/"
        f"{urllib.parse.quote(public_id, safe='/')}"
    )
    try:
        body = _request(url, auth=(api_key, secret))
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            raise ImageNotFoundError() from exc
        raise
    return Asset(
        public_id=body["public_id"],
        version=int(body["version"]),
        width=int(body["width"]),
        height=int(body["height"]),
        format=str(body["format"]),
        bytes=int(body["bytes"]),
    )


def destroy(public_id: str) -> None:
    """Deletes only admin uploads; original Products/ images are left alone."""
    settings = get_settings()
    if not settings.cloudinary_configured:
        return
    if not public_id.startswith(settings.cloudinary_upload_folder.strip("/") + "/"):
        return
    cloud, api_key, secret = _require_config()
    params = {"public_id": public_id, "timestamp": int(time.time())}
    data = urllib.parse.urlencode(
        {**params, "signature": sign(params, secret), "api_key": api_key}
    ).encode()
    try:
        _request(f"https://api.cloudinary.com/v1_1/{cloud}/image/destroy", data=data)
    except Exception:
        logger.exception("Cloudinary delete failed", extra={"public_id": public_id})
