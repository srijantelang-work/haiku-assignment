import { useState } from "react";
import type { QuestionProps } from "../../types";

export default function TextQuestion({ onAnswer, submitting }: QuestionProps) {
  const [value, setValue] = useState("");

  return (
    <div className="text">
      <textarea
        rows={4}
        placeholder="Type your answer…"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        className="primary"
        disabled={!value.trim() || submitting}
        onClick={() => onAnswer(value.trim())}
      >
        Continue
      </button>
    </div>
  );
}
