"""Load intake-schema.json and flatten it into an ordered list of atomic steps."""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Tuple

SCHEMA_PATH = Path(__file__).resolve().parent.parent.parent / "intake-schema.json"

EXCLUSIVE_OPTIONS = {"No known family history", "None"}

TOTAL_QUESTIONS = 16

FOLLOWUP_LABELS = {
    "smoking_severity": "How much do you smoke?",
    "salon_treatment_detail": "What salon treatments have you had?",
    "describe": "What side effects did you notice?",
}


@dataclass(frozen=True)
class Step:
    id: str
    kind: str
    label: str
    section: str
    options: Tuple[str, ...] = ()
    write: Tuple[str, ...] = ()  # path into session.answers (empty for sex)
    gate: Optional[Tuple[Tuple[str, ...], bool]] = None  # (path, truthy) -> skip when unmet
    female_only: bool = False
    section_id: str = ""
    question_n: int = 0
    followup: bool = False
    hint: str = ""


def humanize(key: str) -> str:
    return " ".join(w.capitalize() for w in key.replace("_", " ").split())


def load_schema() -> dict:
    with open(SCHEMA_PATH, encoding="utf-8") as fh:
        return json.load(fh)


SCHEMA = load_schema()


def top_level_questions() -> list:
    out = []
    for section in SCHEMA["sections"]:
        for q in section["questions"]:
            q = dict(q)
            q["section"] = section["title"]
            out.append(q)
    return out


def _build_steps() -> Tuple[list, dict]:
    steps = []

    steps.append(Step(
        id="sex", kind="single", label="Are you female or male?", section="About you",
        options=("female", "male"),
        hint="So we can skip what doesn't apply to you.",
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
                    for row in rows:
                        rkey = row["key"]
                        rid = f"{qid}.{rkey}"
                        if row["type"] == "single":
                            write = ("habits", rkey)
                        else:
                            write = ("habits", rkey, "value")
                        steps.append(Step(
                            rid, row["type"], humanize(rkey), title,
                            options=tuple(row.get("options", [])), write=write,
                            section_id=section_id, question_n=question_n,
                        ))
                        f = row.get("followup")
                        if f:
                            fkey = f["key"]
                            steps.append(Step(
                                f"{rid}.{fkey}", f["type"], FOLLOWUP_LABELS.get(fkey, humanize(fkey)), title,
                                options=tuple(f.get("options", [])),
                                write=("habits", rkey, fkey),
                                gate=(("habits", rkey, "value"), True),
                                section_id=section_id, question_n=question_n,
                                followup=True,
                            ))
                else:
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
                        f"{qid}.{fkey}", f["type"], FOLLOWUP_LABELS.get(fkey, humanize(fkey)), title,
                        write=(fkey,), gate=((key,), True),
                        section_id=section_id, question_n=question_n,
                        followup=True,
                    ))

    return steps, {s.id: s for s in steps}


STEPS, STEPS_BY_ID = _build_steps()
