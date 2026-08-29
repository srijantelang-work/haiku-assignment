"""In-memory session store (no DB — no login / admin panel, no persistence)."""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional


@dataclass
class Session:
    session_id: str
    current_step: str = "sex"
    done: bool = False
    answers: dict = field(default_factory=dict)
    meta: dict = field(default_factory=dict)

    def __post_init__(self):
        self.meta.setdefault("started_at", datetime.now(timezone.utc).isoformat())


_sessions: dict = {}


def create() -> Session:
    session = Session(session_id=uuid.uuid4().hex)
    _sessions[session.session_id] = session
    return session


def get(session_id: str) -> Optional[Session]:
    return _sessions.get(session_id)


def clear() -> None:
    _sessions.clear()
