import { useCallback, useEffect, useState } from "react";
import ProgressRail from "./components/ProgressRail";
import QuestionRouter from "./components/QuestionRouter";
import Review from "./components/Review";
import Summary from "./components/Summary";
import {
  createSession,
  editSession,
  exportSummary,
  getReview,
  structure,
  submitAnswer,
  submitSession,
} from "./api";
import type { Question, ReviewItem, ReviewResponse, SummaryResponse } from "./types";

type Status = "loading" | "ready" | "review" | "submitted" | "fatal";

export default function App() {
  const [status, setStatus] = useState<Status>("loading");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [review, setReview] = useState<ReviewResponse | null>(null);
  const [editing, setEditing] = useState<ReviewItem | null>(null);

  useEffect(() => {
    createSession()
      .then((r) => {
        setSessionId(r.session_id);
        setQuestion(r.question);
        setStatus("ready");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setStatus("fatal");
      });
  }, []);

  const handleAnswer = useCallback(
    async (value: unknown) => {
      if (!sessionId || !question) return;
      setSubmitting(true);
      setError(null);
      try {
        const r = await submitAnswer(sessionId, question.step, value);
        if (r.done) {
          setQuestion(null);
          setStatus("review");
          setReview(await getReview(sessionId));
        } else {
          setQuestion(r.next_question);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSubmitting(false);
      }
    },
    [sessionId, question]
  );

  const structureTranscript = useCallback(
    async (key: string, transcript: string) => {
      if (!sessionId) throw new Error("No active session");
      return structure(sessionId, key, transcript);
    },
    [sessionId]
  );

  const handleEdit = useCallback((item: ReviewItem) => {
    setError(null);
    setEditing(item);
  }, []);

  const handleEditAnswer = useCallback(
    async (value: unknown) => {
      if (!sessionId || !editing) return;
      setSubmitting(true);
      setError(null);
      try {
        setReview(await editSession(sessionId, editing.key, value));
        setEditing(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSubmitting(false);
      }
    },
    [sessionId, editing]
  );

  const handleSubmit = useCallback(async () => {
    if (!sessionId) return;
    setError(null);
    try {
      await submitSession(sessionId);
      setStatus("submitted");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [sessionId]);

  const handleSummary = useCallback(async () => {
    if (!sessionId) return;
    setError(null);
    try {
      setSummary(await exportSummary(sessionId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [sessionId]);

  const restart = () => window.location.reload();

  if (status === "loading") {
    return (
      <div className="screen">
        <p className="muted">Starting your intake…</p>
      </div>
    );
  }

  if (status === "fatal") {
    return (
      <div className="screen">
        <div className="card">
          <p className="error">{error}</p>
          <p className="muted">Make sure the backend is running on :8000, then try again.</p>
          <button className="primary" onClick={restart}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (status === "review") {
    if (editing) {
      const editQuestion: Question = {
        step: editing.key,
        type: editing.type,
        label: editing.label,
        section: "Review",
        section_id: "",
        question_n: 0,
        followup: false,
        options: editing.options,
        progress: { completed: 0, total: 16 },
      };
      return (
        <div className="screen">
          <div className="card">
            <div className="body">
              <p className="section-label">Review · Edit</p>
              <h2 className="question-label">{editing.label}</h2>
              <QuestionRouter
                question={editQuestion}
                onAnswer={handleEditAnswer}
                submitting={submitting}
                structureTranscript={structureTranscript}
              />
              <button className="ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
              {error && <p className="error">{error}</p>}
            </div>
          </div>
        </div>
      );
    }
    if (!review) {
      return (
        <div className="screen">
          <div className="card">
            <p className="muted">Preparing your review…</p>
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      );
    }
    return (
      <div className="screen">
        <div className="card">
          <Review review={review} onEdit={handleEdit} onSubmit={handleSubmit} />
          {error && <p className="error">{error}</p>}
        </div>
      </div>
    );
  }

  if (status === "submitted") {
    return (
      <div className="screen">
        <div className="card done-card">
          <div className="check">✓</div>
          <h1>You're all set</h1>
          <p className="muted">Thanks — your intake is complete. We'll be in touch about next steps.</p>
          {summary ? (
            <Summary summary={summary} />
          ) : (
            <button className="primary" onClick={handleSummary}>
              View your summary
            </button>
          )}
          {error && <p className="error">{error}</p>}
          <button className="ghost" onClick={restart}>
            Start over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="card">
        <ProgressRail question={question} />
        {question && (
          <div className="body" key={question.step}>
            <p className="section-label">
              {question.section}
              {question.followup && <span className="followup-pill">Follow-up</span>}
            </p>
            <h2 className="question-label">{question.label}</h2>
            {question.hint && <p className="subtitle">{question.hint}</p>}
            <QuestionRouter
              question={question}
              onAnswer={handleAnswer}
              submitting={submitting}
              structureTranscript={structureTranscript}
            />
            {error && <p className="error">{error}</p>}
          </div>
        )}
        <div className="footer">
          <button className="ghost" disabled>
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}
