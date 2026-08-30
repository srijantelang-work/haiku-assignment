import { useEffect, useRef, useState } from "react";
import type { QuestionProps } from "../../types";
import ChoiceChip from "./ChoiceChip";
import MicButton, { voiceSupported } from "../MicButton";
import { matchOption } from "../../voice";

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// Auto-advances on tap: the chosen chip flashes its selected state for a beat
// (~200ms) so the user sees what they tapped, then submits — no "next" click.
// The mic is a secondary input: say the option and it taps it for you.
export default function SingleQuestion({ question, onAnswer, submitting }: QuestionProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
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

  const onTranscript = (text: string) => {
    const opt = matchOption(text, question.options ?? []);
    if (opt) {
      setVoiceError(null);
      choose(opt);
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
            label={cap(opt)}
            selected={selected === opt}
            disabled={submitting}
            onClick={() => choose(opt)}
          />
        ))}
      </div>
      {voiceSupported && (
        <div className="voice-row">
          <span className="voice-hint">Or just say your answer</span>
          <MicButton onTranscript={onTranscript} disabled={submitting} />
          {voiceError && <span className="voice-error">{voiceError}</span>}
        </div>
      )}
    </div>
  );
}
