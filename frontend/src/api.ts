import type { AnswerResponse, SessionResponse, SummaryResponse } from "./types";

// The backend (Phase 1) runs on :8000. Override with VITE_API_BASE at build
// time for a deployed backend (CORS is already enabled server-side).
const BASE: string = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = (body && (body.detail || body.message)) || res.statusText;
    throw new Error(typeof detail === "string" ? detail : "Request failed");
  }
  return body as T;
}

export function createSession(): Promise<SessionResponse> {
  return request<SessionResponse>("/session", { method: "POST" });
}

export function submitAnswer(
  sessionId: string,
  key: string,
  value: unknown
): Promise<AnswerResponse> {
  return request<AnswerResponse>(`/session/${sessionId}/answer`, {
    method: "POST",
    body: JSON.stringify({ key, value }),
  });
}

export function exportSession(sessionId: string): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>(`/session/${sessionId}/export`);
}

export function exportSummary(sessionId: string): Promise<SummaryResponse> {
  return request<SummaryResponse>(`/session/${sessionId}/summary`);
}

// Speech-to-text (Phase 5). Posts the raw audio blob to the backend, which is
// the only place that holds the ElevenLabs key — it never touches the browser.
export async function transcribe(audio: Blob): Promise<string> {
  const res = await fetch(`${BASE}/transcribe`, {
    method: "POST",
    headers: { "Content-Type": audio.type || "audio/webm" },
    body: audio,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = body && body.detail ? body.detail : res.statusText;
    throw new Error(typeof detail === "string" ? detail : "Transcription failed");
  }
  return (body as { text: string }).text;
}
