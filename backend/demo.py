"""Drive a full intake over real HTTP and print the filled form.

Usage (two terminals, both from backend/):

    python3 -m uvicorn app.main:app --port 8000   # terminal 1
    python3 demo.py                                # terminal 2

This talks to the running server with urllib (no extra deps) and prints the
final /export for a female and a male patient.
"""
from __future__ import annotations

import json
import os
import urllib.request

BASE = os.environ.get("INTAKE_BASE_URL", "http://127.0.0.1:8000")


def call(method: str, path: str, body: dict | None = None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        BASE + path, data=data, method=method,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def default_value(q: dict):
    t = q["type"]
    if t in ("yesno", "bool"):
        return True
    if t == "number":
        return 28
    if t == "multi":
        return [q["options"][0]]
    if t == "single":
        return q["options"][0]
    if t == "text":
        return "detail"
    raise ValueError(t)


def drive(sex: str, overrides: dict | None = None):
    overrides = overrides or {}
    sid = call("POST", "/session")["session_id"]
    call("POST", f"/session/{sid}/answer", {"key": "sex", "value": sex})
    seen = []
    while True:
        state = call("GET", f"/session/{sid}")
        q = state["current_question"]
        if q is None:
            break
        seen.append(q["step"])
        value = overrides.get(q["step"], default_value(q))
        call("POST", f"/session/{sid}/answer", {"key": q["step"], "value": value})
    return seen, call("GET", f"/session/{sid}/export")


if __name__ == "__main__":
    for sex in ("female", "male"):
        seen, export = drive(sex)
        verdict = "HITS q6/q7" if ("q6" in seen and "q7" in seen) else "SKIPS q6/q7"
        print(f"\n=== {sex.upper()} patient — {len(seen)} steps answered — {verdict} ===")
        print(json.dumps(export, indent=2, ensure_ascii=False))
