Phase 1 — Backend Skeleton: State Machine API

Time: 45–60 min

Objective: A FastAPI service that can run one patient through the form via a small number of endpoints, with no frontend yet.

What we do:

POST /session → creates a session, returns session_id + first question.
GET /session/{id} → returns current state: current question, all answers so far, progress (e.g. "6 of 16").
POST /session/{id}/answer → accepts { key, value } for a tap/number/text answer, applies skip rules, advances current_step, returns the next question (or null if done).
GET /session/{id}/export → returns the final answers object keyed exactly to intake-schema.json field names, with skipped fields explicitly marked "not_applicable" rather than omitted.
In-memory dict for sessions is fine (no DB needed — rules say no login/no admin panel, so no persistence requirement either).

What we achieve: The entire form logic — sequencing, skip rules, table-row handling — working headlessly, provable with curl/Postman before any UI exists.

What we can test:

Script a full 16-question run via HTTP calls for a female patient (hits Q6/Q7) and a male patient (auto-skips Q6/Q7) and confirm /export output matches expected JSON for both.
Confirm smoking-yes triggers the severity follow-up question and smoking-no skips straight past it.
Confirm /export before the session is complete either 404s or clearly flags "incomplete."