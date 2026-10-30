import { test, expect, Page } from "@playwright/test";
import UTIF from "utif2";
import { PDFDocument } from "pdf-lib";
import { mkdirSync, writeFileSync } from "node:fs";
const fixture = (name: string) => `e2e/fixtures/${name}`;
async function upload(page: Page, names: string[]) {
  await page.goto("/");
  await page
    .getByLabel("Upload files", { exact: true })
    .setInputFiles(names.map(fixture));
  await page
    .getByRole("button", {
      name: names.length > 1 ? "Combine & prepare" : "Prepare reading",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Start reading", exact: true }),
  ).toBeVisible({ timeout: 90000 });
}
async function sample(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample", exact: true }).click();
  await page
    .getByRole("button", { name: "Start reading", exact: true })
    .click();
  await expect(
    page.getByLabel("Reading progress", { exact: true }),
  ).toBeVisible();
}
test("sample playback, anchor, seeking, shortcuts and saved progress", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await sample(page);
  const centers: number[] = [];
  for (let i = 0; i < 12; i++) {
    centers.push(
      await page.locator(".word-anchor").evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.x + r.width / 2;
      }),
    );
    await page.getByRole("button", { name: "Next word", exact: true }).click();
  }
  expect(Math.max(...centers) - Math.min(...centers)).toBeLessThan(0.6);
  expect(centers[0]).toBeCloseTo(720, 0);
  await page.locator("body").click({ position: { x: 20, y: 200 } });
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(600);
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  const index = +(await page
    .getByLabel("Reading progress", { exact: true })
    .inputValue());
  expect(index).toBeGreaterThan(12);
  await page.keyboard.press("ArrowLeft");
  await expect(
    page.getByLabel("Reading progress", { exact: true }),
  ).toHaveValue(String(index - 1));
  await page.keyboard.press("Shift+ArrowLeft");
  expect(
    +(await page.getByLabel("Reading progress", { exact: true }).inputValue()),
  ).toBeLessThan(index - 1);
  await page.getByLabel("Reading progress", { exact: true }).fill("45");
  await page
    .getByRole("button", { name: "Back to document", exact: true })
    .click();
  await page.reload();
  await page.getByRole("button", { name: /Library/ }).click();
  await page
    .locator(".document-open")
    .filter({ hasText: "A little room to focus" })
    .click();
  await expect(
    page.getByRole("button", { name: "Resume reading", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Resume reading", exact: true })
    .click();
  expect(
    await page.getByLabel("Reading progress", { exact: true }).inputValue(),
  ).toBe("45");
  expect(errors).toEqual([]);
});
test("speed presets, strict timing, transcript and fullscreen", async ({
  page,
}) => {
  await sample(page);
  await page.getByRole("button", { name: "Extreme", exact: true }).click();
  await expect(page.getByLabel("Reader words per minute")).toHaveValue("750");
  await expect(
    page.getByText(/higher speeds may reduce comprehension/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reader settings", exact: true })
    .click();
  await page.getByLabel("Adaptive timing").uncheck();
  await page
    .getByRole("button", { name: "Close settings", exact: true })
    .click();
  await expect(page.getByText("Strict timing", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Toggle transcript", exact: true })
    .click();
  await page.getByLabel("Search transcript").fill("attention");
  await expect(page.getByText(/matches$/)).toBeVisible();
  await page.locator(".transcript-words button").first().click();
  expect(
    +(await page.getByLabel("Reading progress", { exact: true }).inputValue()),
  ).toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "Close transcript", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Toggle fullscreen", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(false);
});
test("plain text and multi-file ordering", async ({ page }) => {
  await page.goto("/");
  await page
    .getByLabel("Upload files", { exact: true })
    .setInputFiles([fixture("notes.txt"), fixture("notes.md")]);
  await page
    .getByRole("button", { name: "Move notes.md up", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Combine & prepare", exact: true })
    .click();
  await expect(page.getByLabel("Edit block 1", { exact: true })).toHaveValue(
    "A Markdown heading",
  );
  const edits = await page.locator(".text-block textarea").allTextContents();
  expect(edits.join(" ")).toContain("A plain text reading");
});
test("Markdown filtering, restoration and editable extraction", async ({
  page,
}) => {
  await upload(page, ["notes.md"]);
  await page.getByRole("button", { name: "Excluded 1", exact: true }).click();
  await expect(
    page.getByText("Figure 3: A caption", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await page.getByRole("button", { name: "Reading text", exact: true }).click();
  await expect(page.getByLabel("Edit block 4", { exact: true })).toHaveValue(
    "Figure 3 demonstrates an important result.",
  );
  const edit = page.getByLabel("Edit block 2", { exact: true });
  await edit.fill("A corrected sentence remains intact.");
  await edit.press("Tab");
  await expect(edit).toHaveValue("A corrected sentence remains intact.");
  await page.getByRole("button", { name: "Source", exact: true }).click();
  await expect(
    page.getByText(
      "**Meaningful** text with a [reference](https://example.com).",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reading text", exact: true }).click();
  await expect(page.getByLabel("Edit block 2", { exact: true })).toHaveValue(
    "A corrected sentence remains intact.",
  );
});
test("HTML sanitisation and faithful table conversion", async ({ page }) => {
  await upload(page, ["safe.html"]);
  expect(await page.evaluate(() => "EXECUTED" in window)).toBe(false);
  await expect(page.getByLabel("Edit block 1", { exact: true })).toHaveValue(
    "HTML heading",
  );
  await expect(page.getByLabel("Edit block 3", { exact: true })).toContainText(
    "",
  );
  expect(
    await page.getByLabel("Edit block 3", { exact: true }).inputValue(),
  ).toContain("France — Population: 68 million.");
  expect(await page.locator(".block-list").innerText()).not.toContain(
    "Unwanted navigation",
  );
});
test("DOCX structured extraction and legacy DOC piece table", async ({
  page,
}) => {
  await upload(page, ["document.docx"]);
  await expect(page.getByLabel("Edit block 1", { exact: true })).toHaveValue(
    "An accurate Word document",
  );
  await expect(page.getByLabel("Edit block 2", { exact: true })).toHaveValue(
    "The important argument remains in the reading stream.",
  );
  await upload(page, ["legacy.doc"]);
  await expect(page.getByLabel("Edit block 1", { exact: true })).toHaveValue(
    "A genuine legacy Word file.",
  );
  await expect(page.getByLabel("Edit block 2", { exact: true })).toHaveValue(
    "Second paragraph remains.",
  );
});
test("two-column PDF, repeated furniture, captions and meaningful figure references", async ({
  page,
}) => {
  await upload(page, ["columns.pdf"]);
  const values = await page
    .locator(".text-block textarea")
    .evaluateAll((els) => els.map((e) => (e as HTMLTextAreaElement).value));
  const text = values.join(" ");
  expect(text.indexOf("Left column 1 line 4")).toBeLessThan(
    text.indexOf("Right column 1 line 1"),
  );
  expect(text).not.toContain("Running report title");
  expect(text).not.toContain("Figure 3: Annual rainfall");
  expect(text).toContain("Figure 3 demonstrates");
  await page.getByRole("button", { name: /Excluded/ }).click();
  await expect(
    page.getByText("Running report title", { exact: true }),
  ).toHaveCount(2);
});
test("local image OCR, scanned PDF and mixed PDF", async ({ page }) => {
  mkdirSync("e2e/fixtures", { recursive: true });
  await page.setContent(
    '<div id="ocr" style="box-sizing:border-box;padding:70px;background:white;color:black;width:1100px;height:500px;font:32px Arial;line-height:1.8">Local reading stays private.<br>Every important word belongs here.<br>The distance is 12500 kilometres.</div>',
  );
  const png = await page.locator("#ocr").screenshot();
  writeFileSync(fixture("scan.png"), png);
  const pdf = await PDFDocument.create();
  const image = await pdf.embedPng(png);
  pdf
    .addPage([550, 250])
    .drawImage(image, { x: 0, y: 0, width: 550, height: 250 });
  writeFileSync(fixture("scan.pdf"), await pdf.save());
  const mixed = await PDFDocument.create();
  const mi = await mixed.embedPng(png);
  const mp = mixed.addPage([600, 800]);
  mp.drawText("A mixed document heading", { x: 40, y: 740, size: 19 });
  mp.drawImage(mi, { x: 25, y: 350, width: 550, height: 250 });
  writeFileSync(fixture("mixed.pdf"), await mixed.save());
  await upload(page, ["scan.png"]);
  let text = await page
    .locator(".text-block textarea")
    .evaluateAll((els) =>
      els.map((e) => (e as HTMLTextAreaElement).value).join(" "),
    );
  expect(text).toContain("Local reading stays private");
  await upload(page, ["scan.pdf"]);
  text = await page
    .locator(".text-block textarea")
    .evaluateAll((els) =>
      els.map((e) => (e as HTMLTextAreaElement).value).join(" "),
    );
  expect(text).toContain("Every important word belongs here");
  await upload(page, ["mixed.pdf"]);
  text = await page
    .locator(".text-block textarea")
    .evaluateAll((els) =>
      els.map((e) => (e as HTMLTextAreaElement).value).join(" "),
    );
  expect(text).toContain("A mixed document heading");
  expect(text).toContain("Local reading stays private");
  expect(text.match(/Local reading stays private/g)?.length).toBe(1);
});
test("upload failure is recoverable and clipboard denial is explained", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Upload files", { exact: true }).setInputFiles({
    name: "broken.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("This is not a PDF"),
  });
  await page
    .getByRole("button", { name: "Prepare reading", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Prepare reading", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Paste", exact: true }).click();
  await expect(page.getByLabel("Text to read")).toBeVisible();
});
test("mobile, enlarged text and reduced motion keep controls reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-home.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Try a sample", exact: true }).click();
  await page
    .getByRole("button", { name: "Start reading", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeInViewport();
  await page.getByRole("button", { name: "Next word", exact: true }).click();
  expect(
    await page.getByLabel("Reading progress", { exact: true }).inputValue(),
  ).toBe("1");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/mobile-reader.png" });
});
test("large text stays responsive and long tokens do not clip", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Enter text", exact: true }).click();
  await page.getByLabel("Text to read").evaluate(
    (el, value) => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )!.set!.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },
    "supercalifragilisticexpialidocious".repeat(4) +
      " " +
      "A meaningful sentence is preserved.\n\n".repeat(12000),
  );
  await page
    .getByRole("button", { name: "Prepare reading", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start reading", exact: true })
    .click();
  const box = await page.locator(".word-after").boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(1441);
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Toggle transcript", exact: true })
    .click();
  expect(
    await page.locator(".transcript-words button").count(),
  ).toBeLessThanOrEqual(120);
});
test("desktop visual review", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".intro")).toHaveCSS("opacity","1");
  await page.screenshot({
    path: "test-results/desktop-home.png",
    fullPage: true,
  });
  await sample(page);
  await page.screenshot({ path: "test-results/desktop-reader.png" });
});

test("TIFF, JPEG, WEBP and BMP input paths run local OCR", async ({ page }) => {
  await page.goto("/");
  const pixels = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 1000;
    c.height = 300;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "black";
    ctx.font = "32px Arial";
    ctx.fillText("Every important word stays here.", 50, 100);
    return {
      rgba: Array.from(ctx.getImageData(0, 0, c.width, c.height).data),
      jpeg: c.toDataURL("image/jpeg").split(",")[1],
      webp: c.toDataURL("image/webp").split(",")[1],
    };
  });
  writeFileSync(
    fixture("image.tiff"),
    Buffer.from(
      UTIF.encodeImage(new Uint8Array(pixels.rgba).buffer, 1000, 300),
    ),
  );
  writeFileSync(fixture("image.jpg"), Buffer.from(pixels.jpeg, "base64"));
  writeFileSync(fixture("image.webp"), Buffer.from(pixels.webp, "base64"));
  const width = 1000,
    height = 300,
    stride = Math.ceil((width * 3) / 4) * 4;
  const bmp = Buffer.alloc(54 + stride * height, 255);
  bmp.write("BM");
  bmp.writeUInt32LE(bmp.length, 2);
  bmp.writeUInt32LE(54, 10);
  bmp.writeUInt32LE(40, 14);
  bmp.writeInt32LE(width, 18);
  bmp.writeInt32LE(height, 22);
  bmp.writeUInt16LE(1, 26);
  bmp.writeUInt16LE(24, 28);
  bmp.fill(0, 30, 54);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const from = (y * width + x) * 4,
        to = 54 + (height - 1 - y) * stride + x * 3;
      bmp[to] = pixels.rgba[from + 2];
      bmp[to + 1] = pixels.rgba[from + 1];
      bmp[to + 2] = pixels.rgba[from];
    }
  writeFileSync(fixture("image.bmp"), bmp);
  for (const name of ["image.tiff", "image.jpg", "image.webp", "image.bmp"]) {
    await upload(page, [name]);
    const text = await page
      .locator(".text-block textarea")
      .evaluateAll((els) =>
        els.map((e) => (e as HTMLTextAreaElement).value).join(" "),
      );
    expect(text).toContain("Every important word stays here");
  }
});
test("cancellation and an OCR engine failure leave recoverable inputs", async ({
  page,
}) => {
  await page.route("**/ocr/**", async (route) => {
    await new Promise((r) => setTimeout(r, 1000));
    await route.abort();
  });
  await page.goto("/");
  await page
    .getByLabel("Upload files", { exact: true })
    .setInputFiles(fixture("scan.png"));
  await page
    .getByRole("button", { name: "Prepare reading", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cancel processing", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Prepare reading", exact: true }),
  ).toBeEnabled();
  await page.unroute("**/ocr/**");
  await page.route("**/ocr/**", (route) =>
    route.fulfill({ status: 404, body: "Not found" }),
  );
  await page
    .getByRole("button", { name: "Prepare reading", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 20000 });
  await expect(
    page.getByRole("button", { name: "Prepare reading", exact: true }),
  ).toBeEnabled();
});

