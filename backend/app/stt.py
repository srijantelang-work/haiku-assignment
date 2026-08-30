"""ElevenLabs Scribe v2 (speech-to-text). The API key is loaded server-side only."""
from __future__ import annotations

import os
from pathlib import Path

import httpx

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
        value = value.strip().strip('"').strip("'").rstrip(",")
        os.environ[key] = value


_load_env()

ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"
STT_MODEL = "scribe_v2"
MAX_AUDIO_BYTES = 15 * 1024 * 1024


class STTError(Exception):
    def __init__(self, message: str, status: int = 502):
        super().__init__(message)
        self.status = status


def api_key() -> str:
    key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not key:
        _load_env()
        key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    return key


async def transcribe_audio(audio: bytes, content_type: str = "audio/webm") -> str:
    key = api_key()
    if not key:
        raise STTError("ELEVENLABS_API_KEY is not configured", status=503)
    if not audio:
        raise STTError("no audio received", status=400)
    if len(audio) > MAX_AUDIO_BYTES:
        raise STTError("audio too large", status=413)

    ext = ".wav" if "wav" in content_type else ".webm"
    filename = f"audio{ext}"

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            ELEVENLABS_STT_URL,
            headers={"xi-api-key": key},
            data={"model_id": STT_MODEL, "language_code": "eng"},
            files={"file": (filename, audio, content_type)},
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
