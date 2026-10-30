import { validatePinyinOverride } from "./pinyin-validation";
import { applyHuanReadings, applyPinyinPhrases } from "./pinyin-lexicon";
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
  const supplied = override?.trim();
  if (supplied) validatePinyinOverride(text, supplied);
  const readings = new Map<number, string>();
  const hanPositions: number[] = [];
  let cursor = 0;
  const all = pinyin(text, {
    type: "all",
    toneType: "symbol",
    toneSandhi: { yi: true, bu: true, thirdTone: false },
    traditional: true,
  });
  for (const item of all) {
    for (const char of Array.from(item.origin)) {
      if (hasChinese(char)) {
        readings.set(cursor, item.isZh ? item.pinyin : "");
        hanPositions.push(cursor);
      }
      cursor += char.length;
    }
  }
  applyHuanReadings(text, readings);
  applyPinyinPhrases(text, readings);
  // A user correction has the final say over every automatic rule.
  if (supplied) {
    const syllables = supplied.split(/\s+/);
    hanPositions.forEach((position, index) => {
      const value = syllables[index];
      if (value)
        readings.set(position, value.toLowerCase().replace(/v/g, "ü"));
    });
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
      } else if (/^\p{Sc}$/u.test(part.segment)) {
        // A currency sign belongs to the number after it, not the word before.
        pending = {
          text: (pending?.text ?? "") + part.segment,
          index: pending?.index ?? start,
        };
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
