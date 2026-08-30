import { useEffect, useRef, useState } from "react";
import type { QuestionProps } from "../../types";
import ChoiceChip from "./ChoiceChip";

// Two big chips; auto-advances on tap with the same brief confirmation flash.
export default function YesNoQuestion({ onAnswer, submitting }: QuestionProps) {
  const [selected, setSelected] = useState<boolean | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  const choose = (v: boolean) => {
    if (selected !== null || submitting) return;
    setSelected(v);
    timer.current = window.setTimeout(() => onAnswer(v), 200);
  };

  return (
    <div className="yesno">
      <ChoiceChip big label="Yes" selected={selected === true} disabled={submitting} onClick={() => choose(true)} />
      <ChoiceChip big label="No" selected={selected === false} disabled={submitting} onClick={() => choose(false)} />
    </div>
  );
}
