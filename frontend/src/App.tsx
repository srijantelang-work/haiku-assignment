import { useCallback, useEffect, useState } from "react";
import ProgressRail from "./components/ProgressRail";
import QuestionRouter from "./components/QuestionRouter";
import Review from "./components/Review";
import Summary from "./components/Summary";
import ThemeSwitch from "./components/ThemeSwitch";
import {
  createSession,
  editSession,
  exportSummary,
  getReview,
  getSession,
  stepBack,
  structure,
  submitAnswer,
  submitSession,
} from "./api";
import { fireConfettiSideCannons } from "./confetti";
import type { Question, ReviewItem, ReviewResponse, SummaryResponse } from "./types";

type Status = "loading" | "ready" | "review" | "submitted" | "fatal";

const STORAGE_KEY = "haiku_session_id";
const THEME_STORAGE_KEY = "haiku_theme";

interface ClinicHeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

function ClinicHeader({ isDark, onToggleTheme }: ClinicHeaderProps) {
  return (
    <header className="clinic-header">
      <div className="clinic-brand">
        <span className="clinic-logo-mark">HAIKU</span>
        <span className="clinic-subtitle">Hair & Scalp Clinic</span>
      </div>
      <div className="clinic-actions">
        <span className="clinic-secure-tag">🔒 Confidential</span>
        <ThemeSwitch isDark={isDark} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}

export default function App() {
  const [status, setStatus] = useState<Status>("loading");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [review, setReview] = useState<ReviewResponse | null>(null);
  const [editing, setEditing] = useState<ReviewItem | null>(null);

  // Theme Management
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) return saved === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  useEffect(() => {
    const theme = isDark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  const initNewSession = useCallback(() => {
    createSession()
      .then((r) => {
        setSessionId(r.session_id);
        localStorage.setItem(STORAGE_KEY, r.session_id);
        setQuestion(r.question);
        setCanGoBack(false);
        setStatus("ready");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setStatus("fatal");
      });
  }, []);

  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (!savedId) {
      initNewSession();
      return;
    }

    getSession(savedId)
      .then(async (session) => {
        setSessionId(session.session_id);
        setCanGoBack(Boolean(session.can_go_back));

        if (session.done) {
          if (session.meta && session.meta.submitted) {
            setStatus("submitted");
            try {
              setSummary(await exportSummary(session.session_id));
            } catch {
              /* ignore summary load error */
            }
          } else {
            setStatus("review");
            setReview(await getReview(session.session_id));
          }
        } else if (session.current_question) {
          setQuestion(session.current_question);
          setStatus("ready");
        } else {
          initNewSession();
        }
      })
      .catch(() => {
        // Backend was restarted or session expired/invalid
        initNewSession();
      });
  }, [initNewSession]);

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
          setCanGoBack(Boolean(r.can_go_back));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSubmitting(false);
      }
    },
    [sessionId, question]
  );

  const handleBack = useCallback(async () => {
    if (!sessionId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await stepBack(sessionId);
      setQuestion(r.question);
      setCanGoBack(r.can_go_back);
      if (status === "review") {
        setStatus("ready");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }, [sessionId, submitting, status]);

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
      fireConfettiSideCannons();
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

  const restart = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  if (status === "loading") {
    return (
      <div className="screen">
        <div className="card" style={{ alignItems: "center", textAlign: "center", padding: "48px 24px" }}>
          <ClinicHeader isDark={isDark} onToggleTheme={toggleTheme} />
          <div className="mic-spinner" style={{ width: 28, height: 28, borderColor: "var(--line)", borderTopColor: "var(--accent)" }} />
          <p className="muted" style={{ margin: "8px 0 0" }}>Resuming your hair & scalp intake…</p>
        </div>
      </div>
    );
  }

  if (status === "fatal") {
    return (
      <div className="screen">
        <div className="card">
          <ClinicHeader isDark={isDark} onToggleTheme={toggleTheme} />
          <p className="error">{error}</p>
          <p className="muted">Make sure the backend is running on :8000, then try again.</p>
          <button className="primary" onClick={restart}>
            Retry Connection
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
            <ClinicHeader isDark={isDark} onToggleTheme={toggleTheme} />
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
                ← Cancel & Return to Review
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
          <div className="card" style={{ alignItems: "center", textAlign: "center", padding: "40px 20px" }}>
            <ClinicHeader isDark={isDark} onToggleTheme={toggleTheme} />
            <div className="mic-spinner" style={{ width: 28, height: 28, borderColor: "var(--line)", borderTopColor: "var(--accent)" }} />
            <p className="muted" style={{ margin: "8px 0 0" }}>Preparing your consultation summary…</p>
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      );
    }
    return (
      <div className="screen">
        <div className="card">
          <ClinicHeader isDark={isDark} onToggleTheme={toggleTheme} />
          <Review review={review} onEdit={handleEdit} onSubmit={handleSubmit} />
          <div className="footer" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="ghost"
              disabled={submitting}
              onClick={handleBack}
            >
              ← Back to questions
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </div>
      </div>
    );
  }

  if (status === "submitted") {
    return (
      <div className="screen">
        <div className="card done-card">
          <ClinicHeader isDark={isDark} onToggleTheme={toggleTheme} />
          <div className="check">✓</div>
          <h1>Intake Submitted</h1>
          <p className="muted">Your consultation profile has been delivered directly to your specialist.</p>
          {summary ? (
            <Summary summary={summary} />
          ) : (
            <button className="primary" onClick={handleSummary}>
              View Your Intake Summary
            </button>
          )}
          {error && <p className="error">{error}</p>}
          <button className="ghost" onClick={restart}>
            Start New Consultation Intake
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="card">
        <ClinicHeader isDark={isDark} onToggleTheme={toggleTheme} />
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
          <button
            type="button"
            className="ghost"
            disabled={!canGoBack || submitting}
            onClick={handleBack}
            aria-label="Go to previous question"
          >
            ← Previous Question
          </button>
        </div>
      </div>
    </div>
  );
}
