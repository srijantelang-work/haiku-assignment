"""State-machine engine: validate answers, apply skip rules, advance, export."""
from __future__ import annotations

from typing import Any

from . import schema
from .schema import EXCLUSIVE_OPTIONS, STEPS, STEPS_BY_ID, TOTAL_QUESTIONS, Step, top_level_questions

_INDEX = {s.id: i for i, s in enumerate(STEPS)}


# --- nested answer helpers -------------------------------------------------

def get_path(obj: dict, path: tuple) -> Any:
    for k in path:
        if not isinstance(obj, dict) or k not in obj:
            return None
        obj = obj[k]
    return obj


def set_path(obj: dict, path: tuple, value: Any) -> None:
    for k in path[:-1]:
        obj = obj.setdefault(k, {})
    obj[path[-1]] = value


# --- validation ------------------------------------------------------------

def validate_value(step: Step, value: Any) -> None:
    kind = step.kind
    if kind == "number":
        if isinstance(value, bool) or not isinstance(value, int):
            raise ValueError("answer must be an integer")
        if not 1 <= value <= 100:
            raise ValueError("age must be between 1 and 100")
    elif kind in ("yesno", "bool"):
        if not isinstance(value, bool):
            raise ValueError("answer must be a boolean")
    elif kind == "single":
        if value not in step.options:
            raise ValueError(f"answer must be one of {list(step.options)}")
    elif kind == "multi":
        if not isinstance(value, list):
            raise ValueError("answer must be a list of options")
        allowed = set(step.options)
        for v in value:
            if v not in allowed:
                raise ValueError(f"'{v}' is not a valid option")
        exclusive = [o for o in value if o in EXCLUSIVE_OPTIONS]
        if exclusive and len(value) > 1:
            raise ValueError(f"'{exclusive[0]}' cannot be combined with other options")
    elif kind == "text":
        if not isinstance(value, str) or not value.strip():
            raise ValueError("answer must be a non-empty string")
    else:
        raise ValueError(f"unknown question type '{kind}'")


# --- skip / routing --------------------------------------------------------

def is_skipped(step: Step, answers: dict, sex: Any) -> bool:
    if step.female_only and sex != "female":
        return True
    if step.gate:
        path, truthy = step.gate
        if bool(get_path(answers, path)) is not truthy:
            return True
    return False


def next_step_id(current_id: str, answers: dict, sex: Any):
    idx = _INDEX[current_id]
    for step in STEPS[idx + 1:]:
        if not is_skipped(step, answers, sex):
            return step.id
    return None


def apply_answer(session, step: Step, value: Any) -> None:
    validate_value(step, value)
    if step.id == "sex":
        session.meta["sex"] = value
    else:
        set_path(session.answers, step.write, value)


def advance(session):
    nxt = next_step_id(session.current_step, session.answers, session.meta.get("sex"))
    if nxt is None:
        session.current_step = None
        session.done = True
        return None
    session.current_step = nxt
    return question_view(STEPS_BY_ID[nxt], session.answers, session.meta.get("sex"))


# --- progress --------------------------------------------------------------

def completed_count(answers: dict, sex: Any) -> int:
    return sum(1 for q in top_level_questions() if question_complete(q, answers, sex))


def question_complete(q: dict, answers: dict, sex: Any) -> bool:
    key = q["key"]
    if q.get("femaleOnly") and sex != "female":
        return True
    if q["type"] == "table":
        return _table_complete(q, answers)
    if key not in answers:
        return False
    f = q.get("followup")
    if f and answers[key] is True and f["key"] not in answers:
        return False
    return True


def _table_complete(q: dict, answers: dict) -> bool:
    key = q["key"]
    rows = q.get("rows", [])
    if not rows:
        return key in answers
    table = answers.get(key, {})
    if isinstance(rows[0], dict):  # habits
        for row in rows:
            rkey = row["key"]
            if row["type"] == "single":
                if rkey not in table:
                    return False
            else:
                rv = table.get(rkey)
                if not isinstance(rv, dict) or "value" not in rv:
                    return False
                f = row.get("followup")
                if f and rv["value"] is True and f["key"] not in rv:
                    return False
        return True
    columns = q.get("columns", [])  # products / procedures
    gate_col = columns[0]["key"]
    for row_label in rows:
        rv = table.get(row_label)
        if not isinstance(rv, dict) or gate_col not in rv:
            return False
        if rv[gate_col] is True:
            for col in columns[1:]:
                if col["key"] not in rv:
                    return False
    return True


# --- export ----------------------------------------------------------------

def build_export(answers: dict, sex: Any) -> dict:
    """Final answers, keyed exactly to the schema field names.

    Skipped fields are marked "not_applicable" rather than omitted.
    """
    exp = {}
    for q in top_level_questions():
        key = q["key"]
        if q.get("femaleOnly") and sex != "female":
            exp[key] = "not_applicable"
            continue
        if q["type"] == "table":
            exp[key] = _build_table_export(q, answers.get(key, {}))
        elif q.get("followup"):
            val = answers.get(key, False)
            exp[key] = val
            fkey = q["followup"]["key"]
            exp[fkey] = answers.get(fkey) if val is True else "not_applicable"
        else:
            exp[key] = answers.get(key, "not_applicable")
    return exp


def _build_table_export(q: dict, table: dict) -> dict:
    rows = q.get("rows", [])
    if isinstance(rows[0], dict):  # habits
        out = {}
        for row in rows:
            rkey = row["key"]
            if row["type"] == "single":
                out[rkey] = table.get(rkey, "")
            else:
                rv = table.get(rkey, {})
                val = rv.get("value", False)
                row_out = {"value": val}
                f = row.get("followup")
                if f:
                    fkey = f["key"]
                    row_out[fkey] = rv.get(fkey) if val is True else "not_applicable"
                out[rkey] = row_out
        return out
    columns = q.get("columns", [])  # products / procedures
    gate_col = columns[0]["key"]
    out = {}
    for row_label in rows:
        rv = table.get(row_label, {})
        gv = rv.get(gate_col, False)
        row_out = {gate_col: gv}
        for col in columns[1:]:
            ckey = col["key"]
            row_out[ckey] = rv.get(ckey) if gv is True else "not_applicable"
        out[row_label] = row_out
    return out


# --- views -----------------------------------------------------------------

def question_view(step: Step, answers: dict, sex: Any) -> dict:
    view = {
        "step": step.id,
        "type": step.kind,
        "label": step.label,
        "section": step.section,
        "section_id": step.section_id,
        "question_n": step.question_n,
        "followup": step.followup,
    }
    if step.hint:
        view["hint"] = step.hint
    if step.options:
        view["options"] = list(step.options)
    view["progress"] = {"completed": completed_count(answers, sex), "total": TOTAL_QUESTIONS}
    return view


def current_question(session):
    if session.current_step is None:
        return None
    step = STEPS_BY_ID.get(session.current_step)
    if step is None:
        return None
    return question_view(step, session.answers, session.meta.get("sex"))


def session_view(session) -> dict:
    return {
        "session_id": session.session_id,
        "done": session.done,
        "current_question": current_question(session),
        "answers": session.answers,
        "meta": session.meta,
        "progress": {
            "completed": completed_count(session.answers, session.meta.get("sex")),
            "total": TOTAL_QUESTIONS,
        },
    }
