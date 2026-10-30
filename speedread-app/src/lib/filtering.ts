import type { Block, FilterMode } from "../types";
export function cleanup(text: string) {
  return text
    .normalize("NFC")
    .replace(/\u00ad/g, "")
    .replace(/([\p{L}])-\r?\n([\p{Ll}])/gu, "$1$2")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
export function filterBlocks(input: Block[], mode: FilterMode): Block[] {
  const repeats = new Map<string, Set<number>>();
  for (const b of input) {
    if (b.type === "margin" && b.page) {
      const key = b.original.trim().toLowerCase().replace(/\d+/g, "#");
      const set = repeats.get(`${b.sourceId}:${key}`) ?? new Set<number>();
      set.add(b.page);
      repeats.set(`${b.sourceId}:${key}`, set);
    }
  }
  const seen = new Set<string>();
  return input.map((b) => {
    const cleaned = cleanup(b.cleaned);
    let reason: string | undefined;
    if (
      /^\s*(?:page\s+)?\d+(?:\s*(?:of|\/)\s*\d+)?\s*$/i.test(cleaned) &&
      b.type === "margin"
    )
      reason = "Page number";
    const key = cleaned.toLowerCase().replace(/\d+/g, "#");
    if (
      b.type === "margin" &&
      (repeats.get(`${b.sourceId}:${key}`)?.size ?? 0) > 1
    )
      reason = "Repeated header or footer";
    if (mode !== "conservative") {
      if (
        b.type === "caption" ||
        /^(?:fig(?:ure)?\.?|chart|diagram|image)\s+\d+[.:\-]\s/i.test(cleaned)
      )
        reason = "Standalone graphic caption";
      if (b.type === "table" && !b.tableReadable)
        reason = "Complex table: review alongside source";
      if (
        /^(?:Time\s*\(s\)|Velocity\s*\(m\/s\)|Series [A-Z]|[XY] axis)$/i.test(
          cleaned,
        )
      )
        reason = "Isolated graph label";
    }
    if (
      mode === "aggressive" &&
      /^(?:copyright|all rights reserved|references$|bibliography$|https?:\/\/\S+$)/i.test(
        cleaned,
      )
    )
      reason = "Peripheral reference or publication detail";
    const duplicateKey = `${b.sourceId}:${b.page}:${cleaned}`;
    if (seen.has(duplicateKey) && cleaned.length > 30 && b.confidence < 0.99)
      reason = "Duplicate OCR block";
    seen.add(duplicateKey);
    if (!cleaned) reason = "Empty block";
    return {
      ...b,
      cleaned,
      included: b.override ?? !reason,
      reason: b.override === true ? "Restored by you" : reason,
    };
  });
}
