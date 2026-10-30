import { extractPdfTables } from "../lib/pdf-tables";
import { imageRegions } from "../lib/pdf-images";
import { validateOfficeContainer } from "../lib/resource-budget";
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  anchorIndex,
  formatNumeric,
  tokenize,
  effectiveWpm,
} from "../lib/tokenisation";
import { filterBlocks, cleanup } from "../lib/filtering";
import { reconstruct } from "../lib/layout";
import { PlaybackEngine } from "../lib/timing";
import { extractLegacyDoc } from "../lib/legacy-doc";
import type { Block, Token } from "../types";
import * as CFB from "cfb";
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
describe("tokenisation", () => {
  it.each([
    ["a", 0],
    ["word", 1],
    ["reading", 2],
    ["recognition", 3],
    ["extraordinarily", 4],
    ["“reading", 3],
    ["éclair", 2],
  ])("anchors %s at %i", (s, n) => expect(anchorIndex(s)).toBe(n));
  it("keeps Unicode, apostrophes and hyphens", () =>
    expect(
      tokenize([block("L’été isn't a state-of-the-art café.")]).map(
        (t) => t.text,
      ),
    ).toEqual(["L’été", "isn't", "a", "state-of-the-art", "café."]));
  it.each([
    ["1,234,567", "1 234 567"],
    ["£1,250.50", "£1 250.50"],
    ["3.14159", "3.14159"],
    ["1,25", "1,25"],
    ["3.5%", "3.5%"],
    ["2026-10-30", "2026-10-30"],
    ["1.2.3", "1.2.3"],
    ["192.168.1.1", "192.168.1.1"],
  ])("formats %s without changing value", (input, output) =>
    expect(formatNumeric(input)).toBe(output),
  );
  it("groups numbers with units and scientific notation", () =>
    expect(
      tokenize([
        block("12,500 km costs £1,250.50 at 3.5% with 1.2 × 10⁶ particles."),
      ]).map((t) => t.text),
    ).toEqual([
      "12 500 km",
      "costs",
      "£1 250.50",
      "at",
      "3.5%",
      "with",
      "1.2 × 10⁶",
      "particles.",
    ]));
  it("has deterministic sentence boundaries and preserves abbreviations", () => {
    const t = tokenize([block("Dr. Smith reads. Then pauses!")]);
    expect(t.map((x) => x.sentenceId)).toEqual([0, 0, 0, 1, 1]);
  });
  it("caps adaptive delays rather than multiplying them", () => {
    const t = tokenize([block("Extraordinarilylongnumericalword.")]);
    expect(t[0].multiplier).toBe(1.7);
    expect(effectiveWpm(t, 250, false)).toBe(250);
    expect(effectiveWpm(t, 250, true)).toBe(147);
  });
  it("keeps combined source order and IDs", () => {
    const t = tokenize([
      block("Second", { id: "two" }),
      block("First", { id: "one" }),
    ]);
    expect(t.map((x) => x.text)).toEqual(["Second", "First"]);
    expect(t[1].sourceBlockId).toBe("one");
  });
});
describe("reversible filtering", () => {
  it("removes page furniture only with margin evidence", () => {
    const b = filterBlocks(
      [block("12", { type: "margin" }), block("12", { id: "body" })],
      "balanced",
    );
    expect(b.map((x) => x.included)).toEqual([false, true]);
  });
  it("removes repeated headers across different pages", () => {
    const b = filterBlocks(
      [
        block("Running title", { page: 1, type: "margin" }),
        block("Running title", { page: 2, type: "margin" }),
      ],
      "balanced",
    );
    expect(b.every((x) => !x.included)).toBe(true);
  });
  it("retains meaningful figure references but filters standalone captions", () => {
    const b = filterBlocks(
      [
        block("Figure 3: Annual rainfall"),
        block("Figure 3 demonstrates that rainfall increased significantly.", {
          id: "body",
        }),
      ],
      "balanced",
    );
    expect(b.map((x) => x.included)).toEqual([false, true]);
  });
  it("conservative mode keeps captions", () =>
    expect(
      filterBlocks([block("Figure 3: Annual rainfall")], "conservative")[0]
        .included,
    ).toBe(true));
  it("does not discard originals and restores excluded blocks", () => {
    const original = block("Figure 3: Annual rainfall");
    const b = filterBlocks([original], "balanced")[0];
    expect(b.original).toBe(original.original);
    expect(
      filterBlocks([{ ...b, override: true }], "balanced")[0].included,
    ).toBe(true);
  });
  it("keeps explicit user exclusions across modes", () =>
    expect(
      filterBlocks(
        [block("Important words", { override: false })],
        "conservative",
      )[0].included,
    ).toBe(false));
  it("does not mistake repeated prose for duplicated OCR", () => {
    expect(
      filterBlocks(
        [
          block("This is a meaningful repeated sentence."),
          block("This is a meaningful repeated sentence."),
        ],
        "balanced",
      ).every((b) => b.included),
    ).toBe(true);
  });
  it("cleans hyphenated line wraps without rewriting content", () =>
    expect(
      cleanup("An extraor-\ndinary  claim.\n\nKeep all qualifications."),
    ).toBe("An extraordinary claim.\n\nKeep all qualifications."));
});
describe("layout geometry", () => {
  const item = (str: string, x: number, y: number, width = 100) => ({
    str,
    transform: [12, 0, 0, 12, x, y],
    width,
    height: 12,
  });
  it("reconstructs row order rather than raw object order", () =>
    expect(
      reconstruct(
        [
          item("world", 80, 700, 30),
          item("Next", 30, 680),
          item("Hello", 30, 700, 40),
        ],
        600,
      ).map((x) => x.text),
    ).toEqual(["Hello world", "Next"]));
  it("reads down columns with a spanning heading", () => {
    const input = [
      item("L2", 40, 670),
      item("R1", 340, 700),
      item("L1", 40, 700),
      item("R3", 340, 640),
      item("L3", 40, 640),
      item("R2", 340, 670),
      item("Title", 40, 750, 450),
    ];
    expect(reconstruct(input, 600).map((x) => x.text)).toEqual([
      "Title",
      "L1",
      "L2",
      "L3",
      "R1",
      "R2",
      "R3",
    ]);
  });
});
describe("monotonic playback scheduler", () => {
  afterEach(() => vi.useRealTimers());
  const tokens = () =>
    Array.from({ length: 500 }, (_, i) => ({
      id: i,
      text: `word${i}`,
      anchorIndex: 2,
      paragraphId: "b",
      sourceBlockId: "b",
      sentenceId: Math.floor(i / 5),
      multiplier: 1,
      paragraphEnd: false,
    })) as Token[];
  const setup = () => {
    vi.useFakeTimers({ toFake: ["performance", "setTimeout", "clearTimeout"] });
    const e = new PlaybackEngine(tokens());
    e.configure(250, false);
    return e;
  };
  it.each([
    [250, 240],
    [500, 120],
    [1000, 60],
  ])("respects %i WPM", (wpm, ms) => {
    const e = setup();
    e.configure(wpm, false);
    e.play();
    vi.advanceTimersByTime(ms - 1);
    expect(e.snapshot().index).toBe(0);
    vi.advanceTimersByTime(1);
    expect(e.snapshot().index).toBe(1);
    e.destroy();
  });
  it("pauses and resumes the remaining token time", () => {
    const e = setup();
    e.play();
    vi.advanceTimersByTime(100);
    e.pause();
    vi.advanceTimersByTime(1000);
    expect(e.snapshot().index).toBe(0);
    e.play();
    vi.advanceTimersByTime(139);
    expect(e.snapshot().index).toBe(0);
    vi.advanceTimersByTime(1);
    expect(e.snapshot().index).toBe(1);
    e.destroy();
  });
  it("changes speed during a token proportionally", () => {
    const e = setup();
    e.play();
    vi.advanceTimersByTime(120);
    e.configure(500, false);
    vi.advanceTimersByTime(60);
    expect(e.snapshot().index).toBe(1);
    e.destroy();
  });
  it("visits every token once without accumulating drift", () => {
    const e = setup();
    const seen: number[] = [];
    e.subscribe(() => {
      if (e.snapshot().playing) seen.push(e.snapshot().index);
    });
    e.play();
    vi.advanceTimersByTime(240 * 300);
    expect(e.snapshot().index).toBe(300);
    expect(seen).toEqual(Array.from({ length: 301 }, (_, i) => i));
    e.destroy();
  });
  it("seeks words and sentences deterministically", () => {
    const e = setup();
    e.seek(8);
    e.sentence(-1);
    expect(e.snapshot().index).toBe(5);
    e.sentence(1);
    expect(e.snapshot().index).toBe(10);
    e.seek(-100);
    expect(e.snapshot().index).toBe(0);
    e.destroy();
  });
  it("completes only after displaying the final token", () => {
    vi.useFakeTimers({ toFake: ["performance", "setTimeout", "clearTimeout"] });
    const e = new PlaybackEngine(tokens().slice(0, 2));
    e.configure(250, false);
    e.play();
    vi.advanceTimersByTime(240);
    expect(e.snapshot().index).toBe(1);
    expect(e.snapshot().ended).toBe(false);
    vi.advanceTimersByTime(240);
    expect(e.snapshot().ended).toBe(true);
    expect(e.snapshot().playing).toBe(false);
    e.destroy();
  });
});
describe("legacy Word piece table", () => {
  it("extracts Word 97 main text from a real OLE container", () => {
    const text = "A legacy Word sentence.\r";
    const bytes = new Uint8Array(1024);
    const v = new DataView(bytes.buffer);
    v.setUint16(0, 0xa5ec, true);
    v.setUint32(0x4c, text.length, true);
    v.setUint32(0x1a2, 0, true);
    v.setUint32(0x1a6, 21, true);
    bytes.set(new TextEncoder().encode(text), 512);
    const table = new Uint8Array(21);
    const t = new DataView(table.buffer);
    table[0] = 2;
    t.setUint32(1, 16, true);
    t.setUint32(5, 0, true);
    t.setUint32(9, text.length, true);
    t.setUint32(15, 0x40000000 + 1024, true);
    const c = CFB.utils.cfb_new();
    CFB.utils.cfb_add(c, "WordDocument", bytes);
    CFB.utils.cfb_add(c, "0Table", table);
    const output = CFB.write(c, { type: "array" });
    expect(extractLegacyDoc(new Uint8Array(output).buffer)).toContain(
      "A legacy Word sentence.",
    );
  });
});

