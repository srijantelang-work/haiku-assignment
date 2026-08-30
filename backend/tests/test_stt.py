"""Tests for the /transcribe endpoint.

The ElevenLabs HTTP call is monkeypatched so the suite never consumes credits
or needs network access. We only assert the endpoint's request/error mapping.
"""
from __future__ import annotations

from fastapi.testclient import TestClient

from app import stt
from app.main import app

client = TestClient(app)


def _fake_transcribe(text: str | None, error: stt.STTError | None = None):
    async def _fn(audio: bytes, content_type: str = "audio/webm") -> str:
        if error is not None:
            raise error
        assert text is not None
        return text

    return _fn


def test_transcribe_returns_text(monkeypatch):
    monkeypatch.setattr(stt, "transcribe_audio", _fake_transcribe("itchy scalp"))
    r = client.post("/transcribe", content=b"\x00fake-audio", headers={"content-type": "audio/webm"})
    assert r.status_code == 200
    assert r.json() == {"text": "itchy scalp"}


def test_transcribe_empty_body_400():
    r = client.post("/transcribe", content=b"", headers={"content-type": "audio/webm"})
    assert r.status_code == 400
    assert "no audio" in r.json()["detail"]


def test_transcribe_silence_422(monkeypatch):
    err = stt.STTError("no speech detected", status=422)
    monkeypatch.setattr(stt, "transcribe_audio", _fake_transcribe(None, err))
    r = client.post("/transcribe", content=b"\x00silence", headers={"content-type": "audio/webm"})
    assert r.status_code == 422
    assert "no speech" in r.json()["detail"]


def test_transcribe_upstream_error_502(monkeypatch):
    err = stt.STTError("transcription failed (HTTP 500)", status=502)
    monkeypatch.setattr(stt, "transcribe_audio", _fake_transcribe(None, err))
    r = client.post("/transcribe", content=b"\x00audio", headers={"content-type": "audio/webm"})
    assert r.status_code == 502


def test_transcribe_missing_key_503(monkeypatch):
    err = stt.STTError("ELEVENLABS_API_KEY is not configured", status=503)
    monkeypatch.setattr(stt, "transcribe_audio", _fake_transcribe(None, err))
    r = client.post("/transcribe", content=b"\x00audio", headers={"content-type": "audio/webm"})
    assert r.status_code == 503
