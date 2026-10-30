import { chineseReadings, readingParts, hasChinese } from "./chinese";
import { anchorIndex } from "./reading-metrics";
export { anchorIndex, effectiveWpm } from "./reading-metrics";
import type { Block, Token } from "../types";
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
    !/^[\p{Sc}−+\-]?(?:\d{1,3}(?:,\d{3})+)(?:\.\d+)?(?:[%‰][.,;:!?。，；：！？]?|[.,;:!?。，；：！？])?$/u.test(
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
    const readingText = block.cleaned.replace(
      /(\p{Script=Han})[^\S\n]*\n(?![^\S\n]*\n)[^\S\n]*(?=\p{Script=Han})/gu,
      "$1",
    );
    const readings = hasChinese(readingText)
      ? chineseReadings(readingText, block.pinyinOverride)
      : new Map<number, string>();
    const paragraphs = readingText.split(/\n\s*\n/);
    let paragraphCursor = 0;
    for (let p = 0; p < paragraphs.length; p++) {
      const paragraphStart = readingText.indexOf(
        paragraphs[p],
        paragraphCursor,
      );
      paragraphCursor = paragraphStart + paragraphs[p].length;
      const detailed = readingParts(paragraphs[p], readings, paragraphStart);
      const parts = detailed.map((part) => part.text);
      for (let i = 0; i < parts.length; i++) {
        const originalPart = i;
        let raw = parts[i];
        // A currency sign separated from its number still belongs to it.
        if (
          /^\p{Sc}$/u.test(raw) &&
          /^[\p{Sc}−+\-]?\d/u.test(parts[i + 1] ?? "")
        )
          raw += parts[++i];
        if (/^[\p{Sc}−+\-]?\d/u.test(raw)) {
          // Rejoin decimal and thousands fragments from the word segmenter.
          while (
            /^[.,]$/u.test(parts[i + 1] ?? "") &&
            /^\d+$/u.test(parts[i + 2] ?? "")
          )
            raw += parts[++i] + parts[++i];
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
          if (/^[%‰]$/u.test(parts[i + 1] ?? "")) raw += parts[++i];
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
          !/[.!?:;。！？；：”"’']$/.test(raw);
        const end =
          i === parts.length - 1 && !(p === paragraphs.length - 1 && continues);
        const isSentence =
          /[.!?。！？][”’"')\]）》」』]*$/.test(text) &&
          !/(?:\b(?:Mr|Mrs|Ms|Dr|Prof|St|vs|etc|e\.g|i\.e)|\b[A-Z])\.$/.test(
            text,
          );
        const n = Array.from(text).length;
        const multiplier = Math.min(
          1.7,
          Math.max(
            end ? 1.7 : 1,
            isSentence ? 1.5 : 1,
            /[;:；：]$/.test(text) ? 1.3 : /[,，、]$/.test(text) ? 1.15 : 1,
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
          pinyin: detailed[originalPart].pinyin,
        });
        if (isSentence || end) sentence++;
      }
    }
  }
  return tokens;
}
