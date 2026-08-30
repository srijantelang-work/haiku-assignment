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
  `POST /answer` on submit, done screen with `GET /summary`.
- `src/api.ts` — tiny `fetch` client for the endpoints.
- `src/components/ProgressRail.tsx` — 5 section dots + "Q N of 16".
- `src/components/QuestionRouter.tsx` — `switch` on `type`.
- `src/components/Summary.tsx` — presentable, section-grouped summary of the
  completed intake (renders the `/summary` payload; skips show "Not applicable").
- `src/components/questions/*` — one component per type, all built on a shared
  `ChoiceChip` (large thumb-reachable tap target with a check indicator).
- `src/components/MicButton.tsx` — press-to-talk voice input (Phase 5). Records
  while held, POSTs the clip to the backend `/transcribe` endpoint on release,
  and hands the transcript back. The ElevenLabs key never reaches the browser.
- `src/audio.ts` — re-encodes the browser's recorded container (WebM/Opus, Ogg,
  MP4/AAC) to mono 16-bit PCM WAV via the Web Audio API, since strict STT
  services reject Chrome's MediaRecorder WebM/Opus as "corrupted".

## Interaction model

- **Single / YesNo** auto-advance on tap — the chosen chip flashes its selected
  state for ~200ms, then submits (no "next" click). Double-taps are guarded.
- **Multi** is chip-toggling with an explicit **Continue** (never auto-advances).
- **Number** (`inputMode="numeric"`, big centered field) enforces 1–100, matching
  the backend validator.
- Table questions (habits / products / procedures) are already expanded into
  per-row atomic steps by the backend, so they feel like a sequence of single
  questions, not a data-grid.
- **Conditional logic** lives in the backend (Phase 1). The UI just surfaces it:
  the sex tap is framed "So we can skip what doesn't apply to you", and
  follow-ups (smoking → severity, salon → detail, Q14 → describe) render with a
  "Follow-up" pill as an inline continuation — the rail number does not move.
- **Voice (Phase 5)** is press-to-talk: hold the mic, speak, release. The clip
  is transcoded to WAV client-side, then sent to the backend `/transcribe`
  (which holds the ElevenLabs key). On the free-text questions the transcript
  drops into the textarea for review; on tap questions an "or just say your
  answer" row matches the spoken option to a chip (yes/no, single, multi).
  Too-short and silent clips are caught locally; service errors surface inline
  with a retry — no hard crash. The mic hides itself on browsers without
  `getUserMedia`/`MediaRecorder`, and needs HTTPS on non-localhost origins.

## Back button

Rendered but disabled: the Phase-1 state machine is forward-only (`current_step`
only advances), so rewinding needs backend support (a "go back to step" endpoint
or a client-owned cursor). That's a later phase.

## Checks

```bash
npm run typecheck    # tsc --noEmit
npm run build        # production build → dist/
```

## Test

Open `http://localhost:5173`, click through all 16 questions with dummy inputs.
You should land on the "You're all set" screen without crashing, and the rail
should read "Q16 of 16" with section E lit. For a **male** patient the rail must
jump from Q5 to Q8 (skipping Q6/Q7) — never counting backward.

Phase-3 checks (Chrome device toolbar, phone width):

- Every chip is ≥ 56px tall and thumb-reachable; single/yesno advance on one tap.
- Multi-select does **not** advance until "Continue" is tapped.
- Q11–Q13 produce the correct nested export shape (row → columns), matching
  `intake-schema.json` — e.g. `products["OTC/Medicated Shampoos"]` → `{used,
  duration, helped, side_effects}`.
