import { useState } from "react";
import type { QuestionProps } from "../../types";
import MicButton from "../MicButton";

export default function TextQuestion({ question, onAnswer, submitting, structureTranscript }: QuestionProps) {
  const [value, setValue] = useState("");
  const [prefilled, setPrefilled] = useState(false);
  const [structuring, setStructuring] = useState(false);

  const onTranscript = async (text: string) => {
    setStructuring(true);
    try {
      const r = await structureTranscript(question.step, text);
      const cleaned = (r && typeof r.value === "string" && r.value.trim()) ? r.value.trim() : text.trim();
      setValue(cleaned);
      setPrefilled(true);
    } catch {
      setValue(text.trim());
      setPrefilled(true);
    } finally {
      setStructuring(false);
    }
  };

  return (
    <div className="text">
      <textarea
        rows={4}
        className={prefilled ? "prefilled" : ""}
        placeholder="Type here, or hold the mic and say it"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setPrefilled(false);
        }}
      />
      {prefilled && (
        <p className="confirm-hint">Auto-filled — review and tap Continue.</p>
      )}
      <MicButton onTranscript={onTranscript} disabled={submitting || structuring} />
      {structuring && <span className="voice-status">Formatting your answer…</span>}
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
