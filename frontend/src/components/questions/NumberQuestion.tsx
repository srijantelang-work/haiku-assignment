import { useState } from "react";
import type { QuestionProps } from "../../types";

export default function NumberQuestion({ onAnswer, submitting }: QuestionProps) {
  const [value, setValue] = useState("");

  const submit = () => {
    const n = parseInt(value, 10);
    if (Number.isNaN(n)) return;
    onAnswer(n);
  };

  return (
    <div className="number">
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={100}
        value={value}
        placeholder="e.g. 28"
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <button
        className="primary"
        disabled={value === "" || submitting}
        onClick={submit}
      >
        Continue
      </button>
    </div>
  );
}