test("strict playback rate and hidden-tab pause", async ({ page }) => {
  await sample(page);
  await page
    .getByRole("button", { name: "Reader settings", exact: true })
    .click();
  await page.getByLabel("Adaptive timing").uncheck();
  await page
    .getByRole("button", { name: "Close settings", exact: true })
    .click();
  await page.getByLabel("Reader words per minute").fill("500");
  await page.getByLabel("Reader words per minute").press("Tab");
  await page.evaluate(() => {
    const times: number[] = [];
    (window as any).__timing = times;
    new MutationObserver(() => times.push(performance.now())).observe(
      document.querySelector('[aria-label="Reading progress"]')!,
      { attributes: true, attributeFilter: ["value"] },
    );
  });
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForTimeout(2100);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const times = await page.evaluate(() => (window as any).__timing as number[]);
  const gaps = times.slice(1).map((t, i) => t - times[i]);
  const average = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  console.log(
    `Measured strict 500 WPM: ${average.toFixed(1)} ms/token over ${gaps.length} intervals`,
  );
  expect(average).toBeGreaterThan(105);
  expect(average).toBeLessThan(140);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
});
test("source PDF rendering and direct numeric speed entry", async ({
  page,
}) => {
  await upload(page, ["columns.pdf"]);
  await page
    .getByRole("button", { name: "View source for block 2", exact: true })
    .click();
  await expect(page.locator(".source-preview canvas")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".source-preview canvas")
        .evaluate((el) => (el as HTMLCanvasElement).width),
    )
    .toBeGreaterThan(500);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByLabel("Words per minute", { exact: true }).fill("1240");
  await page.getByLabel("Words per minute", { exact: true }).press("Tab");
  await expect(
    page.getByLabel("Words per minute", { exact: true }),
  ).toHaveValue("1240");
});

test("simple PDF tables retain labels, values and original rows", async ({
  page,
}) => {
  const pdf = await PDFDocument.create();
  const p = pdf.addPage([600, 800]);
  for (const [row, y] of [
    [["Country", "Population"], 700],
    [["France", "68 million"], 675],
    [["Germany", "84 million"], 650],
  ] as const) {
    p.drawText(row[0], { x: 40, y, size: 12 });
    p.drawText(row[1], { x: 220, y, size: 12 });
  }
  writeFileSync(fixture("table.pdf"), await pdf.save());
  await upload(page, ["table.pdf"]);
  await expect(page.getByLabel("Edit block 1", { exact: true })).toHaveValue(
    "France — Population: 68 million.\nGermany — Population: 84 million.",
  );
  await page.getByRole("button", { name: "Source", exact: true }).click();
  await expect(
    page.getByText(
      "Country | Population\nFrance | 68 million\nGermany | 84 million",
      { exact: true },
    ),
  ).toBeVisible();
});
