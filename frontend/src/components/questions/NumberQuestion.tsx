import { useState } from "react";
import type { QuestionProps } from "../../types";

// Bounds match the backend validator (1–100), which is the source of truth.
const MIN = 1;
const MAX = 100;

export default function NumberQuestion({ onAnswer, submitting }: QuestionProps) {
  const [value, setValue] = useState("");
  const n = parseInt(value, 10);
  const valid = value !== "" && !Number.isNaN(n) && n >= MIN && n <= MAX;

  const submit = () => {
    if (valid) onAnswer(n);
  };

  return (
    <div className="number">
      <input
        type="number"
        inputMode="numeric"
        min={MIN}
        max={MAX}
        value={value}
        placeholder="e.g. 28"
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      {value !== "" && !valid && (
        <p className="hint">Enter a number between {MIN} and {MAX}.</p>
      )}
      <button className="primary" disabled={!valid || submitting} onClick={submit}>
        Continue
      </button>
    </div>
  );
}
