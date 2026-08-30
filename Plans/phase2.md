Phase 2 — Frontend Shell: Progress Rail + Question Router

Time: 45–60 min

Objective: A React shell that can display any question type by reading its type from the schema and routing to the right (stubbed) component — the scaffolding every later phase plugs into.

What we do:

One screen: progress rail (5 section dots, "Q6 of 16" label), the active question card, a back button.
QuestionRouter component: switch on type (single, multi, yesno, number, text, table) → renders a placeholder component per type for now.
Wire it to Phase 1's API: on mount, POST /session; on answer submit, POST /session/{id}/answer, re-render with the response's next question.

What we achieve: A clickable, deployable app that walks through all 16 questions end-to-end with placeholder UI — the "skeleton feels right" milestone.

What we can test:

Click through the entire form with dummy/placeholder inputs and confirm it reaches a "done" screen without crashing.
Confirm the progress rail number and section dot update correctly on every step, including skipped ones (should never show "Q6 of 16" and then jump back to a lower count).