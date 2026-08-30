import { useEffect, useRef, useState } from "react";
import type { QuestionProps } from "../../types";
import ChoiceChip from "./ChoiceChip";

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// Auto-advances on tap: the chosen chip flashes its selected state for a beat
// (~200ms) so the user sees what they tapped, then submits — no "next" click.
export default function SingleQuestion({ question, onAnswer, submitting }: QuestionProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  const choose = (opt: string) => {
    if (selected !== null || submitting) return;
    setSelected(opt);
    timer.current = window.setTimeout(() => onAnswer(opt), 200);
  };

  return (
    <div className="options">
      {(question.options ?? []).map((opt) => (
        <ChoiceChip
          key={opt}
          label={cap(opt)}
          selected={selected === opt}
          disabled={submitting}
          onClick={() => choose(opt)}
        />
      ))}
    </div>
  );
}
