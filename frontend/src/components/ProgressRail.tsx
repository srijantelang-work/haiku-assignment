import type { Question } from "../types";

const SECTION_MAP: Record<string, string> = {
  A: "Hair Loss History",
  B: "Hormonal & Health",
  C: "Lifestyle Triggers",
  D: "Care & Treatments",
  E: "Sample & Consent",
};

const SECTIONS = ["A", "B", "C", "D", "E"];

export default function ProgressRail({ question }: { question: Question | null }) {
  const current = question?.section_id ?? "A";
  const currentIdx = SECTIONS.indexOf(current);
  const sectionTitle = SECTION_MAP[current] || question?.section || "Intake";

  const total = question?.progress.total || 16;
  const completed = question ? question.question_n : 0;
  const pct = Math.min(100, Math.max(5, Math.round(((completed || 1) / total) * 100)));

  return (
    <div className="progress-rail-container">
      <div className="progress-rail-header">
        <div className="section-pill">
          <span className="section-pill-tag">Section {current}</span>
          <span className="section-pill-title">{sectionTitle}</span>
        </div>
        <span className="step-counter">
          {completed > 0 ? `Q${completed} of ${total}` : "Start"}
        </span>
      </div>

      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="dots-row">
        {SECTIONS.map((s, i) => {
          const isDone = i < currentIdx;
          const isActive = i === currentIdx;
          const cls = isDone ? "dot done" : isActive ? "dot active" : "dot";
          return (
            <div key={s} className="dot-wrapper">
              <span className={cls} title={`Section ${s}: ${SECTION_MAP[s]}`}>
                {isDone ? "✓" : s}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
