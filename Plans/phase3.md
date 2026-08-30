Phase 3 — Tap-Based Question Components (the majority of the 16)

Time: 1–1.5 hr

Objective: Build the real, polished versions of every non-voice question type — this is most of the form's actual surface area and most of the "How it feels" score.

What we do:

SingleSelect: large tap chips, one active state, auto-advances on tap (no separate "next" click needed for single-answer questions — reduces taps for the 55-year-old-on-phone target).
MultiSelect: same chip style, multi-active, explicit "Continue" button since multiple taps are expected.
YesNo: two big chips, auto-advances.
NumberInput: numeric keypad input (Q1: age hair loss began) with sane bounds (0–90).
TableQuestion (Q11 habits, Q12 products, Q13 procedures): render as a short sequence of per-row mini-questions rather than a literal table — a 55-year-old on a phone cannot fill a data-grid. One row at a time, same chip pattern, feels like more single questions rather than a spreadsheet.

What we achieve: 13 of the 16 questions (everything except the free-text/voice-first ones) are fully functional and good-feeling on both phone and laptop widths.

What we can test:

Full click-through on a real phone-width viewport (Chrome device toolbar) — every chip is thumb-reachable, no tiny tap targets.
Confirm auto-advance doesn't fire early on multi-select (a common bug: multi shouldn't advance until "Continue" is tapped).
Confirm table-style questions (Q11–Q13) produce the correct nested object shape in /export (row → columns), matching schema.