// Shapes returned by the Phase-1 backend (see backend/README.md).
//
// Note on "table": the Phase-2 plan lists "table" as a router branch, but the
// backend expands every table question (habits / products / procedures) into
// atomic per-cell steps *before* it reaches the frontend. So the router only
// ever sees the leaf types below (single / multi / yesno / bool / number /
// text) — the "table" branch is handled server-side.

export type QuestionType = "single" | "multi" | "yesno" | "bool" | "number" | "text";

export interface Question {
  step: string;
  type: QuestionType;
  label: string;
  section: string;
  section_id: string; // "A".."E" ("" for the sex pre-step)
  question_n: number; // 1-based top-level question number (0 for the sex pre-step)
  options?: string[];
  progress: { completed: number; total: number };
}

export interface SessionResponse {
  session_id: string;
  question: Question;
}

export interface AnswerResponse {
  session_id: string;
  answered: { key: string };
  next_question: Question | null;
  done: boolean;
}

// Props every question component shares.
export interface QuestionProps {
  question: Question;
  onAnswer: (value: unknown) => void;
  submitting: boolean;
}
