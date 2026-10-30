import type { Preferences } from "../types";
export function Settings({
  prefs,
  setPrefs,
}: {
  prefs: Preferences;
  setPrefs: (p: Preferences) => void;
}) {
  const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
    setPrefs({ ...prefs, [key]: value });
  return (
    <div className="settings-form">
      <label className="switch-row">
        <span>
          Pinyin above Chinese
          <small>One syllable aligned with each character</small>
        </span>
        <input
          type="checkbox"
          checked={prefs.showPinyin}
          onChange={(e) => set("showPinyin", e.target.checked)}
        />
      </label>
      <label>
        OCR language
        <select
          aria-label="OCR language"
          value={prefs.ocrLanguage}
          onChange={(e) => set("ocrLanguage", e.target.value)}
        >
          <option value="eng">English</option>
          <option value="eng+chi_sim">简体中文 + English</option>
          <option value="eng+chi_tra">繁體中文 + English</option>
        </select>
      </label>
      <label className="switch-row">
        <span>
          Adaptive timing
          <small>Extra time for punctuation and complex words</small>
        </span>
        <input
          type="checkbox"
          checked={prefs.adaptive}
          onChange={(e) => set("adaptive", e.target.checked)}
        />
      </label>
      <label className="switch-row">
        <span>Background glow</span>
        <input
          type="checkbox"
          checked={prefs.glow}
          onChange={(e) => set("glow", e.target.checked)}
        />
      </label>
      <label>
        Glow intensity
        <input
          type="range"
          min="0"
          max="0.3"
          step="0.01"
          value={prefs.glowIntensity}
          onChange={(e) => set("glowIntensity", +e.target.value)}
        />
      </label>
      <label className="switch-row">
        <span>Anchor guides</span>
        <input
          type="checkbox"
          checked={prefs.guides}
          onChange={(e) => set("guides", e.target.checked)}
        />
      </label>
      <label>
        Font size <span>{prefs.fontSize} px</span>
        <input
          type="range"
          min="32"
          max="110"
          value={prefs.fontSize}
          onChange={(e) => set("fontSize", +e.target.value)}
        />
      </label>
      <label>
        Font family
        <select
          value={prefs.fontFamily}
          onChange={(e) => set("fontFamily", e.target.value)}
        >
          <option value="sans-serif">System sans</option>
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="monospace">Monospace</option>
        </select>
      </label>
      <label>
        Font weight
        <select
          value={prefs.fontWeight}
          onChange={(e) => set("fontWeight", +e.target.value)}
        >
          <option value="400">Regular</option>
          <option value="500">Medium</option>
          <option value="600">Semibold</option>
        </select>
      </label>
      <label>
        Letter spacing <span>{prefs.spacing}px</span>
        <input
          type="range"
          min="-1"
          max="5"
          step="0.25"
          value={prefs.spacing}
          onChange={(e) => set("spacing", +e.target.value)}
        />
      </label>
      <label>
        Anchor offset <span>{prefs.anchorOffset}</span>
        <input
          type="range"
          min="-2"
          max="2"
          step="1"
          value={prefs.anchorOffset}
          onChange={(e) => set("anchorOffset", +e.target.value)}
        />
      </label>
      <label className="color-row">
        Text colour
        <input
          type="color"
          value={prefs.textColor}
          onChange={(e) => set("textColor", e.target.value)}
        />
      </label>
      <label className="color-row">
        Custom anchor
        <input
          type="color"
          value={prefs.anchorColor || "#75d8e4"}
          onChange={(e) => set("anchorColor", e.target.value)}
        />
        <button onClick={() => set("anchorColor", "")}>Use pace colour</button>
      </label>
      <label className="switch-row">
        <span>Pause when tab is hidden</span>
        <input
          type="checkbox"
          checked={prefs.pauseHidden}
          onChange={(e) => set("pauseHidden", e.target.checked)}
        />
      </label>
      <label>
        Number notation
        <select
          value={prefs.numericLocale}
          onChange={(e) => set("numericLocale", e.target.value)}
        >
          <option value="en-GB">Decimal point (1,250.50)</option>
          <option value="de-DE">Decimal comma (1.250,50)</option>
        </select>
      </label>
      <p className="subtle">
        Reprocess a document after changing number notation. Anchor position and
        timing are configurable visual heuristics. They are not a guarantee of
        comprehension.
      </p>
    </div>
  );
}
