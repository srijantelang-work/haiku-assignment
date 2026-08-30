import { useState } from "react";
import type { QuestionProps } from "../../types";

export default function MultiQuestion({ question, onAnswer, submitting }: QuestionProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (opt: string) =>
    setSelected((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );

  return (
    <div className="stack">
      <div className="options">
        {(question.options ?? []).map((opt) => (
          <button
            key={opt}
            className={`option ${selected.includes(opt) ? "selected" : ""}`}
            disabled={submitting}
            onClick={() => toggle(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
      <button
        className="primary"
        disabled={selected.length === 0 || submitting}
        onClick={() => onAnswer(selected)}
      >
        Continue
      </button>
    </div>
  );
}
