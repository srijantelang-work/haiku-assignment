import { useState } from "react";
import type { QuestionProps } from "../../types";
import MicButton from "../MicButton";

// Free-text (Q11 salon detail, Q14 side effects). The mic is the fast path:
// hold and speak, and the transcript drops into the textarea for review/edit.
export default function TextQuestion({ onAnswer, submitting }: QuestionProps) {
  const [value, setValue] = useState("");

  return (
    <div className="text">
      <textarea
        rows={4}
        placeholder="Type here, or hold the mic and say it"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <MicButton onTranscript={(t) => setValue(t)} disabled={submitting} />
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
