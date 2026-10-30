import type { Block, Token } from "../types";
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
const unit =
  /^(?:km|cm|mm|m|kg|mg|g|ml|mL|L|s|ms|Hz|kHz|MHz|GHz|W|kW|V|mV|°C|°F|K|Pa|kPa|MPa|N|J|kJ|MB|GB|TB|million|billion|trillion)(?:[.,;:!?])?$/;
const decimalCommaCache = new Map<string, boolean>();
export function formatNumeric(text: string, locale = "en-GB") {
  if (!decimalCommaCache.has(locale))
    decimalCommaCache.set(
      locale,
      new Intl.NumberFormat(locale)
        .formatToParts(1.1)
        .find((p) => p.type === "decimal")?.value === ",",
    );
  if (decimalCommaCache.get(locale)) return text;
  // Only comma groups with exactly three digits, in an otherwise numerical token.
  if (
    !/^[\p{Sc}−+\-]?(?:\d{1,3}(?:,\d{3})+)(?:\.\d+)?(?:%|[.,;:!?])?$/u.test(
      text,
    )
  )
    return text;
  return text.replace(/,(?=\d{3}(?:\D|$))/g, "\u00a0");
}
export function tokenize(blocks: Block[], locale = "en-GB"): Token[] {
  let sentence = 0;
  const tokens: Token[] = [];
  const included = blocks.filter((b) => b.included);
  for (let bi = 0; bi < included.length; bi++) {
    const block = included[bi];
    const following = included[bi + 1];
    const paragraphs = block.cleaned.split(/\n\s*\n/);
    for (let p = 0; p < paragraphs.length; p++) {
      const parts = paragraphs[p].match(/\S+/gu) ?? [];
      for (let i = 0; i < parts.length; i++) {
        let raw = parts[i];
        if (/^[\p{Sc}−+\-]?\d/u.test(raw)) {
          while (
            /^\d{1,3}(?:\u00a0\d{3})*$/.test(
              raw.replace(/^[\p{Sc}−+\-]/u, ""),
            ) &&
            /^\d{3}(?:\.\d+)?$/.test(parts[i + 1] ?? "")
          ) {
            raw += "\u00a0" + parts[++i];
          }
          if (
            /^[\p{Sc}−+\-]?\d[\d.,\u00a0]*(?:[eE][+\-]?\d+)?$/u.test(raw) &&
            unit.test(parts[i + 1] ?? "")
          )
            raw += "\u00a0" + parts[++i];
          if (
            (parts[i + 1] === "×" || parts[i + 1] === "x") &&
            /^10(?:[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+|\^[−+\-]?\d+)$/.test(parts[i + 2] ?? "")
          ) {
            raw += "\u00a0" + parts[++i] + "\u00a0" + parts[++i];
          }
        }
        const text = raw
          .split("\u00a0")
          .map((part) => formatNumeric(part, locale))
          .join("\u00a0");
        const continues =
          following?.included &&
          following.sourceId === block.sourceId &&
          following.page !== block.page &&
          following.type === "paragraph" &&
          block.type === "paragraph" &&
          !/[.!?:;”"’']$/.test(raw);
        const end =
          i === parts.length - 1 && !(p === paragraphs.length - 1 && continues);
        const isSentence =
          /[.!?][”’"')\]]*$/.test(text) &&
          !/(?:\b(?:Mr|Mrs|Ms|Dr|Prof|St|vs|etc|e\.g|i\.e)|\b[A-Z])\.$/.test(
            text,
          );
        const n = Array.from(text).length;
        const multiplier = Math.min(
          1.7,
          Math.max(
            end ? 1.7 : 1,
            isSentence ? 1.5 : 1,
            /[;:]$/.test(text) ? 1.3 : /,$/.test(text) ? 1.15 : 1,
            n > 16 ? 1.4 : n > 9 ? 1.2 : 1,
          ),
        );
        tokens.push({
          id: tokens.length,
          text,
          anchorIndex: anchorIndex(text),
          paragraphId: `${block.id}-${p}`,
          sentenceId: sentence,
          sourceBlockId: block.id,
          multiplier,
          paragraphEnd: end,
        });
        if (isSentence || end) sentence++;
      }
    }
  }
  return tokens;
}
export function effectiveWpm(tokens: Token[], wpm: number, adaptive: boolean) {
  return tokens.length
    ? Math.round(
        (wpm * tokens.length) /
          tokens.reduce((s, t) => s + (adaptive ? t.multiplier : 1), 0),
      )
    : wpm;
}
