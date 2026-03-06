"use client";

interface Props {
  value: number;
  max: number;
  onChange: (value: number) => void;
  readOnly?: boolean;
}

export function RatingField({ value, max, onChange, readOnly }: Props) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          className={`text-xl transition-colors ${
            n <= value
              ? "text-yellow-500"
              : "text-muted-foreground/30"
          } ${readOnly ? "cursor-default" : "cursor-pointer hover:text-yellow-400"}`}
          onClick={() => !readOnly && onChange(n === value ? 0 : n)}
        >
          &#9733;
        </button>
      ))}
    </div>
  );
}
