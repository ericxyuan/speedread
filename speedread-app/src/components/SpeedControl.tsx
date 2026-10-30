import { SpeedInput } from "./SpeedInput";
import { Minus, Plus } from "lucide-react";
import { presets } from "../types";
export function SpeedControl({
  wpm,
  onChange,
  compact = false,
}: {
  wpm: number;
  onChange: (n: number) => void;
  compact?: boolean;
}) {
  const set = (n: number) =>
    onChange(Math.max(100, Math.min(2000, Math.round(n / 10) * 10)));
  return (
    <div className={`speed-control ${compact ? "compact" : ""}`}>
      <div className="speed-heading">
        <span>Reading pace</span>
        <div className="number-control">
          <button aria-label="Decrease speed" onClick={() => set(wpm - 10)}>
            <Minus size={14} />
          </button>
          <SpeedInput label="Words per minute" wpm={wpm} onChange={set} />
          <span>WPM</span>
          <button aria-label="Increase speed" onClick={() => set(wpm + 10)}>
            <Plus size={14} />
          </button>
        </div>
      </div>
      <input
        className="range"
        aria-label="Reading speed"
        type="range"
        min="100"
        max="2000"
        step="10"
        value={wpm}
        onChange={(e) => set(Number(e.target.value))}
      />
      <div className="presets">
        {presets.map((p) => (
          <button
            key={p.name}
            title={p.description}
            className={wpm === p.wpm ? "selected" : ""}
            style={{ "--preset": p.color } as React.CSSProperties}
            onClick={() => set(p.wpm)}
          >
            <i />
            {p.name}
            {!compact && <small>{p.wpm}</small>}
          </button>
        ))}
      </div>
      {wpm >= 750 && (
        <p className="subtle warning">
          Scanning pace · higher speeds may reduce comprehension.
        </p>
      )}
    </div>
  );
}
