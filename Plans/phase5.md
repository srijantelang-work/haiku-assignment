Phase 5 — Voice Input Pipeline (STT)

Time: 1.5–2 hr

Objective: Get spoken answers working for the free-text/descriptive questions (Q11 salon detail, Q14 describe side effects) and as an optional input mode for tap questions.

What we do:

Mic button component: press-to-talk (simplest, most reliable on mobile — avoid always-listening, which drains battery/permissions friction and is riskier to demo).
Wire to ElevenLabs STT (Scribe): record → send audio → get transcript back, show live/near-live transcript text under the mic.
Add mic as a secondary input option on select tap-questions too (e.g. "or just say your answer") — this is a good "Ideas" callout: patient never has to hunt for the right chip if it's faster to just say it.
Handle STT failure/silence gracefully (retry button, no hard crash).

Credentials & setup: Sign up at elevenlabs.io, generate an API key from Dashboard → Settings → API Keys (a single xi-api-key string, no OAuth). Use Scribe v2 (batch), not Scribe v2 Realtime — press-to-talk on a short clip doesn't need the ~150ms realtime variant, and batch is cheaper ($0.22/hr vs $0.39/hr). Skip diarization/entity-detection/keyterm-prompting add-ons — single speaker, known question, they add cost with no benefit here. The free tier (10,000 credits/month) covers prototyping but has no commercial license, which is fine for a take-home demo. Key setup: .env (gitignored) locally, platform env var on Render/Railway when deployed — and it must only ever be called from the FastAPI backend, never the React frontend, or it's exposed in the browser's network tab (this is exactly what Phase 9's key-exposure check verifies).

What we achieve: Real audio-in working end-to-end for at least the two free-text questions, with the option extended to other questions as time allows.

What we can test:

Record a real answer for Q14 on a phone browser and confirm a transcript reaches the frontend within a couple seconds.
Test on a flaky/slow connection (throttle in devtools) to confirm the UI doesn't look broken while waiting.
Test silence/no-speech input and confirm it fails visibly rather than silently.