# Backend — State Machine API (Phase 1)

A FastAPI service that runs one patient through the 16-question hair-&-scalp
intake **headlessly** — no frontend yet. The entire form logic (sequencing, skip
rules, table-row handling) lives here and is provable with `curl`/Postman.

The schema is the single source of truth: the app reads `../intake-schema.json`
(the canonical file locked in Phase 0) and derives every step from it — nothing
is hand-typed.

## Run

```bash
cd backend
python -m pip install -r requirements.txt
python3 -m uvicorn app.main:app --reload
# → http://127.0.0.1:8000  (docs at /docs)
```

## Endpoints

### `POST /session` — create a session
Returns `session_id` + the first question (the `sex` tap).

```bash
curl -s -X POST localhost:8000/session
# {"session_id":"...","question":{"step":"sex","type":"single","label":"Sex","section":"About you","section_id":"","question_n":0,"options":["female","male"],"progress":{"completed":0,"total":16}}}
```

Each question also carries `section_id` (`"A"`–`"E"`) and `question_n` (1–16) so
the frontend progress rail can show section dots and "Q N of 16" without parsing
step ids. Follow-up steps (smoking severity, salon detail, Q14 "describe") are
marked `"followup": true` and get friendlier copy; the sex pre-step carries a
`hint` ("So we can skip what doesn't apply to you.") the frontend shows as a
subtitle. CORS is open (`allow_origins=["*"]`) so the React shell can call from
its own dev origin.

### `GET /session/{id}` — current state
Returns the current question, all answers so far, and progress (`N of 16`).

### `POST /session/{id}/answer` — answer the current step
Body `{ "key": <current step>, "value": <value> }`. Applies skip rules, advances
`current_step`, returns the next question (or `"next_question": null` + `done: true`).

```bash
curl -s -X POST localhost:8000/session/$SID/answer -H 'content-type: application/json' -d '{"key":"sex","value":"female"}'
```

### `GET /session/{id}/export` — final answers
Returns the form keyed exactly to `intake-schema.json` field names. Skipped
fields are marked `"not_applicable"` (not omitted). Before completion it returns
`409` with `{"complete": false, ...}`.

### `GET /session/{id}/summary` — presentable summary
Same data as `/export`, grouped by section with human labels and formatted
values (`"Yes"`/`"No"`, `"Not applicable"` for skips, table rows flattened to
lines). The frontend summary screen renders this directly.

## Answer shapes

| type | value |
|---|---|
| `number` | int (1–100) |
| `single` | one option string |
| `multi` | array of option strings |
| `yesno` / `bool` | boolean |
| `text` | non-empty string |

Table questions expand into one step per cell. Step ids follow the pattern:

- habits → `q11.smoking`, `q11.smoking.smoking_severity`, `q11.hair_wash_frequency`, …
- products → `q12.r0.used`, `q12.r0.duration`, `q12.r0.helped`, `q12.r0.side_effects`, …
- procedures → `q13.r0.done`, `q13.r0.sessions`, `q13.r0.helped`, …
- Q14 follow-up → `q14.describe` (schema's literal `describe` key; names aren't graded)

Skip rules:

- `q6` / `q7` are skipped when `sex = male` → exported as `"not_applicable"`.
- A yes/no follow-up (smoking severity, salon detail, `describe`) is skipped when
  the parent is `no` → exported as `"not_applicable"`.
- Product `duration`/`helped`/`side_effects` skipped when `used = false`;
  procedure `sessions`/`helped` skipped when `done = false`.

## Test

```bash
cd backend
python -m pip install -r requirements-dev.txt
python -m pytest -q
```

Covers: full female run (hits Q6/Q7), full male run (auto-skips Q6/Q7),
smoking-yes → severity follow-up, smoking-no → skip, product/procedure gating,
export-before-complete `409`, invalid-option `422`, and key-mismatch `409`.
