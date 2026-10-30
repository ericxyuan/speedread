import { useEffect, useRef, useState } from "react";
import { MAX_WPM, MIN_WPM } from "../types";
export function SpeedInput({
  wpm,
  onChange,
  label,
}: {
  wpm: number;
  onChange: (n: number) => void;
  label: string;
}) {
  const [draft, setDraft] = useState(String(wpm));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(String(wpm));
  }, [wpm]);
  const commit = () => {
    focused.current = false;
    const value = Number(draft);
    const next = Math.max(
      MIN_WPM,
      Math.min(
        MAX_WPM,
        Math.round((Number.isFinite(value) && value ? value : wpm) / 10) * 10,
      ),
    );
    setDraft(String(next));
    onChange(next);
  };
  return (
    <input
      aria-label={label}
      type="number"
      inputMode="numeric"
      min={MIN_WPM}
      max={MAX_WPM}
      step="10"
      value={draft}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        const value = Number(e.target.value);
        if (value >= MIN_WPM && value <= MAX_WPM && value % 10 === 0)
          onChange(value);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}
