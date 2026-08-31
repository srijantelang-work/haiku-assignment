import { useState } from "react";
import type { QuestionProps } from "../../types";

const MIN = 1;
const MAX = 100;
const PRESET_AGES = [18, 22, 28, 35, 45, 55];

export default function NumberQuestion({ onAnswer, submitting }: QuestionProps) {
  const [value, setValue] = useState("");
  const n = parseInt(value, 10);
  const valid = value !== "" && !Number.isNaN(n) && n >= MIN && n <= MAX;

  const submit = (val?: number) => {
    const finalVal = val !== undefined ? val : n;
    if (finalVal >= MIN && finalVal <= MAX) {
      onAnswer(finalVal);
    }
  };

  const handlePreset = (age: number) => {
    setValue(String(age));
    submit(age);
  };

  const adjust = (delta: number) => {
    const current = Number.isNaN(n) ? 25 : n;
    const next = Math.max(MIN, Math.min(MAX, current + delta));
    setValue(String(next));
  };

  return (
    <div className="number-question-container">
      <div className="number-stepper-row">
        <button
          type="button"
          className="stepper-btn"
          onClick={() => adjust(-1)}
          disabled={submitting || (valid && n <= MIN)}
          aria-label="Decrease"
        >
          −
        </button>

        <div className="number-input-wrap">
          <input
            type="number"
            inputMode="numeric"
            min={MIN}
            max={MAX}
            value={value}
            placeholder="Age"
            autoFocus
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <span className="number-unit">years old</span>
        </div>

        <button
          type="button"
          className="stepper-btn"
          onClick={() => adjust(1)}
          disabled={submitting || (valid && n >= MAX)}
          aria-label="Increase"
        >
          +
        </button>
      </div>

      <div className="quick-presets">
        <span className="preset-label">Quick select:</span>
        <div className="preset-chips">
          {PRESET_AGES.map((age) => (
            <button
              key={age}
              type="button"
              className={`preset-chip${n === age ? " active" : ""}`}
              disabled={submitting}
              onClick={() => handlePreset(age)}
            >
              {age}
            </button>
          ))}
        </div>
      </div>

      {value !== "" && !valid && (
        <p className="hint">Please enter an age between {MIN} and {MAX}.</p>
      )}

      <button className="primary" disabled={!valid || submitting} onClick={() => submit()}>
        Continue
      </button>
    </div>
  );
}
