"""ElevenLabs Scribe v2 (speech-to-text) integration.

The API key is loaded here and used *only* server-side. It must never reach the
React frontend — Phase 9's key-exposure check fails the build if it does, and
the browser network tab would otherwise reveal it.
"""
from __future__ import annotations

import os
from pathlib import Path

import httpx

# --- .env loading (minimal, no python-dotenv dependency) ---------------------

_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"


def _load_env() -> None:
    if not _ENV_PATH.exists():
        return
    for line in _ENV_PATH.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        # setdefault: the real process environment wins over .env.
        os.environ.setdefault(key, value)


_load_env()

ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"
STT_MODEL = "scribe_v2"
MAX_AUDIO_BYTES = 15 * 1024 * 1024  # 15 MB — press-to-talk clips are far smaller


class STTError(Exception):
    """Transcription failed; carries the HTTP status the endpoint should return."""

    def __init__(self, message: str, status: int = 502):
        super().__init__(message)
        self.status = status


def api_key() -> str:
    return os.environ.get("ELEVENLABS_API_KEY", "").strip()


async def transcribe_audio(audio: bytes, content_type: str = "audio/webm") -> str:
    """Send a short audio clip to Scribe v2 and return the transcript text.

    Raises STTError (with the right HTTP status) on missing key, upstream
    failure, or silence — the endpoint maps that to a JSON error the UI shows.
    """
    key = api_key()
    if not key:
        raise STTError("ELEVENLABS_API_KEY is not configured", status=503)

    if not audio:
        raise STTError("no audio received", status=400)

    if len(audio) > MAX_AUDIO_BYTES:
        raise STTError("audio too large", status=413)

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            ELEVENLABS_STT_URL,
            headers={"xi-api-key": key},
            data={"model_id": STT_MODEL},
            files={"file": ("audio", audio, content_type)},
        )

    if resp.status_code != 200:
        raise STTError(
            f"transcription failed (HTTP {resp.status_code}): {resp.text[:200]}",
            status=502,
        )

    try:
        text = (resp.json().get("text") or "").strip()
    except ValueError:
        raise STTError("unexpected response from speech service", status=502)

    if not text:
        raise STTError("no speech detected", status=422)

    return text
