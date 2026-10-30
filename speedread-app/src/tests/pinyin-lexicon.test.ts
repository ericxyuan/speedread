import { describe, expect, it } from "vitest";
import { chineseReadings } from "../lib/chinese";
import { PINYIN_PHRASES } from "../lib/pinyin-lexicon";
import {
  isPinyinSyllable,
  validatePinyinOverride,
} from "../lib/pinyin-validation";
import { formatNumeric, tokenize } from "../lib/tokenisation";
import type { Block } from "../types";

const block = (text: string, extra: Partial<Block> = {}): Block => ({
  id: "b",
  sourceId: "s",
  file: "test",
  original: text,
  cleaned: text,
  type: "paragraph",
  order: 0,
  confidence: 1,
  included: true,
  ...extra,
});
const readings = (text: string) => [...chineseReadings(text).values()];

describe("curated pinyin", () => {
  it.each(Object.entries(PINYIN_PHRASES) as [string, string][])(
    "reads %s with phrase context",
    (phrase, expected) => {
      expect(readings(phrase)).toEqual(expected.split(" "));
    },
  );

  it("keeps one syllable per Han character in the lexicon", () => {
    for (const [phrase, value] of Object.entries(PINYIN_PHRASES)) {
      const han = Array.from(phrase).filter((char) =>
        /\p{Script=Han}/u.test(char),
      );
      expect(value.split(" ")).toHaveLength(han.length);
      expect(Array.from(phrase).every((char) => /\p{Script=Han}/u.test(char))).toBe(
        true,
      );
    }
  });

  it.each([
    ["天氣還冷", ["tiān", "qì", "hái", "lěng"]],
    ["他還沒來", ["tā", "hái", "méi", "lái"]],
    ["他還不知道", ["tā", "hái", "bù", "zhī", "dào"]],
    ["還是", ["hái", "shì"]],
    ["還得", ["hái", "děi"]],
    ["還錢", ["huán", "qián"]],
    ["歸還", ["guī", "huán"]],
    ["以牙還牙", ["yǐ", "yá", "huán", "yá"]],
    ["還以顏色", ["huán", "yǐ", "yán", "sè"]],
    ["他還是走了", ["tā", "hái", "shì", "zǒu", "le"]],
  ])("resolves 還 in %s", (text, expected) => {
    expect(readings(text)).toEqual(expected);
  });

  it("lets a user correction win over the lexicon and context rules", () => {
    expect(readings("還是")).toEqual(["hái", "shì"]);
    expect([...chineseReadings("還是", "huán shì").values()]).toEqual([
      "huán",
      "shì",
    ]);
  });

  it("normalises typed v and uppercase corrections for display", () => {
    expect([...chineseReadings("呂", "LV").values()]).toEqual(["lü"]);
    expect([...chineseReadings("可以", "KĚ YǏ").values()]).toEqual([
      "kě",
      "yǐ",
    ]);
  });

  it("treats a whitespace-only correction as automatic", () => {
    expect([...chineseReadings("還是", "   ").values()]).toEqual([
      "hái",
      "shì",
    ]);
  });

  it("keeps readings aligned through punctuation and mixed text", () => {
    expect(readings("他說：「還是走吧！」")).toEqual([
      "tā",
      "shuō",
      "hái",
      "shì",
      "zǒu",
      "ba",
    ]);
    expect(readings("Hello 可以 12,500 km。")).toEqual(["kě", "yǐ"]);
  });

  it("does not break words around punctuation or opening quotes", () => {
    const tokens = tokenize([block("「可以」，可以。")]);
    expect(tokens.map((token) => token.text)).toEqual([
      "「可以」，",
      "可以。",
    ]);
    expect(tokens[0].pinyin).toEqual(["", "kě", "yǐ", "", ""]);
    expect(tokens[1].pinyin).toEqual(["kě", "yǐ", ""]);
    for (const token of tokens)
      if (token.pinyin)
        expect(token.pinyin).toHaveLength(Array.from(token.text).length);
  });

  it("keeps long Chinese words together and aligned", () => {
    const tokens = tokenize([
      block("人工智能和高速公路，银行行长。"),
    ]);
    expect(tokens.map((token) => token.text)).toEqual([
      "人工",
      "智能",
      "和",
      "高速公路，",
      "银行",
      "行长。",
    ]);
    for (const token of tokens) {
      if (token.pinyin) {
        expect(token.pinyin).toHaveLength(Array.from(token.text).length);
        expect(token.pinyin.filter(Boolean)).toHaveLength(
          Array.from(token.text).filter((char) =>
            /\p{Script=Han}/u.test(char),
          ).length,
        );
      }
    }
  });

  it("passes every automatic reading through the validator", () => {
    for (const [phrase] of Object.entries(PINYIN_PHRASES)) {
      expect(() =>
        validatePinyinOverride(phrase, readings(phrase).join(" ")),
      ).not.toThrow();
    }
    for (const text of [
      "中华人民共和国成立了。",
      "他走在路上，看见一只小猫。",
      "我们一起去图书馆借书。",
      "這件事需要仔細處理。",
    ])
      expect(() =>
        validatePinyinOverride(text, readings(text).join(" ")),
      ).not.toThrow();
  });
});

