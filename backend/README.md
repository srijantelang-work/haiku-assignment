# Backend — Intake API

FastAPI service powering the 16-question hair & scalp intake flow.

## Setup & Run

```bash
cd backend
python3 -m pip install -r requirements.txt
python3 -m uvicorn app.main:app --reload --port 8000
```

- API runs at `http://127.0.0.1:8000`
- Interactive docs available at `http://127.0.0.1:8000/docs`

## Environment Variables

Create `backend/.env`:

```env
ELEVENLABS_API_KEY=your_elevenlabs_key
CEREBRAS_API_KEY=your_cerebras_key
```

## Core Endpoints

- `POST /session` — Initialize a new intake session.
- `GET /session/{id}` — Get the current question and progress.
- `POST /session/{id}/answer` — Submit an answer and advance.
- `POST /session/{id}/structure` — Structure a voice transcript into an answer.
- `POST /transcribe` — Convert voice audio to text via ElevenLabs.
- `GET /session/{id}/export` — Export final answers conforming to `intake-schema.json`.
- `GET /session/{id}/summary` — Section-grouped summary for review.
