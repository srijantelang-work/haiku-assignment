# Haiku Studio — Hair & Scalp Intake

A conversational intake web app for a hair & scalp clinic. Finishable in under 90 seconds by a 55-year-old on a phone, with voice assistance, 1-tap controls, and a structured 16-question clinical profile output.

---

## ⚡ How to Run

### 1. Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
python3 -m uvicorn app.main:app --reload --port 8000
```
*(Optional `.env` in `backend/`: `ELEVENLABS_API_KEY=...` and `CEREBRAS_API_KEY=...`)*

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
App runs at `http://localhost:5173`.

---

## 🧠 Choices & Architecture

- **Models & Services**:
  - **ElevenLabs Scribe v2**: Ultra-low latency STT with strong English & Hinglish accuracy.
  - **Cerebras (`gpt-oss-120b`)**: Sub-200ms structured extraction with strict JSON Schema output.
- **Bought vs. Built**:
  - *Bought*: ElevenLabs (STT), Cerebras (LLM structuring), `canvas-confetti`.
  - *Built*: Deterministic Python state machine ([engine.py](backend/app/engine.py)) with gating & skip logic, server-side back navigation stack, local session persistence, deterministic regex/Levenshtein fallback matcher ([voice.ts](frontend/src/voice.ts)), and bespoke medical UI with dark/light themes.
- **Testing Coverage**:
  - Verified 100% schema conformance against `intake-schema.json`.
  - Validated conditional gating (male vs. female question skips, habit follow-ups).
  - Tested edge cases (exclusive options, age bounds, voice fallbacks).

---

## 🔮 With One More Week
With one more week, I'd move this to an actual phone call. Patient dials in through Twilio, same 16 questions, same state machine and Cerebras structuring underneath, just over voice instead of tap/mic. The main change is swapping ElevenLabs' batch STT for their realtime streaming STT/TTS, since a call can't have the delay a button-press flow can. The hardest part is turn-taking: figuring out when someone's done talking, and handling interruptions, since the web version dodges that with a mic button. Once the call ends, I'd send the filled intake straight to WhatsApp via Twilio, so it's just pick up the phone, answer naturally, done.