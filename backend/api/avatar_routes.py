"""Routes for the avatar tutor (LiveAvatar by HeyGen).

The avatar tutor teaches lesson sessions. It is separate from Musa'id,
the text chatbot.
"""

import os
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.heygen_api import (
    SANDBOX_AVATAR_ID,
    LiveAvatarError,
    chosen_avatar_id,
    create_embed,
    is_configured,
    list_public_avatars,
)

router = APIRouter(prefix="/api/avatar", tags=["Avatar tutor"])

# Real sessions use the university's credits, so keep them short.
SANDBOX_SECONDS = 60
LESSON_SECONDS = int(os.getenv("LIVEAVATAR_MAX_SECONDS", "180"))


class SessionRequest(BaseModel):
    sandbox: bool = True
    language: Literal["en", "ar", "multi"] = "multi"
    code: str | None = None


@router.get("/status")
def avatar_status():
    return {
        "enabled": is_configured(),
        "avatar_chosen": bool(chosen_avatar_id()),
    }


@router.get("/public")
def public_avatars(page: int = 1, page_size: int = 100):
    try:
        return list_public_avatars(page=page, page_size=min(max(page_size, 1), 100))
    except LiveAvatarError as error:
        raise HTTPException(status_code=502, detail=str(error))


@router.post("/session")
def start_session(request: SessionRequest):
    if not is_configured():
        raise HTTPException(status_code=503, detail="The avatar tutor is not available right now.")

    if request.sandbox:
        avatar_id, seconds = SANDBOX_AVATAR_ID, SANDBOX_SECONDS
    else:
        avatar_id = chosen_avatar_id()
        if not avatar_id:
            raise HTTPException(status_code=400, detail="No tutor avatar has been chosen yet.")
        access_code = os.getenv("AVATAR_ACCESS_CODE")
        if access_code and request.code != access_code:
            raise HTTPException(status_code=403, detail="Enter the class code to start a tutor session.")
        seconds = LESSON_SECONDS

    try:
        embed = create_embed(
            avatar_id=avatar_id,
            sandbox=request.sandbox,
            max_seconds=seconds,
            language=request.language,
            context_id=os.getenv("LIVEAVATAR_CONTEXT_ID") or None,
            voice_id=os.getenv("LIVEAVATAR_VOICE_ID") or None,
        )
    except LiveAvatarError as error:
        raise HTTPException(status_code=502, detail=str(error))

    return {**embed, "sandbox": request.sandbox, "max_seconds": seconds}
