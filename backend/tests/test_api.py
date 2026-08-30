"""End-to-end HTTP tests for the Phase-1 state-machine API."""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

TOP_LEVEL_KEYS = [
    "age_hair_loss_began", "duration", "family_history", "pattern",
    "diagnosed_conditions", "menstrual_cycle", "pregnancy_related",
    "adult_acne_oily_skin", "excess_body_facial_hair", "past_6_months",
    "habits", "products", "procedures", "past_treatment_side_effects",
    "sample_type", "consent",
]


def _default(q: dict):
    t = q["type"]
    if t in ("yesno", "bool"):
        return True
    if t == "number":
        return 30
    if t == "multi":
        return [q["options"][0]]
    if t == "single":
        return q["options"][0]
    if t == "text":
        return "detail"
    raise AssertionError(f"unknown type {t}")


def run(sex: str, overrides: dict | None = None):
    """Drive one full session headlessly; return (session_id, seen_steps, export)."""
    overrides = overrides or {}
    r = client.post("/session")
    assert r.status_code == 201, r.text
    sid = r.json()["session_id"]
    assert r.json()["question"]["step"] == "sex"

    client.post(f"/session/{sid}/answer", json={"key": "sex", "value": sex})

    seen = []
    while True:
        q = client.get(f"/session/{sid}").json()["current_question"]
        if q is None:
            break
        seen.append(q["step"])
        value = overrides.get(q["step"], _default(q))
        client.post(f"/session/{sid}/answer", json={"key": q["step"], "value": value})

    r = client.get(f"/session/{sid}/export")
    assert r.status_code == 200, r.text
    return sid, seen, r.json()


# --- full runs -------------------------------------------------------------

def test_female_full_run_hits_q6_q7():
    _, seen, exp = run("female")
    assert "q6" in seen and "q7" in seen
    assert exp["menstrual_cycle"] != "not_applicable"
    assert exp["pregnancy_related"] != "not_applicable"
    for key in TOP_LEVEL_KEYS:
        assert key in exp, key
    assert exp["age_hair_loss_began"] == 30
    assert exp["consent"] is True


def test_male_run_skips_q6_q7():
    _, seen, exp = run("male")
    assert "q6" not in seen and "q7" not in seen
    assert exp["menstrual_cycle"] == "not_applicable"
    assert exp["pregnancy_related"] == "not_applicable"
    for key in TOP_LEVEL_KEYS:
        assert key in exp, key


# --- smoking follow-up -----------------------------------------------------

def test_smoking_yes_triggers_severity():
    _, seen, exp = run("female", {"q11.smoking": True})
    assert "q11.smoking.smoking_severity" in seen
    assert exp["habits"]["smoking"]["smoking_severity"] == "Mild <5/day"


def test_smoking_no_skips_severity():
    _, seen, exp = run("female", {"q11.smoking": False})
    assert "q11.smoking.smoking_severity" not in seen
    assert exp["habits"]["smoking"]["smoking_severity"] == "not_applicable"


# --- table gating ----------------------------------------------------------

def test_products_used_false_gates_cells():
    _, seen, exp = run("female", {"q12.r0.used": False})
    assert "q12.r0.duration" not in seen
    assert "q12.r0.helped" not in seen
    assert "q12.r0.side_effects" not in seen
    row = exp["products"]["OTC/Medicated Shampoos"]
    assert row["used"] is False
    assert row["duration"] == "not_applicable"
    assert row["helped"] == "not_applicable"
    assert row["side_effects"] == "not_applicable"


def test_procedures_done_false_gates_cells():
    _, seen, exp = run("male", {"q13.r0.done": False})
    assert "q13.r0.sessions" not in seen
    assert "q13.r0.helped" not in seen
    row = exp["procedures"]["PRP/GFC/iPRF"]
    assert row["done"] is False
    assert row["sessions"] == "not_applicable"
    assert row["helped"] == "not_applicable"


# --- export before complete ------------------------------------------------

def test_export_before_complete_flags_incomplete():
    r = client.post("/session")
    sid = r.json()["session_id"]
    client.post(f"/session/{sid}/answer", json={"key": "sex", "value": "female"})
    r = client.get(f"/session/{sid}/export")
    assert r.status_code == 409
    body = r.json()
    assert body["complete"] is False
    assert body["progress"]["total"] == 16


# --- summary (presentable) -------------------------------------------------

def test_summary_endpoint_grouped_by_section():
    sid, _, _ = run("female", {"q11.smoking": True})
    r = client.get(f"/session/{sid}/summary")
    assert r.status_code == 200
    body = r.json()
    assert body["sex"] == "Female"
    assert [s["id"] for s in body["sections"]] == ["A", "B", "C", "D", "E"]
    habits_section = next(s for s in body["sections"] if s["id"] == "C")
    habits = next(i for i in habits_section["items"] if i["label"] == "Habits")
    assert isinstance(habits["value"], list)
    assert any("Smoking: Yes" in line for line in habits["value"])


def test_summary_marks_skipped_as_not_applicable():
    sid, _, _ = run("male")
    body = client.get(f"/session/{sid}/summary").json()
    assert body["sex"] == "Male"
    section_b = next(s for s in body["sections"] if s["id"] == "B")
    menstrual = next(i for i in section_b["items"] if i["label"] == "Menstrual Cycle")
    assert menstrual["value"] == "Not applicable"
    assert menstrual["skipped"] is True


# --- validation / state conflicts ------------------------------------------

def test_invalid_option_rejected():
    r = client.post("/session")
    sid = r.json()["session_id"]
    r = client.post(f"/session/{sid}/answer", json={"key": "sex", "value": "robot"})
    assert r.status_code == 422


def test_exclusive_option_cannot_be_combined():
    sid, _, _ = run("female")  # not used; just create+drive a fresh session below
    r = client.post("/session")
    sid2 = r.json()["session_id"]
    client.post(f"/session/{sid2}/answer", json={"key": "sex", "value": "female"})
    # drive to q3 (family_history), which has the exclusive "No known family history"
    for step, value in [
        ("q1", 30), ("q2", "Over a year"),
    ]:
        client.post(f"/session/{sid2}/answer", json={"key": step, "value": value})
    r = client.post(
        f"/session/{sid2}/answer",
        json={"key": "q3", "value": ["Father had hair loss", "No known family history"]},
    )
    assert r.status_code == 422


def test_key_mismatch_conflict():
    r = client.post("/session")
    sid = r.json()["session_id"]
    r = client.post(f"/session/{sid}/answer", json={"key": "q1", "value": 30})
    assert r.status_code == 409
