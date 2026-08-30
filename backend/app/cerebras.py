"""Cerebras (gpt-oss-120b) structuring: transcript -> schema-valid answer. Key is server-side only."""
from __future__ import annotations

import json
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

CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions"
MODEL = "gpt-oss-120b"


class StructuringError(Exception):
    def __init__(self, message: str, status: int = 502):
        super().__init__(message)
        self.status = status


def api_key() -> str:
    key = os.environ.get("CEREBRAS_API_KEY", "").strip()
    if not key:
        _load_env()
        key = os.environ.get("CEREBRAS_API_KEY", "").strip()
    return key


_SYSTEM = (
    "You extract a patient's answer to one intake question from a voice transcript. "
    "Return JSON matching the schema. "
    'Set "uncertain" to true and "value" to null only when the transcript does not '
    'clearly address the question; otherwise set "uncertain" to false and "value" to '
    "the exact answer, using only the options provided."
)

_INSTRUCTIONS = {
    "single": "Choose exactly one option the transcript states. Do not infer an answer the patient did not give.",
    "multi": "Select every option the transcript actually supports. Select an option only if the patient stated it, never merely because it is plausible for a hair-loss patient.",
    "yesno": "Answer true if the transcript indicates yes, false if it indicates no.",
    "bool": "Answer true if the transcript indicates yes, false if it indicates no.",
    "number": "Extract the number as an integer. If no number is stated, mark uncertain.",
    "text": "Return the patient's spoken words directly, cleaning up filler words (um, uh). Always set uncertain to false when words are spoken.",
}


def _value_schema(kind: str, options: list) -> dict:
    if kind == "single":
        return {"anyOf": [{"type": "string", "enum": options}, {"type": "null"}]}
    if kind == "multi":
        return {"anyOf": [{"type": "array", "items": {"type": "string", "enum": options}}, {"type": "null"}]}
    if kind in ("yesno", "bool"):
        return {"anyOf": [{"type": "boolean"}, {"type": "null"}]}
    if kind == "number":
        return {"anyOf": [{"type": "integer"}, {"type": "null"}]}
    if kind == "text":
        return {"anyOf": [{"type": "string"}, {"type": "null"}]}
    raise StructuringError(f"cannot structure '{kind}' answers", status=422)


def _response_schema(kind: str, options: list) -> dict:
    return {
        "type": "object",
        "properties": {
            "value": _value_schema(kind, options),
            "uncertain": {"type": "boolean"},
        },
        "required": ["value", "uncertain"],
        "additionalProperties": False,
    }


def _messages(kind: str, label: str, transcript: str) -> list:
    if kind == "text":
        system = "You format a patient's open-ended text answer. Return their words in 'value' with light cleanup of filler words and set 'uncertain' to false."
    else:
        system = f"{_SYSTEM}\n{_INSTRUCTIONS.get(kind, _INSTRUCTIONS['text'])}"
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": f'Question: {label}\nTranscript: "{transcript}"'},
    ]


async def structure_transcript(kind: str, options: list, label: str, transcript: str) -> dict:
    key = api_key()
    if not key:
        raise StructuringError("CEREBRAS_API_KEY is not configured", status=503)
    if not transcript.strip():
        raise StructuringError("no transcript received", status=400)

    payload = {
        "model": MODEL,
        "messages": _messages(kind, label, transcript),
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "intake_answer",
                "strict": True,
                "schema": _response_schema(kind, options),
            },
        },
        "temperature": 0.1,
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            CEREBRAS_URL,
            headers={"Authorization": f"Bearer {key}"},
            json=payload,
        )

    if resp.status_code != 200:
        raise StructuringError(
            f"structuring failed (HTTP {resp.status_code}): {resp.text[:200]}", status=502
        )

    try:
        content = resp.json()["choices"][0]["message"]["content"]
        parsed = json.loads(content)
    except (KeyError, IndexError, TypeError, ValueError):
        raise StructuringError("unexpected response from structuring service", status=502)

    uncertain = bool(parsed.get("uncertain", False))
    value = parsed.get("value")
    if uncertain or value is None:
        return {"value": None, "uncertain": True}
    return {"value": value, "uncertain": False}
