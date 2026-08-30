import { useEffect, useRef, useState } from "react";
import type { QuestionProps } from "../../types";
import ChoiceChip from "./ChoiceChip";
import MicButton, { voiceSupported } from "../MicButton";
import { matchYesNo } from "../../voice";

// Two big chips; auto-advances on tap with the same brief confirmation flash.
// The mic is a secondary input: "yes" / "no" taps the matching chip.
export default function YesNoQuestion({ onAnswer, submitting }: QuestionProps) {
  const [selected, setSelected] = useState<boolean | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
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

  const onTranscript = (text: string) => {
    const v = matchYesNo(text);
    if (v === null) {
      setVoiceError("Didn't catch that — say \"yes\" or \"no\".");
    } else {
      setVoiceError(null);
      choose(v);
    }
  };

  return (
    <div className="stack">
      <div className="yesno">
        <ChoiceChip big label="Yes" selected={selected === true} disabled={submitting} onClick={() => choose(true)} />
        <ChoiceChip big label="No" selected={selected === false} disabled={submitting} onClick={() => choose(false)} />
      </div>
      {voiceSupported && (
        <div className="voice-row">
          <span className="voice-hint">Or just say "yes" or "no"</span>
          <MicButton onTranscript={onTranscript} disabled={submitting} />
          {voiceError && <span className="voice-error">{voiceError}</span>}
        </div>
      )}
    </div>
  );
}
