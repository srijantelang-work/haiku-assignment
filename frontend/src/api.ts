import type {
  AnswerResponse,
  ReviewResponse,
  SessionResponse,
  StructureResult,
  SummaryResponse,
} from "./types";

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
  if (body === null) {
    throw new Error("Invalid or empty server response");
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

export function structure(
  sessionId: string,
  key: string,
  transcript: string
): Promise<StructureResult> {
  return request<StructureResult>(`/session/${sessionId}/structure`, {
    method: "POST",
    body: JSON.stringify({ key, transcript }),
  });
}

export function getReview(sessionId: string): Promise<ReviewResponse> {
  return request<ReviewResponse>(`/session/${sessionId}/review`);
}

export function editSession(
  sessionId: string,
  key: string,
  value: unknown
): Promise<ReviewResponse> {
  return request<ReviewResponse>(`/session/${sessionId}/edit`, {
    method: "POST",
    body: JSON.stringify({ key, value }),
  });
}

export function submitSession(sessionId: string): Promise<{ submitted: boolean }> {
  return request<{ submitted: boolean }>(`/session/${sessionId}/submit`, {
    method: "POST",
  });
}

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
