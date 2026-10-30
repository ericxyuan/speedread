import { useEffect, useRef, useState } from "react";
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
      100,
      Math.min(
        2000,
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
      min="100"
      max="2000"
      step="10"
      value={draft}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        const value = Number(e.target.value);
        if (value >= 100 && value <= 2000 && value % 10 === 0) onChange(value);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}
