export const MIN_WPM = 100;
export const MAX_WPM = 1000;
export type FilterMode = "conservative" | "balanced" | "aggressive";
export type BlockType =
  | "paragraph"
  | "heading"
  | "caption"
  | "table"
  | "margin";
export interface Block {
  id: string;
  sourceId: string;
  file: string;
  page?: number;
  bbox?: [number, number, number, number];
  original: string;
  cleaned: string;
  type: BlockType;
  order: number;
  confidence: number;
  included: boolean;
  reason?: string;
  override?: boolean;
  tableReadable?: boolean;
  pinyinOverride?: string;
}
export interface Token {
  id: number;
  text: string;
  anchorIndex: number;
  paragraphId: string;
  sentenceId: number;
  sourceBlockId: string;
  multiplier: number;
  paragraphEnd: boolean;
  pinyin?: string[];
}
export interface ReadingDocument {
  id: string;
  title: string;
  format: string;
  blocks: Block[];
  tokens: Token[];
  position: number;
  created: number;
  opened: number;
  mode: FilterMode;
  sources: { id: string; name: string; blob: Blob }[];
  warnings: string[];
}
export interface Preferences {
  wpm: number;
  adaptive: boolean;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  spacing: number;
  textColor: string;
  anchorColor: string;
  glow: boolean;
  glowIntensity: number;
  guides: boolean;
  anchorOffset: number;
  pauseHidden: boolean;
  numericLocale: string;
  showPinyin: boolean;
  ocrLanguage: string;
}
export const defaults: Preferences = {
  wpm: 250,
  adaptive: true,
  fontSize: 64,
  fontFamily: "sans-serif",
  fontWeight: 500,
  spacing: 0,
  textColor: "#edeef1",
  anchorColor: "",
  glow: true,
  glowIntensity: 0.12,
  guides: true,
  anchorOffset: 0,
  pauseHidden: true,
  numericLocale: "en-GB",
  showPinyin: true,
  ocrLanguage: "eng",
};
export const presets = [
  {
    name: "Relaxed",
    wpm: 150,
    color: "#86afff",
    description: "Comfortable reading",
  },
  {
    name: "Focused",
    wpm: 250,
    color: "#75d8e4",
    description: "Balanced comprehension",
  },
  {
    name: "Swift",
    wpm: 350,
    color: "#94d8a4",
    description: "Quick and controlled",
  },
  { name: "Rapid", wpm: 500, color: "#e3d080", description: "Fast scanning" },
  {
    name: "Extreme",
    wpm: 750,
    color: "#f2a66d",
    description: "Very high speed",
  },
  {
    name: "Hyper",
    wpm: 1000,
    color: "#ee868d",
    description: "Maximum intensity",
  },
];
export function speedColor(wpm: number) {
  if (wpm <= 150) return presets[0].color;
  for (let i = 1; i < presets.length; i++) {
    if (wpm <= presets[i].wpm) {
      const a = presets[i - 1],
        b = presets[i],
        t = (wpm - a.wpm) / (b.wpm - a.wpm);
      const rgb = [1, 3, 5].map((n) =>
        Math.round(
          parseInt(a.color.slice(n, n + 2), 16) * (1 - t) +
            parseInt(b.color.slice(n, n + 2), 16) * t,
        ),
      );
      return `rgb(${rgb.join(",")})`;
    }
  }
  return presets[5].color;
}
