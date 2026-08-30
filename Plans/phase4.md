Phase 4 — Conditional & Follow-Up Logic in the UI

Time: 30–45 min

Objective: Surface the skip/follow-up rules from Phase 0 visibly and smoothly in the UI, including the sex-routing question.

What we do:

Add the one-time sex tap-question before Section B, framed as "so we can skip what doesn't apply to you."
Wire smoking-yes → severity follow-up, salon-yes → detail follow-up, Q14-yes → describe follow-up, all as an inline second card immediately after the triggering answer (not a separate numbered question) so it reads as one continuous thought, not a form field.
On the review screen (built in Phase 6), explicitly show skipped questions as "Not applicable" rather than blank, so a reviewer can see the skip was intentional.

What we achieve: The form now feels adaptive rather than static — this is the biggest lever on the "Taste" criterion since it's explicitly called out in the brief ("some should be inferred from an earlier answer and just confirmed").

What we can test:

Run the male path and female-pregnant path back to back and confirm the question count and content genuinely differ.
Confirm answering smoking "No" never shows the severity card, and answering "Yes" always does.