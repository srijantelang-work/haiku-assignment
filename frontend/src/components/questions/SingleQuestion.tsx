import { useEffect, useRef, useState } from "react";
import type { QuestionProps } from "../../types";
import ChoiceChip from "./ChoiceChip";
import MicButton, { voiceSupported } from "../MicButton";
import { matchOption } from "../../voice";

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export default function SingleQuestion({ question, onAnswer, submitting, structureTranscript }: QuestionProps) {
  const [selected, setSelected] = useState<string | null>(null);
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

  const choose = (opt: string) => {
    if (locked.current || submitting) return;
    setSelected(opt);
    setPrefilled(false);
    locked.current = true;
    timer.current = window.setTimeout(() => onAnswer(opt), 200);
  };

  const onTranscript = async (text: string) => {
    setStructuring(true);
    setVoiceError(null);
    try {
      const r = await structureTranscript(question.step, text);
      const matched = (!r.uncertain && typeof r.value === "string") ? r.value : matchOption(text, question.options ?? []);
      if (matched) {
        setSelected(matched);
        setPrefilled(true);
      } else {
        setVoiceError(`Didn't catch that — heard "${text}". Tap an option instead.`);
      }
    } catch {
      const fallback = matchOption(text, question.options ?? []);
      if (fallback) {
        setSelected(fallback);
        setPrefilled(true);
      } else {
        setVoiceError(`Didn't catch that — heard "${text}". Tap an option instead.`);
      }
    } finally {
      setStructuring(false);
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
            prefilled={prefilled && selected === opt}
            disabled={submitting}
            onClick={() => choose(opt)}
          />
        ))}
      </div>
      {prefilled && (
        <p className="confirm-hint">Auto-filled — tap to confirm, or pick another option.</p>
      )}
      {voiceSupported && (
        <div className="voice-row">
          <span className="voice-hint">Or just say your answer</span>
          <MicButton onTranscript={onTranscript} disabled={submitting || structuring} />
          {structuring && <span className="voice-status">Matching your answer…</span>}
          {voiceError && <span className="voice-error">{voiceError}</span>}
        </div>
      )}
    </div>
  );
}
