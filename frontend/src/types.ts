export type QuestionType = "single" | "multi" | "yesno" | "bool" | "number" | "text";

export interface Question {
  step: string;
  type: QuestionType;
  label: string;
  section: string;
  section_id: string;
  question_n: number;
  followup: boolean;
  hint?: string;
  options?: string[];
  progress: { completed: number; total: number };
}

export interface SessionResponse {
  session_id: string;
  question: Question;
}

export interface SessionDetailResponse {
  session_id: string;
  done: boolean;
  current_question: Question | null;
  answers: Record<string, unknown>;
  meta: Record<string, unknown>;
  progress: { completed: number; total: number };
  can_go_back?: boolean;
}

export interface AnswerResponse {
  session_id: string;
  answered: { key: string };
  next_question: Question | null;
  done: boolean;
  can_go_back?: boolean;
}

export interface BackResponse {
  session_id: string;
  question: Question;
  can_go_back: boolean;
}

export interface StructureResult {
  key: string;
  value: unknown;
  uncertain: boolean;
}

export interface ReviewItem {
  key: string;
  label: string;
  type: QuestionType;
  options?: string[];
  value: string | string[];
  skipped: boolean;
}

export interface ReviewSection {
  id: string;
  title: string;
  items: ReviewItem[];
}

export interface ReviewResponse {
  sections: ReviewSection[];
  export: Record<string, unknown>;
}

export interface QuestionProps {
  question: Question;
  onAnswer: (value: unknown) => void;
  submitting: boolean;
  structureTranscript: (key: string, transcript: string) => Promise<StructureResult>;
}

export interface SummaryItem {
  label: string;
  value: string | string[];
  skipped?: boolean;
}

export interface SummarySection {
  id: string;
  title: string;
  items: SummaryItem[];
}

export interface SummaryResponse {
  sex: string | null;
  sections: SummarySection[];
}
