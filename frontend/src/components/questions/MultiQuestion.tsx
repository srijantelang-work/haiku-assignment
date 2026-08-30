import { useState } from "react";
import type { QuestionProps } from "../../types";
import ChoiceChip from "./ChoiceChip";
import MicButton, { voiceSupported } from "../MicButton";
import { matchOption } from "../../voice";

export default function MultiQuestion({ question, onAnswer, submitting, structureTranscript }: QuestionProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [prefilled, setPrefilled] = useState(false);
  const [structuring, setStructuring] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const toggle = (opt: string) => {
    setPrefilled(false);
    setSelected((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );
  };

  const onTranscript = async (text: string) => {
    setStructuring(true);
    setVoiceError(null);
    try {
      const r = await structureTranscript(question.step, text);
      if (!r.uncertain && Array.isArray(r.value) && r.value.length > 0) {
        setSelected(r.value);
        setPrefilled(true);
      } else {
        const fallback = matchOption(text, question.options ?? []);
        if (fallback) {
          setSelected((prev) => (prev.includes(fallback) ? prev : [...prev, fallback]));
          setPrefilled(true);
        } else {
          setVoiceError(`Didn't catch that — heard "${text}". Tap the options that apply.`);
        }
      }
    } catch {
      const fallback = matchOption(text, question.options ?? []);
      if (fallback) {
        setSelected((prev) => (prev.includes(fallback) ? prev : [...prev, fallback]));
        setPrefilled(true);
      } else {
        setVoiceError(`Didn't catch that — heard "${text}". Tap the options that apply.`);
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
            label={opt}
            selected={selected.includes(opt)}
            prefilled={prefilled && selected.includes(opt)}
            disabled={submitting}
            onClick={() => toggle(opt)}
          />
        ))}
      </div>
      {prefilled && (
        <p className="confirm-hint">Auto-filled — review and tap Continue.</p>
      )}
      {voiceSupported && (
        <div className="voice-row">
          <span className="voice-hint">Or just say your answers</span>
          <MicButton onTranscript={onTranscript} disabled={submitting || structuring} />
          {structuring && <span className="voice-status">Matching your answers…</span>}
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
