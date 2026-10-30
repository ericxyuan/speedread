import type { Token } from "../types";
export function anchorIndex(text: string, offset = 0) {
  const letters = Array.from(text);
  const first = letters.findIndex((c) => /[\p{L}\p{N}]/u.test(c));
  const length = letters.filter((c) => /[\p{L}\p{N}]/u.test(c)).length;
  const n =
    length <= 1 ? 0 : length <= 5 ? 1 : length <= 9 ? 2 : length <= 13 ? 3 : 4;
  return Math.max(
    0,
    Math.min(letters.length - 1, Math.max(0, first) + n + offset),
  );
}
export function effectiveWpm(tokens: Token[], wpm: number, adaptive: boolean) {
  return tokens.length
    ? Math.round(
        (wpm * tokens.length) /
          tokens.reduce((s, t) => s + (adaptive ? t.multiplier : 1), 0),
      )
    : wpm;
}