describe("numerical locale and resource limits", () => {
  it("preserves decimal commas explicitly", () =>
    expect(formatNumeric("1,234", "de-DE")).toBe("1,234"));
  it("keeps existing space-grouped large numbers as one token", () =>
    expect(tokenize([block("1 234 567 people")])[0].text).toBe("1 234 567"));
  it("continues paragraphs across source pages without an artificial pause", () => {
    const t = tokenize([
      block("A sentence continues", { page: 1 }),
      block("on the next page.", { id: "next", page: 2 }),
    ]);
    expect(t[2].paragraphEnd).toBe(false);
    expect(t[3].sentenceId).toBe(t[2].sentenceId);
  });
  it("rejects malformed Office archives before decompression", () =>
    expect(() => validateOfficeContainer(new Uint8Array(100).buffer)).toThrow(
      "ZIP container",
    ));
  it("finds image bounds through nested PDF transforms", () => {
    const codes = {
      save: 1,
      restore: 2,
      transform: 3,
      paintImageXObject: 4,
      paintInlineImageXObject: 5,
    };
    expect(
      imageRegions(
        {
          fnArray: [1, 3, 4, 2],
          argsArray: [[], [550, 0, 0, 250, 25, 350], ["img"], []],
        },
        codes,
      ),
    ).toEqual([{ x: 25, y: 350, width: 550, height: 250 }]);
  });
});

describe("PDF table structure", () => {
  it("turns aligned header cells into faithful labelled values", () => {
    const c = (str: string, x: number, y: number) => ({
      str,
      transform: [12, 0, 0, 12, x, y],
      width: 80,
      height: 12,
    });
    const input = [
      c("Country", 40, 700),
      c("Population", 220, 700),
      c("France", 40, 675),
      c("68 million", 220, 675),
      c("Germany", 40, 650),
      c("84 million", 220, 650),
    ];
    const r = extractPdfTables(input);
    expect(r.items).toHaveLength(0);
    expect(r.tables[0].cleaned).toBe(
      "France — Population: 68 million.\nGermany — Population: 84 million.",
    );
    expect(r.tables[0].original).toContain("Country | Population");
  });
});
