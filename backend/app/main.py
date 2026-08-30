"""FastAPI app: the four Phase-1 endpoints over the in-memory session store."""
from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from . import engine, store
from .schema import STEPS_BY_ID, TOTAL_QUESTIONS

app = FastAPI(title="Haiku Studio Intake — State Machine API", version="0.1.0")

# The React shell (Phase 2+) runs on a different origin during dev (Vite :5173).
# Allow all origins for now; tighten to the deployed frontend origin in Phase 4.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnswerRequest(BaseModel):
    key: str
    value: Any


@app.post("/session", status_code=201)
def create_session() -> dict:
    session = store.create()
    return {"session_id": session.session_id, "question": engine.current_question(session)}


@app.get("/session/{session_id}")
def get_session(session_id: str) -> dict:
    session = _require(session_id)
    return engine.session_view(session)


@app.post("/session/{session_id}/answer")
def answer(session_id: str, req: AnswerRequest) -> dict:
    session = _require(session_id)
    if session.done:
        raise HTTPException(status_code=409, detail="session already complete")
    if session.current_step is None:
        raise HTTPException(status_code=409, detail="no current question")
    if req.key != session.current_step:
        raise HTTPException(
            status_code=409,
            detail=f"expected answer for step '{session.current_step}', got '{req.key}'",
        )
    step = STEPS_BY_ID[session.current_step]
    try:
        engine.apply_answer(session, step, req.value)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    next_question = engine.advance(session)
    return {
        "session_id": session_id,
        "answered": {"key": step.id},
        "next_question": next_question,
        "done": next_question is None,
    }


@app.get("/session/{session_id}/export")
def export(session_id: str):
    session = _require(session_id)
    if not session.done:
        return JSONResponse(
            status_code=409,
            content={
                "complete": False,
                "message": "session is not complete yet",
                "progress": {
                    "completed": engine.completed_count(session.answers, session.meta.get("sex")),
                    "total": TOTAL_QUESTIONS,
                },
            },
        )
    return engine.build_export(session.answers, session.meta.get("sex"))


def _require(session_id: str):
    session = store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="session not found")
    return session
