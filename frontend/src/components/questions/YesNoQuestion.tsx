import { useEffect, useRef, useState } from "react";
import type { QuestionProps } from "../../types";
import ChoiceChip from "./ChoiceChip";
import MicButton, { voiceSupported } from "../MicButton";
import { matchYesNo } from "../../voice";

export default function YesNoQuestion({ question, onAnswer, submitting, structureTranscript }: QuestionProps) {
  const [selected, setSelected] = useState<boolean | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [structuring, setStructuring] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const locked = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  const choose = (v: boolean) => {
    if (locked.current || submitting) return;
    setSelected(v);
    setPrefilled(false);
    locked.current = true;
    timer.current = window.setTimeout(() => onAnswer(v), 200);
  };

  const onTranscript = async (text: string) => {
    setStructuring(true);
    setVoiceError(null);
    try {
      const r = await structureTranscript(question.step, text);
      const matched = (!r.uncertain && typeof r.value === "boolean") ? r.value : matchYesNo(text);
      if (matched !== null) {
        setSelected(matched);
        setPrefilled(true);
      } else {
        setVoiceError(`Didn't catch that — heard "${text}". Say "yes" or "no".`);
      }
    } catch {
      const fallback = matchYesNo(text);
      if (fallback !== null) {
        setSelected(fallback);
        setPrefilled(true);
      } else {
        setVoiceError(`Didn't catch that — heard "${text}". Say "yes" or "no".`);
      }
    } finally {
      setStructuring(false);
    }
  };

  return (
    <div className="stack">
      <div className="yesno">
        <ChoiceChip big label="Yes" selected={selected === true} prefilled={prefilled && selected === true} disabled={submitting} onClick={() => choose(true)} />
        <ChoiceChip big label="No" selected={selected === false} prefilled={prefilled && selected === false} disabled={submitting} onClick={() => choose(false)} />
      </div>
      {prefilled && (
        <p className="confirm-hint">Auto-filled — tap to confirm, or pick the other.</p>
      )}
      {voiceSupported && (
        <div className="voice-row">
          <span className="voice-hint">Or just say "yes" or "no"</span>
          <MicButton onTranscript={onTranscript} disabled={submitting || structuring} />
          {structuring && <span className="voice-status">Matching your answer…</span>}
          {voiceError && <span className="voice-error">{voiceError}</span>}
        </div>
      )}
    </div>
  );
}
