# Frontend — Progress Rail + Question Router (Phase 2)

A React + Vite + TypeScript shell that walks a patient through the intake by
reading each question's `type` from the Phase-1 API and routing it to the
matching component. It renders every type the backend emits — `single`, `multi`,
`yesno`, `bool` (table gate cells), `number`, `text` — plus a progress rail
(5 section dots + a "Q6 of 16" label) and a done screen that surfaces the final
structured data (`/export`).

> The Phase-2 plan lists a "table" branch, but the Phase-1 backend already
> expands table questions (habits / products / procedures) into atomic per-cell
> steps, so the router only ever sees the leaf types. Table cells render as
> yes/no + single-select steps.

## Run

Backend first (see `../backend/README.md`):

```bash
cd backend && python3 -m uvicorn app.main:app --reload   # → :8000
```

Then the frontend:

```bash
cd frontend
npm install
npm run dev          # → http://localhost:5173
```

The frontend calls `http://localhost:8000` by default (CORS is already open
server-side). To point at a different backend, build with `VITE_API_BASE`:

```bash
VITE_API_BASE=https://your-api.example npm run build
```

## Structure

- `src/App.tsx` — session orchestration: `POST /session` on mount,
  `POST /answer` on submit, done screen with `GET /export`.
- `src/api.ts` — tiny `fetch` client for the four endpoints.
- `src/components/ProgressRail.tsx` — 5 section dots + "Q N of 16".
- `src/components/QuestionRouter.tsx` — `switch` on `type`.
- `src/components/questions/*` — one component per type.

## Back button

Rendered but disabled: the Phase-1 state machine is forward-only (`current_step`
only advances), so rewinding needs backend support (a "go back to step" endpoint
or a client-owned cursor). That's a later phase.

## Checks

```bash
npm run typecheck    # tsc --noEmit
npm run build        # production build → dist/
```

## Test (Phase 2 acceptance)

Open `http://localhost:5173`, click through all 16 questions with dummy inputs.
You should land on the "You're all set" screen without crashing, and the rail
should read "Q16 of 16" with section E lit. For a **male** patient the rail must
jump from Q5 to Q8 (skipping Q6/Q7) — never counting backward.
