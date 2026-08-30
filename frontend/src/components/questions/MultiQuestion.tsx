import { useState } from "react";
import type { QuestionProps } from "../../types";
import ChoiceChip from "./ChoiceChip";
import MicButton, { voiceSupported } from "../MicButton";
import { matchOption } from "../../voice";

// Multi-active chips with an explicit "Continue" — multiple taps are expected,
// so it must never auto-advance on a single tap. The mic toggles the option you
// speak (still needs "Continue" to confirm).
export default function MultiQuestion({ question, onAnswer, submitting }: QuestionProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const toggle = (opt: string) =>
    setSelected((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );

  const onTranscript = (text: string) => {
    const opt = matchOption(text, question.options ?? []);
    if (opt) {
      setVoiceError(null);
      toggle(opt);
    } else {
      setVoiceError("Didn't catch that — tap an option instead.");
    }
  };

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
      {voiceSupported && (
        <div className="voice-row">
          <span className="voice-hint">Or just say an option</span>
          <MicButton onTranscript={onTranscript} disabled={submitting} />
          {voiceError && <span className="voice-error">{voiceError}</span>}
        </div>
      )}
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
