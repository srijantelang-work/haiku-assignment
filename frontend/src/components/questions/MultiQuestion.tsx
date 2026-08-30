import { useState } from "react";
import type { QuestionProps } from "../../types";
import ChoiceChip from "./ChoiceChip";

// Multi-active chips with an explicit "Continue" — multiple taps are expected,
// so it must never auto-advance on a single tap.
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
          <ChoiceChip
            key={opt}
            label={opt}
            selected={selected.includes(opt)}
            disabled={submitting}
            onClick={() => toggle(opt)}
          />
        ))}
      </div>
      <button
        className="primary"
        disabled={selected.length === 0 || submitting}
        onClick={() => onAnswer(selected)}
      >
        {selected.length > 0 ? `Continue · ${selected.length} selected` : "Continue"}
      </button>
    </div>
  );
}
