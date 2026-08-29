# Phase 0 Contract — Schema Lock & State Machine Design

> The single written contract Phases 1–4 build against. Nothing here is re-decided mid-build.
> Source of truth for every question: `/intake-schema.json` (read-only; never hand-typed).

## Locked decisions

1. **Sex gate — upfront tap, skip Q6/Q7.** A single `Female` / `Male` tap runs first. `Male`
   skips Q6 (`menstrual_cycle`) and Q7 (`pregnancy_related`) entirely.
2. **Sex is a session flag, not a graded answer.** Stored as `meta.sex` (`"female"` | `"male"`),
   used *only* for routing. Not part of `answers` / the graded output (may still be surfaced to the
   doctor in the final summary).
3. **Table questions are nested by row** in `answers` (see "Answer shape").
4. **`intake-schema.json` is canonical and read-only.** Frontend renders from it; backend validates
   against it. Stack/architecture is deferred to Phase 1, but the schema path is fixed now.

## A. Rule table — every question, key, type, and skip condition

| Step | Question | key | type | Skip / conditional |
|---|---|---|---|---|
| 0 | Sex (pre-step) | `meta.sex` | tap F/M | always first; **not graded** |
| 1 | Age hair loss began | `age_hair_loss_began` | number | — |
| 2 | Duration | `duration` | single | — |
| 3 | Family history | `family_history` | multi | — |
| 4 | Pattern | `pattern` | multi | — |
| 5 | Diagnosed conditions | `diagnosed_conditions` | multi | — |
| 6 | Menstrual cycle | `menstrual_cycle` | single | **skip if `sex = male`** |
| 7 | Pregnancy-related | `pregnancy_related` | single | **skip if `sex = male`** |
| 8 | Adult acne / oily skin | `adult_acne_oily_skin` | yesno | — |
| 9 | Excess body/facial hair | `excess_body_facial_hair` | yesno | — |
| 10 | Past 6 months | `past_6_months` | multi | — |
| 11 | Habits | `habits` | table | see sub-rules |
| 12 | Products | `products` | table | per-row cells gated on `used` |
| 13 | Procedures | `procedures` | table | per-row cells gated on `done` |
| 14 | Past-treatment side effects | `past_treatment_side_effects` | yesno | if **yes** → follow-up text |
| 15 | Sample type | `sample_type` | single | — |
| 16 | Consent | `consent` | yesno | — |

### Habits (Q11) sub-rules

| row key | type | follow-up |
|---|---|---|
| `smoking` | yesno | if **yes** → `smoking_severity` (single: Mild <5 / Moderate 5–10 / Severe >10/day) |
| `alcohol` | yesno | — |
| `hard_water` | yesno | — |
| `hair_wash_frequency` | single | (Daily / Alternate Days / Weekly) — no gate |
| `heating_tools_styling_chemicals` | yesno | — |
| `salon_treatments` | yesno | if **yes** → `salon_treatment_detail` (text) |

### Products (Q12) — 5 rows

`OTC/Medicated Shampoos`, `Hair Oils/Serums`, `Topical Minoxidil`, `Oral Minoxidil`, `Supplements`.
Per row: `used` (bool) → if **yes** then `duration` (single: <3mo / 3-6mo / >6mo), `helped` (yesno),
`side_effects` (yesno). If `used = no`, the other three cells are omitted.

### Procedures (Q13) — 4 rows

`PRP/GFC/iPRF`, `Stem Cells/Exosomes`, `Hair Transplant`, `Other`.
Per row: `done` (bool) → if **yes** then `sessions` (single: 1-3 / 4-6 / >6), `helped` (yesno).
If `done = no`, the other two cells are omitted.

## B. State machine — ordered steps with next-question pointers

Linear DAG, one atomic question per step (phone-first). Table questions expand into per-row steps.

```
sex ─▶ q1 ─▶ q2 ─▶ q3 ─▶ q4 ─▶ q5 ─▶ q6 ─▶ q7 ─▶ q8 ─▶ q9 ─▶ q10 ─▶ [q11 habits] ─▶ [q12] ─▶ [q13] ─▶ q14 ─▶ q15 ─▶ q16 ─▶ done
                                     └─(if male)──────────────────────▶ q8
```

Branch points (the only non-linear logic):

