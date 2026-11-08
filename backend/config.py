import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL")

SERPAPI_KEY = os.getenv("SERPAPI_KEY")

LIVEAVATAR_API_KEY = os.getenv("LIVEAVATAR_API_KEY")
LIVEAVATAR_AVATAR_ID = os.getenv("LIVEAVATAR_AVATAR_ID")

QSE_API_KEY = os.getenv("QSE_API_KEY")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
# ElevenLabs voice for the avatar tutor (the key stays on the server)
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID") or "gMB389pj77Qe5nErWNjd"
ELEVENLABS_MODEL = os.getenv("ELEVENLABS_MODEL") or "eleven_v4_turbo"