describe("pinyin override validation", () => {
  it.each([
    "kě",
    "yǐ",
    "shí",
    "hou",
    "nǚ",
    "lüè",
    "lve",
    "jue",
    "ju",
    "nv",
    "de",
    "shì",
    "ér",
    "yī",
    "wǔ",
    "huì",
    "liú",
    "xiǎo",
    "zhuāng",
    "qióng",
    "lǜ",
  ])("accepts the real syllable %s", (syllable) => {
    expect(isPinyinSyllable(syllable)).toBe(true);
  });

  it.each(["hello", "abc", "ke3", "haǒ", "kěyǐ", "<b>", "shi!", ""])(
    "rejects the malformed syllable %s",
    (syllable) => {
      expect(isPinyinSyllable(syllable)).toBe(false);
    },
  );

  it("validates the whole correction, not just single syllables", () => {
    expect(() => validatePinyinOverride("可以。", "kě yǐ")).not.toThrow();
    expect(() => validatePinyinOverride("可以。", "kě")).toThrow("2 pinyin");
    expect(() => validatePinyinOverride("可以。", "hello yǐ")).toThrow(
      "tone marks",
    );
    expect(() => validatePinyinOverride("可以。", "haǒ yǐ")).toThrow(
      "tone marks",
    );
    expect(() => validatePinyinOverride("可以。", "ke3 yi3")).toThrow(
      "tone marks",
    );
    expect(() => validatePinyinOverride("可以。", "kě yǐ extra")).toThrow(
      "2 pinyin",
    );
    expect(() => validatePinyinOverride("可以。", "   ")).not.toThrow();
  });
});

describe("Chinese numeric tokens", () => {
  it("keeps currency, percent and grouped numbers complete in Chinese text", () => {
    const tokens = tokenize([
      block("价格£1,250.50元。增长3.5%。共12,500元。"),
    ]);
    expect(tokens.map((token) => token.text)).toEqual([
      "价格",
      "£1\u00a0250.50",
      "元。",
      "增长",
      "3.5%。",
      "共",
      "12\u00a0500",
      "元。",
    ]);
    expect(tokens.some((token) => token.text === "," || token.text === "%"))
      .toBe(false);
    expect(tokens.find((token) => token.text === "价格")?.pinyin).toEqual([
      "jià",
      "gé",
    ]);
  });

  it("joins a spaced currency sign and percent to their number", () => {
    const tokens = tokenize([block("Price £ 1,250.50 and 3.5 %")]);
    expect(tokens.map((token) => token.text)).toEqual([
      "Price",
      "£1\u00a0250.50",
      "and",
      "3.5%",
    ]);
  });

  it("groups a percentage even when punctuation follows it", () => {
    expect(formatNumeric("12,500%。")).toBe("12\u00a0500%。");
    expect(formatNumeric("£1,250.50%。")).toBe("£1\u00a0250.50%。");
  });

  it("does not turn versions, dates or addresses into grouped numbers", () => {
    expect(
      tokenize([
        block("Version 1.2.3, 2026-10-30, 192.168.1.1, 1,25"),
      ]).map((token) => token.text),
    ).toEqual(["Version", "1.2.3,", "2026-10-30,", "192.168.1.1,", "1,25"]);
  });
});