- **`q5` →** `q6` if `sex = female`, else `q8`.
- **`q11.smoking`** = yes → `q11.smoking.severity` → `q11.alcohol`; no → `q11.alcohol`.
- **`q11.salon_treatments`** = yes → `q11.salon.detail` → `q12`; no → `q12`.
- **each `q12.<row>.used`** = yes → `duration` → `helped` → `side_effects` → next row; no → next row.
- **each `q13.<row>.done`** = yes → `sessions` → `helped` → next row; no → next row.
- **`q14`** = yes → `q14.describe` → `q15`; no → `q15`.

Row order is fixed: habits `smoking → alcohol → hard_water → hair_wash_frequency →
heating_tools_styling_chemicals → salon_treatments`; products & procedures follow the schema's array
order. Back-navigation is a UI concern only — it is not part of the data contract and never
invalidates already-committed answers.

## C. Session JSON shape (runtime)

```jsonc
{
  "session_id": "a1b2…",            // uuid; no user identity (no login/admin)
  "current_step": "q11.smoking",    // a step id above; "done" when complete
  "schema_version": "1.0",          // pinned so BE can reject mismatched schemas
  "answers": { /* graded output — exactly the 16 questions; see below */ },
  "meta": {
    "sex": "female",                // "female" | "male" — routing only, NOT graded
    "started_at": "2026-08-30T…Z"   // made-up patients only; no PII
  }
}
```

The **graded output** is `answers` alone (coverage + correctness are judged; field *names* are not).
`meta`, `session_id`, `current_step`, and `schema_version` are runtime scaffolding, stripped from the
final "form filled" payload.

## D. Answer shape — nested by row

- Simple questions: `answers.<key>` = scalar (`single` / `number` / `yesno` → bool) or array (`multi`).
- `habits`: `answers.habits.<rowKey>`, where yes/no rows are `{ value: bool, <followup>? }` and the
  single-select row is a bare string. Follow-up keys nest inside the row.
- `products` / `procedures`: `answers.<rowKey>` keyed by the **schema's display string** (zero
  hand-mapping; e.g. `"OTC/Medicated Shampoos"`), value = the gated column object.
- Q14 follow-up (flat, non-table) is `answers.past_treatment_side_effects_detail` (schema's original
  `"describe"` key renamed for clarity — names are not graded).

Example (partial):

```json
"answers": {
  "age_hair_loss_began": 28,
  "duration": "Over a year",
  "family_history": ["Father had hair loss", "Mother had hair loss"],
  "menstrual_cycle": "Regular",
  "habits": {
    "smoking": { "value": true, "smoking_severity": "Moderate 5-10/day" },
    "alcohol": { "value": false },
    "hair_wash_frequency": "Daily",
    "salon_treatments": { "value": true, "salon_treatment_detail": "Keratin smoothing" }
  },
  "products": {
    "OTC/Medicated Shampoos": { "used": true, "duration": ">6mo", "helped": true, "side_effects": false },
    "Topical Minoxidil": { "used": true, "duration": "3-6mo", "helped": false, "side_effects": true },
    "Oral Minoxidil": { "used": false }
  },
  "procedures": { "PRP/GFC/iPRF": { "done": true, "sessions": "4-6", "helped": true } },
  "past_treatment_side_effects": true,
  "past_treatment_side_effects_detail": "Itching after minoxidil",
  "sample_type": "Saliva",
  "consent": true
}
```

## E. Validation / consistency rules

- `number`: integer 1–100 (age). Non-empty.
- `yesno` / `bool`: boolean only.
- `single` / `multi`: value(s) must come from the schema's option list verbatim.
- Exclusive options: `family_history`'s "No known family history" and `diagnosed_conditions`'s
  "None" are mutually exclusive with the other options in the same question.
- Follow-up `text` (salon detail, side-effect detail): non-empty when the gate is yes.
- Skipped questions (Q6/Q7 for male, gated cells for `used=no` / `done=no`) are **absent** from
  `answers`, never `null`.

## Verification (by eye)

Walk the rule table against all 16 questions + every follow-up and confirm:

1. Every step has exactly one **next** pointer; no dead ends or ambiguous branches.
2. Both branches of every conditional are defined (sex gate; smoking severity; salon detail; each
   `used` / `done` gate; Q14 describe).
3. Q6 & Q7 absent for `male`; gated cells absent when `used/done = no`.
4. `answers` covers all 16 questions (and `meta.sex` covers routing) with no `null`s.
5. `answers` + `meta.sex` fully reproduce the page-2 form as structured data.
