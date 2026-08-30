import type { Question } from "../types";

const SECTIONS = ["A", "B", "C", "D", "E"];

export default function ProgressRail({ question }: { question: Question | null }) {
  const current = question?.section_id ?? "";
  const currentIdx = SECTIONS.indexOf(current);

  const label =
    question && question.question_n > 0
      ? `Q${question.question_n} of ${question.progress.total}`
      : "Start";

  return (
    <div className="progress-rail">
      <div className="dots">
        {SECTIONS.map((s, i) => {
          const cls =
            i < currentIdx ? "dot done" : i === currentIdx ? "dot active" : "dot";
          return (
            <span key={s} className={cls} title={`Section ${s}`}>
              {i < currentIdx ? "✓" : s}
            </span>
          );
        })}
      </div>
      <span className="count">{label}</span>
    </div>
  );
}
