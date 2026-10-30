import { describe, expect, it } from "vitest";
import { tokenize } from "../lib/tokenisation";
import { chineseReadings } from "../lib/chinese";
import { validatePinyinOverride } from "../lib/pinyin-validation";
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
describe("Chinese reading", () => {
  it("keeps ordinary words together and punctuation attached", () => {
    const tokens = tokenize([block("我们可以一起阅读中文。")]);
    expect(tokens.map((t) => t.text)).toEqual([
      "我们",
      "可以",
      "一起",
      "阅读",
      "中文。",
    ]);
    expect(tokens.find((t) => t.text === "可以")?.pinyin).toEqual(["kě", "yǐ"]);
  });
  it.each([
    ["银行", ["yín", "háng"]],
    ["行长", ["háng", "zhǎng"]],
    ["重庆", ["chóng", "qìng"]],
    ["音乐", ["yīn", "yuè"]],
    ["快乐", ["kuài", "lè"]],
    ["长大", ["zhǎng", "dà"]],
    ["长江", ["cháng", "jiāng"]],
    ["銀行", ["yín", "háng"]],
  ])("uses phrase context for %s", (text, expected) => {
    expect([...chineseReadings(text as string).values()]).toEqual(expected);
  });
  it("keeps readings aligned with Han characters and punctuation in mixed text", () => {
    const tokens = tokenize([
      block("Hello 我们可以阅读中文。价格 12,500 km。"),
    ]);
    expect(tokens[0].text).toBe("Hello");
    for (const t of tokens) {
      if (t.pinyin) expect(t.pinyin.length).toBe(Array.from(t.text).length);
    }
    expect(tokens.find((t) => t.text === "中文。")?.pinyin).toEqual([
      "zhōng",
      "wén",
      "",
    ]);
    expect(tokens.map((t) => t.text).join(" ")).toContain("12 500");
  });
  it("joins a soft Chinese line break without changing source text", () => {
    const source = block("我们可\n以阅读。\n\n下一段。");
    const tokens = tokenize([source]);
    expect(tokens.some((t) => t.text === "可以")).toBe(true);
    expect(source.original).toContain("可\n以");
    expect(new Set(tokens.map((t) => t.paragraphId)).size).toBe(2);
  });
  it("navigates Chinese sentences", () => {
    const tokens = tokenize([block("可以阅读。继续学习！")]);
    const end = tokens.findIndex((t) => t.text.endsWith("。"));
    expect(tokens[end + 1].sentenceId).toBe(tokens[end].sentenceId + 1);
    expect(tokens[end].multiplier).toBe(1.5);
  });
  it("retains user corrections without changing the text", () => {
    const tokens = tokenize([block("单乐。", { pinyinOverride: "shàn yuè" })]);
    expect(tokens.flatMap((t) => t.pinyin ?? []).filter(Boolean)).toEqual([
      "shàn",
      "yuè",
    ]);
    expect(tokens.map((t) => t.text).join("")).toBe("单乐。");
  });
  it("validates one syllable per character and rejects malformed corrections", () => {
    expect(() => validatePinyinOverride("可以。", "kě yǐ")).not.toThrow();
    expect(() => validatePinyinOverride("可以。", "kě")).toThrow("2 pinyin");
    expect(() => validatePinyinOverride("可以。", "ke3 yi3")).toThrow(
      "tone marks",
    );
    expect(() => validatePinyinOverride("可以。", "<b> yǐ")).toThrow();
    expect(() => validatePinyinOverride("可以。", "")).not.toThrow();
  });
});
