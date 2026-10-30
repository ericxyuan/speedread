import { validatePinyinOverride } from "./pinyin-validation";
import { pinyin, addTraditionalDict } from "pinyin-pro";
import TraditionalDict from "@pinyin-pro/data/traditional";
addTraditionalDict(TraditionalDict);
export const hasChinese = (text: string) => /\p{Script=Han}/u.test(text);
export interface ReadingPart {
  text: string;
  pinyin?: string[];
}
/** Pronounce the whole block first. A character in 银行 must retain háng even
 * when the displayed word changes; per-character dictionary calls lose context. */
export function chineseReadings(text: string, override?: string) {
  if (override) validatePinyinOverride(text, override);
  const readings = new Map<number, string>();
  let cursor = 0;
  let han = 0;
  const supplied = override?.trim().split(/\s+/);
  const all = pinyin(text, {
    type: "all",
    toneType: "symbol",
    toneSandhi: { yi: true, bu: true, thirdTone: false },
    traditional: true,
  });
  for (const item of all) {
    for (const char of Array.from(item.origin)) {
      if (hasChinese(char)) {
        readings.set(cursor, supplied?.[han] ?? (item.isZh ? item.pinyin : ""));
        han++;
      }
      cursor += char.length;
    }
  }
  return readings;
}
let segmenter: Intl.Segmenter | undefined;
export function readingParts(
  text: string,
  readings: Map<number, string>,
  base = 0,
): ReadingPart[] {
  const result: ReadingPart[] = [];
  for (const match of text.matchAll(/\S+/gu)) {
    const chunk = match[0],
      offset = base + match.index!;
    if (!hasChinese(chunk)) {
      result.push({ text: chunk });
      continue;
    }
    const segments = (segmenter ??= new Intl.Segmenter("zh", {
      granularity: "word",
    })).segment(chunk);
    let pending: { text: string; index: number } | undefined;
    for (const part of segments) {
      const start = offset + part.index;
      if (part.isWordLike) {
        const prefix = pending?.text ?? "";
        const position = pending?.index ?? start;
        const value = prefix + part.segment;
        let at = position;
        const marks = Array.from(value).map((c) => {
          const mark = readings.get(at) ?? "";
          at += c.length;
          return mark;
        });
        result.push({
          text: value,
          pinyin: hasChinese(value) ? marks : undefined,
        });
        pending = undefined;
      } else if (/^[（(\[【《〈「『“‘]+$/u.test(part.segment)) {
        pending = {
          text: (pending?.text ?? "") + part.segment,
          index: pending?.index ?? start,
        };
      } else if (result.length) {
        const last = result[result.length - 1];
        last.text += part.segment;
        if (last.pinyin)
          last.pinyin.push(...Array.from(part.segment).map(() => ""));
      } else pending = { text: part.segment, index: start };
    }
    if (pending) {
      if (result.length) {
        result[result.length - 1].text += pending.text;
        result[result.length - 1].pinyin?.push(
          ...Array.from(pending.text).map(() => ""),
        );
      } else result.push({ text: pending.text });
    }
  }
  return result;
}
