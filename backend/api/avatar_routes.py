"""Routes for the avatar tutor (LiveAvatar by HeyGen).

The avatar tutor teaches lesson sessions. It is separate from Musa'id,
the text chatbot.
"""

import os
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from api.chart_lesson import build_lesson, stock_list

from api.heygen_api import (
    DEFAULT_TUTOR,
    SANDBOX_AVATAR_ID,
    LiveAvatarError,
    chosen_avatar_id,
    create_embed,
    create_session_token,
    check_elevenlabs_key,
    is_configured,
    list_public_avatars,
    list_voices,
    tutor_context_id,
)

router = APIRouter(prefix="/api/avatar", tags=["Avatar tutor"])

# Real sessions use the university's credits, so keep them short.
SANDBOX_SECONDS = 60
LESSON_SECONDS = int(os.getenv("LIVEAVATAR_MAX_SECONDS", "180"))


class TokenRequest(BaseModel):
    language: Literal["en", "ar"] = "en"
    sandbox: bool = False
    code: str | None = None


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=1200)


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=600)
    language: Literal["en", "ar"] = "en"
    ticker: str | None = None          # a chip the learner tapped
    context_ticker: str | None = None  # the company already on screen
    topic: str | None = Field(default=None, max_length=120)
    history: list[ChatTurn] = Field(default_factory=list, max_length=8)


class SessionRequest(BaseModel):
    sandbox: bool = True
    language: Literal["en", "ar", "multi"] = "multi"
    code: str | None = None


@router.get("/status")
def avatar_status():
    custom = chosen_avatar_id() != DEFAULT_TUTOR["id"]
    return {
        "enabled": is_configured(),
        "avatar_chosen": bool(chosen_avatar_id()),
        "tutor_name": "Your tutor" if custom else DEFAULT_TUTOR["name"],
        "preview_url": None if custom else DEFAULT_TUTOR["preview_url"],
        "max_seconds": LESSON_SECONDS,
    }


@router.get("/public")
def public_avatars(page: int = 1, page_size: int = 100):
    try:
        return list_public_avatars(page=page, page_size=min(max(page_size, 1), 100))
    except LiveAvatarError as error:
        raise HTTPException(status_code=502, detail=str(error))
    except Exception as error:  # report unexpected failures instead of a bare 500
        raise HTTPException(status_code=502, detail=f"Avatar service error ({type(error).__name__}: {str(error)[:160]})")


@router.get("/voices")
def public_voices(page: int = 1, page_size: int = 100):
    try:
        return list_voices(page=page, page_size=min(max(page_size, 1), 100))
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
            context_id=(os.getenv("LIVEAVATAR_CONTEXT_ID") or "").strip() or tutor_context_id(),
            voice_id=os.getenv("LIVEAVATAR_VOICE_ID") or None,
        )
    except LiveAvatarError as error:
        raise HTTPException(status_code=502, detail=str(error))
    except Exception as error:  # report unexpected failures instead of a bare 500
        raise HTTPException(status_code=502, detail=f"Avatar service error ({type(error).__name__}: {str(error)[:160]})")

    return {**embed, "sandbox": request.sandbox, "max_seconds": seconds}


@router.post("/token")
def start_live_lesson(request: TokenRequest):
    """Start a live video lesson in the browser (LiveAvatar Web SDK)."""
    if not is_configured():
        raise HTTPException(status_code=503, detail="The avatar tutor is not available right now.")
    if request.sandbox:
        avatar_id, seconds = SANDBOX_AVATAR_ID, SANDBOX_SECONDS
    else:
        avatar_id, seconds = chosen_avatar_id(), LESSON_SECONDS
        access_code = os.getenv("AVATAR_ACCESS_CODE")
        if access_code and request.code != access_code:
            raise HTTPException(status_code=403, detail="Enter the class code to start a tutor session.")
    try:
        token = create_session_token(avatar_id, request.language, seconds, sandbox=request.sandbox)
    except LiveAvatarError as error:
        raise HTTPException(status_code=502, detail=str(error))
    except Exception as error:  # report unexpected failures instead of a bare 500
        raise HTTPException(status_code=502, detail=f"Avatar service error ({type(error).__name__}: {str(error)[:160]})")
    return {**token, "max_seconds": seconds, "sandbox": request.sandbox}


@router.post("/ask")
def ask_chart_tutor(request: AskRequest):
    """What Claire says, step by step, with the chart moves for each step."""
    try:
        return build_lesson(
            question=request.question,
            language=request.language,
            ticker=(request.ticker or "").upper() or None,
            context_ticker=(request.context_ticker or "").upper() or None,
            history=[turn.model_dump() for turn in request.history],
            topic=request.topic,
        )
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Could not prepare the lesson ({type(error).__name__}).")


@router.get("/stocks")
def chart_stocks():
    """Companies Claire can chart."""
    return {"stocks": stock_list()}


@router.get("/voice-check")
def voice_check():
    """Does the ElevenLabs key on the server work? (Shows no secrets.)"""
    return check_elevenlabs_key()
