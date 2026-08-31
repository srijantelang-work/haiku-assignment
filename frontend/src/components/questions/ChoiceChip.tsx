interface ChoiceChipProps {
  label: string;
  selected: boolean;
  prefilled?: boolean;
  disabled?: boolean;
  big?: boolean;
  onClick: () => void;
}

export default function ChoiceChip({ label, selected, prefilled, disabled, big, onClick }: ChoiceChipProps) {
  return (
    <button
      type="button"
      className={`chip${selected ? " selected" : ""}${prefilled ? " prefilled" : ""}${big ? " chip-big" : ""}`}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
    >
      <span className="chip-dot" aria-hidden="true">
        {selected ? (
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
            <path
              d="M3.5 8.5L6.5 11.5L12.5 4.5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      <span className="chip-label-text">{label}</span>
      {prefilled && (
        <span className="prefilled-sparkle-tag" title="Auto-filled from speech">
          ✨ Suggested
        </span>
      )}
    </button>
  );
}
