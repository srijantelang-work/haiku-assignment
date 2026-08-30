interface ChoiceChipProps {
  label: string;
  selected: boolean;
  disabled?: boolean;
  big?: boolean;
  onClick: () => void;
}

// Shared large tap target used by Single / Multi / YesNo. A leading dot turns
// into a filled check when selected; `big` is the two-option Yes/No layout.
export default function ChoiceChip({ label, selected, disabled, big, onClick }: ChoiceChipProps) {
  return (
    <button
      type="button"
      className={`chip${selected ? " selected" : ""}${big ? " chip-big" : ""}`}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
    >
      <span className="chip-dot" aria-hidden="true">
        {selected ? "✓" : ""}
      </span>
      {label}
    </button>
  );
}
