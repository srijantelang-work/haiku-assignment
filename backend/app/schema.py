"""Load intake-schema.json and flatten it into an ordered list of atomic steps.

The schema is the single source of truth (Phase 0). This module turns it into a
linear sequence of "steps" — one tap / number / text answer each — that the
state machine in :mod:`engine` walks. Table questions (habits / products /
procedures) are expanded into per-row, per-cell steps, and follow-ups become
their own gated steps.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Tuple

# Repo root / intake-schema.json — the canonical schema (Phase 0), read-only.
SCHEMA_PATH = Path(__file__).resolve().parent.parent.parent / "intake-schema.json"

# Options that are mutually exclusive with every other option in their question.
EXCLUSIVE_OPTIONS = {"No known family history", "None"}

TOTAL_QUESTIONS = 16


@dataclass(frozen=True)
class Step:
    id: str
    kind: str                                # number|single|multi|yesno|bool|text
    label: str
    section: str
    options: Tuple[str, ...] = ()            # valid choices for single / multi
    write: Tuple[str, ...] = ()              # path into session.answers (empty for sex)
    gate: Optional[Tuple[Tuple[str, ...], bool]] = None  # (path, truthy) -> skip when unmet
    female_only: bool = False
    section_id: str = ""                     # section letter "A".."E" ("" for the sex pre-step)
    question_n: int = 0                      # 1-based top-level question number (0 for sex)


def humanize(key: str) -> str:
    """Turn a snake_case schema key into a display label (copy is Phase 2's job)."""
    return " ".join(w.capitalize() for w in key.replace("_", " ").split())


def load_schema() -> dict:
    with open(SCHEMA_PATH, encoding="utf-8") as fh:
        return json.load(fh)


SCHEMA = load_schema()


def top_level_questions() -> list:
    """The 16 top-level question dicts, flattened, each tagged with its section title."""
    out = []
    for section in SCHEMA["sections"]:
        for q in section["questions"]:
            q = dict(q)
            q["section"] = section["title"]
            out.append(q)
    return out


def _build_steps() -> Tuple[list, dict]:
    steps = []

    # Pre-step (not a graded schema question): learn the patient's sex for routing.
    steps.append(Step(
        id="sex", kind="single", label="Sex", section="About you",
        options=("female", "male"),
    ))

    for section in SCHEMA["sections"]:
        title = section["title"]
        section_id = section["id"]
        for q in section["questions"]:
            key = q["key"]
            qtype = q["type"]
            qid = f"q{q['n']}"
            question_n = q["n"]
            options = tuple(q.get("options", []))

            if qtype == "table":
                rows = q.get("rows", [])
                if rows and isinstance(rows[0], dict):
                    # habits: each row is {"key", "type", [followup]}
                    for row in rows:
                        rkey = row["key"]
                        rid = f"{qid}.{rkey}"
                        if row["type"] == "single":
                            write = ("habits", rkey)          # bare string value
                        else:
                            write = ("habits", rkey, "value")  # {"value": bool}
                        steps.append(Step(
                            rid, row["type"], humanize(rkey), title,
                            options=tuple(row.get("options", [])), write=write,
                            section_id=section_id, question_n=question_n,
                        ))
                        f = row.get("followup")
                        if f:
                            fkey = f["key"]
                            steps.append(Step(
                                f"{rid}.{fkey}", f["type"], humanize(fkey), title,
                                options=tuple(f.get("options", [])),
                                write=("habits", rkey, fkey),
                                gate=(("habits", rkey, "value"), True),
                                section_id=section_id, question_n=question_n,
                            ))
                else:
                    # products / procedures: rows are display strings, columns given
                    columns = q.get("columns", [])
                    gate_col = columns[0]["key"]
                    for i, row_label in enumerate(rows):
                        rid = f"{qid}.r{i}"
                        first = columns[0]
                        steps.append(Step(
                            f"{rid}.{first['key']}", first["type"], row_label, title,
                            write=(key, row_label, first["key"]),
                            section_id=section_id, question_n=question_n,
                        ))
                        for col in columns[1:]:
                            ckey = col["key"]
                            steps.append(Step(
                                f"{rid}.{ckey}", col["type"],
                                f"{row_label} — {humanize(ckey)}", title,
                                options=tuple(col.get("options", [])),
                                write=(key, row_label, ckey),
                                gate=((key, row_label, gate_col), True),
                                section_id=section_id, question_n=question_n,
                            ))
            else:
                steps.append(Step(
                    qid, qtype, humanize(key), title, options=options,
                    write=(key,), female_only=bool(q.get("femaleOnly", False)),
                    section_id=section_id, question_n=question_n,
                ))
                f = q.get("followup")
                if f:
                    fkey = f["key"]
                    steps.append(Step(
                        f"{qid}.{fkey}", f["type"], humanize(fkey), title,
                        write=(fkey,), gate=((key,), True),
                        section_id=section_id, question_n=question_n,
                    ))

    return steps, {s.id: s for s in steps}


STEPS, STEPS_BY_ID = _build_steps()
