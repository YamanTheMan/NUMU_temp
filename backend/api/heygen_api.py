"""LiveAvatar (HeyGen) client.

The API key is read from the server environment (LIVEAVATAR_API_KEY on Vercel)
and never sent to the browser. Only public avatars are used, as required by
the access terms we were given.
"""

import requests

from config import LIVEAVATAR_API_KEY, LIVEAVATAR_AVATAR_ID

BASE_URL = "https://api.liveavatar.com"

# "Wayne" is the only avatar sandbox mode supports. Sandbox sessions are free
# and end automatically after about one minute.
SANDBOX_AVATAR_ID = "dd73ea75-1218-4ef3-92ce-606d5f7fbc0a"


class LiveAvatarError(Exception):
    """Raised when LiveAvatar is not configured or a request fails."""


def is_configured() -> bool:
    return bool(LIVEAVATAR_API_KEY)


def chosen_avatar_id() -> str | None:
    return LIVEAVATAR_AVATAR_ID or None


def _headers() -> dict:
    if not LIVEAVATAR_API_KEY:
        raise LiveAvatarError("LiveAvatar is not configured on the server.")
    return {
        "X-API-KEY": LIVEAVATAR_API_KEY,
        "accept": "application/json",
        "content-type": "application/json",
    }


def _data(response: requests.Response):
    try:
        body = response.json()
    except ValueError:
        body = {}
    if not response.ok:
        message = body.get("message") if isinstance(body, dict) else None
        raise LiveAvatarError(message or f"LiveAvatar request failed ({response.status_code}).")
    return body.get("data", body) if isinstance(body, dict) else body


def list_public_avatars(page: int = 1, page_size: int = 100) -> dict:
    """Public avatars the team is allowed to use, with preview images."""
    response = requests.get(
        f"{BASE_URL}/v1/avatars/public",
        headers=_headers(),
        params={"page": page, "page_size": page_size},
        timeout=20,
    )
    data = _data(response)
    results = data.get("results", []) if isinstance(data, dict) else data
    avatars = []
    for item in results or []:
        voice = item.get("default_voice") or {}
        avatars.append({
            "id": item.get("id"),
            "name": item.get("name"),
            "preview_url": item.get("preview_url"),
            "type": item.get("type"),
            "default_voice": {"id": voice.get("id"), "name": voice.get("name")} if voice else None,
        })
    return {"count": data.get("count", len(avatars)) if isinstance(data, dict) else len(avatars), "avatars": avatars}


def create_embed(
    avatar_id: str,
    sandbox: bool,
    max_seconds: int,
    language: str = "multi",
    context_id: str | None = None,
    voice_id: str | None = None,
) -> dict:
    """Create a ready-made LiveAvatar player and return its URL."""
    payload = {
        "avatar_id": avatar_id,
        "is_sandbox": sandbox,
        "max_session_duration": max_seconds,
        "default_language": language,
    }
    if context_id:
        payload["context_id"] = context_id
    if voice_id:
        payload["voice_id"] = voice_id
    response = requests.post(f"{BASE_URL}/v2/embeddings", headers=_headers(), json=payload, timeout=20)
    data = _data(response)
    if not isinstance(data, dict) or not data.get("url"):
        raise LiveAvatarError("LiveAvatar did not return a player link.")
    return {"url": data["url"], "embed_id": data.get("embed_id"), "orientation": data.get("orientation")}
