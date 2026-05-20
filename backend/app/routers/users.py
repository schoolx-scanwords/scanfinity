from __future__ import annotations

import imghdr
import os
from typing import Optional

import jwt as pyjwt
from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile, status
from fastapi.responses import Response

from database.connect import connect


router = APIRouter(prefix="/api")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change_me_please")
JWT_ALGORITHM = "HS256"

# Keep this conservative since the image is stored directly in Postgres.
MAX_AVATAR_BYTES = 2 * 1024 * 1024  # 2 MiB


def _decode_bearer_token(authorization: Optional[str]) -> int:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Authorization header")

    try:
        payload = pyjwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    sub = payload.get("sub")
    try:
        return int(sub)
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")


async def get_current_user_id(authorization: Optional[str] = Header(default=None)) -> int:
    return _decode_bearer_token(authorization)


def _infer_media_type(content: bytes, declared: Optional[str]) -> str:
    kind = imghdr.what(None, h=content)
    if kind == "png":
        return "image/png"
    if kind == "jpeg":
        return "image/jpeg"
    if kind == "gif":
        return "image/gif"

    # SVG isn't detected by imghdr. Allow it if declared and content looks like XML.
    if declared == "image/svg+xml":
        stripped = content.lstrip()
        if stripped.startswith(b"<") and b"<svg" in stripped[:512].lower():
            return "image/svg+xml"

    # Fallback (browser will still often render it).
    return declared or "application/octet-stream"


@router.put("/users/me/avatar", status_code=204)
async def put_my_avatar(
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user_id),
):
    content = await file.read()

    if not content:
        raise HTTPException(status_code=422, detail="Empty file")

    if len(content) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=413, detail=f"Avatar too large (max {MAX_AVATAR_BYTES} bytes)")

    media_type = _infer_media_type(content, file.content_type)
    if not media_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Unsupported avatar format")

    pool = await connect()
    async with pool.connection() as conn:
        async with conn.transaction():
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE users SET product_image = %s WHERE id = %s",
                    (content, user_id),
                )
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="User not found")

    return Response(status_code=204)


@router.get("/users/{user_id}/avatar")
async def get_user_avatar(user_id: int):
    pool = await connect()

    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT product_image FROM users WHERE id = %s",
                (int(user_id),),
            )
            row = await cur.fetchone()

    if not row or row[0] is None:
        raise HTTPException(status_code=404, detail="Avatar not found")

    content = bytes(row[0])
    media_type = _infer_media_type(content, None)

    return Response(
        content=content,
        media_type=media_type,
        headers={"Cache-Control": "no-store"},
    )
