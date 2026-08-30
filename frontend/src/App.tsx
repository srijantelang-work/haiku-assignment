import { useCallback, useEffect, useState } from "react";
import ProgressRail from "./components/ProgressRail";
import QuestionRouter from "./components/QuestionRouter";
import { createSession, exportSession, submitAnswer } from "./api";
import type { Question } from "./types";

type Status = "loading" | "ready" | "done" | "fatal";

export default function App() {
  const [status, setStatus] = useState<Status>("loading");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);

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
          setStatus("done");
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

  const handleSummary = useCallback(async () => {
    if (!sessionId) return;
    setError(null);
    try {
      setSummary(await exportSession(sessionId));
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

  if (status === "done") {
    return (
      <div className="screen">
        <div className="card done-card">
          <div className="check">✓</div>
          <h1>You're all set</h1>
          <p className="muted">Thanks — your intake is complete. We'll be in touch about next steps.</p>
          {summary ? (
            <pre className="summary">{JSON.stringify(summary, null, 2)}</pre>
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
            <QuestionRouter question={question} onAnswer={handleAnswer} submitting={submitting} />
            {error && <p className="error">{error}</p>}
          </div>
        )}
        <div className="footer">
          {/* Back navigation needs backend support (forward-only state machine in
              Phase 1). Rendered as part of the shell; wired in a later phase. */}
          <button className="ghost" disabled title="Back navigation ships in a later phase">
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}
