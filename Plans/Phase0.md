Phase 0 — Schema Lock & State Machine Design

Time: 30–45 min

Objective: Turn intake-schema.json into a single source of truth that both frontend and backend read from, and design the conditional/skip logic on paper before writing any UI.

What we do:

Copy intake-schema.json into the repo as the canonical schema (don't hand-type the 16 questions again).
Write out the skip/conditional rules as a small rule table: Q6/Q7 gated on the sex tap-question; Q11 smoking → follow-up severity; Q11 salon → follow-up text; Q14 → follow-up text.
Decide the field for "sex" — not a graded schema field, but a session-level flag used purely for routing. Name it clearly (e.g. _patient_sex, underscore-prefixed) so it's obviously not part of the graded output.
Sketch the full session JSON shape: { session_id, current_step, answers: { <schema keys> }, meta: { sex, started_at } }.

What we achieve: A written contract — every question's key, type, and skip condition — that Phases 1–4 build against without re-deciding anything mid-build.

What we can test: Nothing runnable yet. Test by eye: walk the rule table against all 16 questions and confirm every question has an unambiguous next-question pointer, including both branches of every conditional.