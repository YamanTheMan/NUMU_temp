"""LiveAvatar (HeyGen) client.

The API key is read from the server environment (LIVEAVATAR_API_KEY on Vercel)
and never sent to the browser. Only public avatars are used, as required by
the access terms we were given.
"""

import requests

from config import LIVEAVATAR_API_KEY as _RAW_KEY, LIVEAVATAR_AVATAR_ID as _RAW_AVATAR_ID


def _clean(value: str | None) -> str:
    """Trim spaces, line breaks and quotes that sneak in when a value is pasted."""
    return (value or "").strip().strip('"').strip("'").strip()


LIVEAVATAR_API_KEY = _clean(_RAW_KEY)
LIVEAVATAR_AVATAR_ID = _clean(_RAW_AVATAR_ID)

BASE_URL = "https://api.liveavatar.com"

# "Wayne" is the only avatar sandbox mode supports. Sandbox sessions are free
# and end automatically after about one minute.
SANDBOX_AVATAR_ID = "dd73ea75-1218-4ef3-92ce-606d5f7fbc0a"


class LiveAvatarError(Exception):
    """Raised when LiveAvatar is not configured or a request fails."""


def is_configured() -> bool:
    return bool(LIVEAVATAR_API_KEY)


# The team's pick: "Claire (Friendly)", a LiveAvatar public avatar (ids are not secret).
DEFAULT_TUTOR = {
    "id": "24211c5e-1374-45de-a625-89b992e9c002",
    "name": "Claire",
    "preview_url": "https://static.liveavatar.com/avatars/thumbnails/7b259367428f49138bdaa716565c3636/emotion-curated-20261004/24211c5e-1374-45de-a625-89b992e9c002-612-a433220bf8a0344b.jpg",
}


def chosen_avatar_id() -> str:
    """LIVEAVATAR_AVATAR_ID on Vercel overrides the default tutor."""
    return LIVEAVATAR_AVATAR_ID or DEFAULT_TUTOR["id"]


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
        raise LiveAvatarError(f"LiveAvatar said {response.status_code}: {message or 'request failed'}")
    return body.get("data", body) if isinstance(body, dict) else body


def _request(method: str, path: str, **kwargs) -> requests.Response:
    try:
        return requests.request(method, f"{BASE_URL}{path}", headers=_headers(), timeout=20, **kwargs)
    except requests.RequestException as error:
        raise LiveAvatarError(f"Could not reach LiveAvatar ({type(error).__name__}).") from error


TUTOR_CONTEXT_NAME = "NUMU lesson tutor"
TUTOR_PROMPT = """You are the NUMU avatar tutor. NUMU teaches complete beginners in Qatar how investing
and the Qatar Stock Exchange (QSE) work. You teach short, friendly lesson sessions out loud.

How you teach:
- Speak in short, simple sentences. One idea at a time, then check the learner is following.
- Use everyday Qatari examples: QNB, Ooredoo, Industries Qatar, riyals (QAR), the QE Index.
- Reply in the language the learner uses, English or Arabic.
- Cover one topic per session: what a share is, how the QSE trading day works, how to read a
  stock quote, dividends, risk and diversification, or how NUMU's Pick 3 challenge works.
- End each topic with one quick question to check understanding.

Rules:
- You explain, you never advise. Never tell anyone to buy, sell or hold a specific stock,
  and never predict prices. If asked, say you can't give advice and teach how to think about it.
- NUMU uses virtual riyals and sample prices, never real money.
- Keep answers under about 40 seconds of speech."""
TUTOR_OPENING = "Hi, I'm your NUMU tutor. Want a quick lesson on how the Qatar Stock Exchange works, or is there a topic you're curious about?"

_context_id_cache: str | None = None


def tutor_context_id() -> str:
    """Find or create the tutor's context (its instructions and opening line)."""
    global _context_id_cache
    if _context_id_cache:
        return _context_id_cache
    try:
        listing = _data(_request("GET", "/v1/contexts", params={"page": 1, "page_size": 100}))
        items = listing.get("results", []) if isinstance(listing, dict) else listing
        for item in items or []:
            if isinstance(item, dict) and item.get("name") == TUTOR_CONTEXT_NAME and item.get("id"):
                _context_id_cache = item["id"]
                return _context_id_cache
    except LiveAvatarError:
        pass  # listing is optional; fall through and create one
    created = _data(_request("POST", "/v1/contexts", json={
        "name": TUTOR_CONTEXT_NAME,
        "prompt": TUTOR_PROMPT,
        "opening_text": TUTOR_OPENING,
    }))
    if not isinstance(created, dict) or not created.get("id"):
        raise LiveAvatarError("LiveAvatar did not return a context id.")
    _context_id_cache = created["id"]
    return _context_id_cache


def list_public_avatars(page: int = 1, page_size: int = 100) -> dict:
    """Public avatars the team is allowed to use, with preview images."""
    response = _request("GET", "/v1/avatars/public", params={"page": page, "page_size": page_size})
    data = _data(response)
    results = data.get("results", []) if isinstance(data, dict) else data
    avatars = []
    for item in results or []:
        if not isinstance(item, dict):
            continue
        voice = item.get("default_voice") if isinstance(item.get("default_voice"), dict) else {}
        avatars.append({
            "id": item.get("id"),
            "name": item.get("name"),
            "preview_url": item.get("preview_url"),
            "type": item.get("type"),
            "default_voice": {"id": voice.get("id"), "name": voice.get("name")} if voice else None,
        })
    return {"count": data.get("count", len(avatars)) if isinstance(data, dict) else len(avatars), "avatars": avatars}


def list_voices(page: int = 1, page_size: int = 100) -> dict:
    """Public voices (name, language, gender) that can be paired with any public avatar."""
    data = _data(_request("GET", "/v1/voices", params={"voice_type": "public", "page": page, "page_size": page_size}))
    results = data.get("results", []) if isinstance(data, dict) else data
    voices = [
        {k: item.get(k) for k in ("id", "name", "description", "language", "gender", "tags")}
        for item in results or [] if isinstance(item, dict)
    ]
    return {"count": data.get("count", len(voices)) if isinstance(data, dict) else len(voices), "voices": voices}


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
    response = _request("POST", "/v2/embeddings", json=payload)
    data = _data(response)
    if not isinstance(data, dict) or not data.get("url"):
        raise LiveAvatarError("LiveAvatar did not return a player link.")
    return {"url": data["url"], "embed_id": data.get("embed_id"), "orientation": data.get("orientation")}
