import type { QuestionProps } from "../../types";

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export default function SingleQuestion({ question, onAnswer, submitting }: QuestionProps) {
  return (
    <div className="options">
      {(question.options ?? []).map((opt) => (
        <button
          key={opt}
          className="option"
          disabled={submitting}
          onClick={() => onAnswer(opt)}
        >
          {cap(opt)}
        </button>
      ))}
    </div>
  );
}
