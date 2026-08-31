"""FastAPI app: the Phase-1 endpoints over the in-memory session store."""
from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from . import cerebras, engine, stt, store
from .schema import STEPS_BY_ID, TOTAL_QUESTIONS

app = FastAPI(title="Haiku Studio Intake — State Machine API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnswerRequest(BaseModel):
    key: str
    value: Any


class StructureRequest(BaseModel):
    key: str
    transcript: str


class EditRequest(BaseModel):
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
    session.history.append(session.current_step)
    next_question = engine.advance(session)
    return {
        "session_id": session_id,
        "answered": {"key": step.id},
        "next_question": next_question,
        "done": next_question is None,
        "can_go_back": len(session.history) > 0,
    }


@app.post("/session/{session_id}/back")
def back(session_id: str) -> dict:
    session = _require(session_id)
    if not session.history:
        raise HTTPException(status_code=400, detail="cannot go back from initial question")
    prev_step_id = session.history.pop()
    session.current_step = prev_step_id
    session.done = False
    step = STEPS_BY_ID[prev_step_id]
    q = engine.question_view(step, session.answers, session.meta.get("sex"))
    return {
        "session_id": session_id,
        "question": q,
        "can_go_back": len(session.history) > 0,
    }



@app.post("/session/{session_id}/structure")
async def structure(session_id: str, req: StructureRequest) -> dict:
    _require(session_id)
    step = STEPS_BY_ID.get(req.key)
    if step is None:
        raise HTTPException(status_code=422, detail=f"unknown question key '{req.key}'")
    try:
        result = await cerebras.structure_transcript(
            step.kind, list(step.options), step.label, req.transcript
        )
    except cerebras.StructuringError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc))
    value, uncertain = result["value"], result["uncertain"]
    if not uncertain and value is not None:
        try:
            engine.validate_value(step, value)
        except ValueError:
            value, uncertain = None, True
    return {"key": req.key, "value": value, "uncertain": uncertain}


@app.post("/transcribe")
async def transcribe(request: Request) -> dict:
    audio = await request.body()
    content_type = request.headers.get("content-type", "audio/webm")
    if not audio:
        raise HTTPException(status_code=400, detail="no audio received")
    try:
        text = await stt.transcribe_audio(audio, content_type)
    except stt.STTError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc))
    return {"text": text}


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


@app.get("/session/{session_id}/summary")
def summary(session_id: str):
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
    return engine.build_summary(session.answers, session.meta.get("sex"))


@app.get("/session/{session_id}/review")
def review(session_id: str) -> dict:
    session = _require(session_id)
    return _review_payload(session)


@app.post("/session/{session_id}/edit")
def edit(session_id: str, req: EditRequest) -> dict:
    session = _require(session_id)
    step = STEPS_BY_ID.get(req.key)
    if step is None:
        raise HTTPException(status_code=422, detail=f"unknown question key '{req.key}'")
    try:
        engine.apply_answer(session, step, req.value)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return _review_payload(session)


@app.post("/session/{session_id}/submit")
def submit(session_id: str) -> dict:
    session = _require(session_id)
    if not session.done:
        raise HTTPException(status_code=409, detail="session is not complete")
    session.meta["submitted"] = True
    return {"submitted": True}


def _review_payload(session) -> dict:
    payload = engine.build_review(session.answers, session.meta.get("sex"))
    payload["export"] = engine.build_export(session.answers, session.meta.get("sex"))
    return payload


def _require(session_id: str):
    session = store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="session not found")
    return session
