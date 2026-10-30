import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";

for (const width of [1440, 390]) {
  test(`Chinese words and character-centred pinyin at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page
      .getByRole("button", { name: "Try Chinese", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Start reading", exact: true })
      .click();
    const stage = page.locator(".reading-area .word-stage");
    await expect(stage).toHaveAttribute("aria-label", "我们");
    await page.getByRole("button", { name: "Next word", exact: true }).click();
    await expect(stage).toHaveAttribute("aria-label", "可以");
    await expect(stage.locator('[data-character="可"] rt')).toHaveText("kě");
    await expect(stage.locator('[data-character="以"] rt')).toHaveText("yǐ");
    const anchors: number[] = [];
    for (let i = 0; i < 32; i++) {
      const measurements = await stage
        .locator(".cjk-cell")
        .evaluateAll((cells) =>
          cells.map((cell) => {
            const char = cell.querySelector(".hanzi")!.getBoundingClientRect();
            const pinyin = cell.querySelector("rt")!.getBoundingClientRect();
            return {
              delta: Math.abs(
                char.x + char.width / 2 - pinyin.x - pinyin.width / 2,
              ),
              above: pinyin.bottom <= char.top + 2,
              left: pinyin.left,
              right: pinyin.right,
            };
          }),
        );
      for (const m of measurements) {
        expect(m.delta).toBeLessThan(1);
        expect(m.above).toBe(true);
        expect(m.left).toBeGreaterThanOrEqual(0);
        expect(m.right).toBeLessThanOrEqual(width);
      }
      anchors.push(
        await stage.locator(".word-anchor").evaluate((el) => {
          const r = el.getBoundingClientRect();
          return r.x + r.width / 2;
        }),
      );
      await page
        .getByRole("button", { name: "Next word", exact: true })
        .click();
    }
    expect(Math.max(...anchors) - Math.min(...anchors)).toBeLessThan(1);
    await page.getByLabel("Reading progress", { exact: true }).fill("1");
    await page.screenshot({ path: `test-results/chinese-${width}.png` });
    await page
      .getByRole("button", { name: "Toggle transcript", exact: true })
      .click();
    const transcript = page.locator(".transcript-words");
    await expect(
      transcript.locator('[data-character="重"] rt').first(),
    ).toHaveText("chóng");
    await expect(
      transcript.locator('[data-character="行"] rt').first(),
    ).toHaveText("háng");
    await page
      .getByRole("button", { name: "Close transcript", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Reader settings", exact: true })
      .click();
    await page.getByLabel("Pinyin above Chinese").uncheck();
    await page
      .getByRole("button", { name: "Close settings", exact: true })
      .click();
    await expect(stage.locator("rt")).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  });
}

test("curated traditional readings reach the reader", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Enter text", exact: true }).click();
  await page
    .getByLabel("Text to read", { exact: true })
    .fill("他還是走了。天氣還冷。");
  await page
    .getByRole("button", { name: "Prepare reading", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start reading", exact: true })
    .click();
  const stage = page.locator(".reading-area .word-stage");
  await expect(stage).toHaveAttribute("aria-label", "他");
  await page.getByRole("button", { name: "Next word", exact: true }).click();
  await expect(stage).toHaveAttribute("aria-label", "還是");
  await expect(stage.locator('[data-character="還"] rt')).toHaveText("hái");
  await expect(stage.locator('[data-character="是"] rt')).toHaveText("shì");
  await page.getByRole("button", { name: "Next word", exact: true }).click();
  await page.getByRole("button", { name: "Next word", exact: true }).click();
  await expect(stage).toHaveAttribute("aria-label", "天氣");
  await page.getByRole("button", { name: "Next word", exact: true }).click();
  await expect(stage).toHaveAttribute("aria-label", "還");
  await expect(stage.locator('[data-character="還"] rt')).toHaveText("hái");
  await page.getByRole("button", { name: "Next word", exact: true }).click();
  await expect(stage).toHaveAttribute("aria-label", "冷。");
  await expect(stage.locator('[data-character="冷"] rt')).toHaveText("lěng");
});

test("pinyin corrections persist and can return to automatic pronunciation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try Chinese", exact: true }).click();
  await page.getByText("Review pinyin", { exact: true }).first().click();
  const edit = page.getByLabel("Edit pinyin for block 1", { exact: true });
  const original = await edit.inputValue();
  await edit.fill(original.replace(/^wǒ/, "wò"));
  await edit.press("Tab");
  await expect(
    page.getByRole("button", { name: "Use automatic pinyin", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Start reading", exact: true })
    .click();
  await expect(
    page.locator('.reading-area [data-character="我"] rt'),
  ).toHaveText("wò");
  await page
    .getByRole("button", { name: "Back to document", exact: true })
    .click();
  await page.reload();
  await page.getByRole("button", { name: /Library/ }).click();
  await expect(page.locator(".document-open")).toHaveCount(1);
  await page
    .locator(".document-open")
    .filter({ hasText: "中文阅读练习" })
    .click();
  await page.getByText("Review pinyin", { exact: true }).first().click();
  await expect(edit).toHaveValue(original.replace(/^wǒ/, "wò"));
  await page
    .getByRole("button", { name: "Use automatic pinyin", exact: true })
    .click();
  await expect(edit).toHaveValue(original);
});

test("simplified Chinese OCR uses local models and preserves words", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (
      !request.url().startsWith("http://127.0.0.1:") &&
      !request.url().startsWith("data:") &&
      !request.url().startsWith("blob:")
    )
      external.push(request.url());
  });
  await page.goto("/");
  const data = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 1200;
    c.height = 240;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "black";
    ctx.font = '52px "Microsoft YaHei"';
    ctx.fillText("我们可以一起阅读中文。", 50, 120);
    return c.toDataURL("image/png").split(",")[1];
  });
  writeFileSync("e2e/fixtures/chinese.png", Buffer.from(data, "base64"));
  await page
    .getByRole("button", { name: "Reading preferences", exact: true })
    .click();
  await page
    .getByLabel("OCR language", { exact: true })
    .selectOption("eng+chi_sim");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page
    .getByLabel("Upload files", { exact: true })
    .setInputFiles("e2e/fixtures/chinese.png");
  await page
    .getByRole("button", { name: "Prepare reading", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Start reading", exact: true }),
  ).toBeVisible({ timeout: 90000 });
  const text = await page
    .locator(".text-block textarea")
    .evaluateAll((els) =>
      els.map((el) => (el as HTMLTextAreaElement).value).join(""),
    );
  expect(text.replace(/\s/g, "")).toContain("我们可以一起阅读中文");
  await page
    .getByRole("button", { name: "Start reading", exact: true })
    .click();
  await expect(page.locator(".reading-area .word-stage")).toHaveAttribute(
    "aria-label",
    "我们",
  );
  await page.getByRole("button", { name: "Next word", exact: true }).click();
  await expect(page.locator(".reading-area .word-stage")).toHaveAttribute(
    "aria-label",
    "可以",
  );
  expect(external).toEqual([]);
});
