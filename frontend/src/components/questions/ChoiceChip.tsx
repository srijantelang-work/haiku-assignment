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
        {selected ? "✓" : ""}
      </span>
      {label}
    </button>
  );
}
