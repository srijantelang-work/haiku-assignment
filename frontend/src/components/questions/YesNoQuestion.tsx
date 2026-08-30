import type { QuestionProps } from "../../types";

export default function YesNoQuestion({ onAnswer, submitting }: QuestionProps) {
  return (
    <div className="yesno">
      <button className="option" disabled={submitting} onClick={() => onAnswer(true)}>
        Yes
      </button>
      <button className="option" disabled={submitting} onClick={() => onAnswer(false)}>
        No
      </button>
    </div>
  );
}
