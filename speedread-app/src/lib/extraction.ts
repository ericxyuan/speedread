import { extractPdfTables } from "./pdf-tables";
import { LocalOCR } from "./ocr";
import { forEachTiffPage } from "./tiff";
import { imageRegions } from "./pdf-images";
import { validateOfficeContainer } from "./resource-budget";
import type { Block, BlockType } from "../types";
import { reconstruct } from "./layout";
import type { TextItem } from "./layout";
export const supported =
  ".pdf,.docx,.doc,.txt,.md,.markdown,.html,.htm,.png,.jpg,.jpeg,.webp,.tif,.tiff,.bmp";
export interface ExtractionResult {
  blocks: Block[];
  warnings: string[];
}
const abortIf = (signal: AbortSignal) => {
  if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
};
export function textBlocks(
  text: string,
  file: string,
  sourceId: string,
): Block[] {
  return text
    .split(/\n\s*\n/)
    .filter((t) => t.trim())
    .map((original, order) => ({
      id: `${sourceId}:${order}`,
      sourceId,
      file,
      original,
      cleaned: original,
      type: /^#{1,6}\s/.test(original) ? "heading" : "paragraph",
      order,
      confidence: 1,
      included: true,
    }));
}
function htmlBlocks(html: string, file: string, sourceId: string): Block[] {
  const inert = html.replace(
    /\s(?:src|srcset|href|poster|background|data|action|style)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
    "",
  );
  const doc = new DOMParser().parseFromString(inert, "text/html");
  doc
    .querySelectorAll(
      "script,style,iframe,object,embed,template,noscript,svg,nav,header,footer,aside,[hidden]",
    )
    .forEach((n) => n.remove());
  const out: Block[] = [];
  const append = (original: string, type: BlockType, converted?: string) => {
    if (original.trim())
      out.push({
        id: `${sourceId}:${out.length}`,
        sourceId,
        file,
        original,
        cleaned: converted ?? original,
        type,
        tableReadable: !!converted,
        order: out.length,
        confidence: 1,
        included: true,
      });
  };
  function visit(node: Element) {
    const tag = node.tagName.toLowerCase();
    if (tag === "table") {
      const rows = Array.from(node.querySelectorAll("tr")).map((r) =>
        Array.from(r.children).map((c) => c.textContent?.trim() ?? ""),
      );
      const headers = rows[0];
      if (
        rows.length > 1 &&
        headers.length >= 2 &&
        headers.length <= 5 &&
        node.querySelector("th") &&
        rows.every((r) => r.length === headers.length)
      )
        append(
          rows.map((r) => r.join(" | ")).join("\n"),
          "table",
          rows
            .slice(1)
            .map(
              (r) =>
                `${r[0]} — ${r
                  .slice(1)
                  .map((v, i) => `${headers[i + 1]}: ${v}`)
                  .join("; ")}.`,
            )
            .join("\n"),
        );
      else append(rows.map((r) => r.join(" | ")).join("\n"), "table");
      return;
    }
    if (
      /^(h[1-6]|p|li|figcaption|blockquote|pre)$/.test(tag) &&
      !node.querySelector("table,p,li,h1,h2,h3")
    ) {
      append(
        node.textContent ?? "",
        /^h/.test(tag)
          ? "heading"
          : tag === "figcaption"
            ? "caption"
            : "paragraph",
      );
      return;
    }
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim())
        append(child.textContent, "paragraph");
      else if (child instanceof Element) visit(child);
    }
  }
  visit(doc.body);
  return out;
}
async function office(file: File, signal: AbortSignal) {
  const buffer = await file.arrayBuffer();
  abortIf(signal);
  if (/\.docx$/i.test(file.name))
    validateOfficeContainer(
      buffer,
      (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4,
    );
  return new Promise<{ html?: string; text?: string; warnings: string[] }>(
    (resolve, reject) => {
      const worker = new Worker(
        new URL("../workers/office.worker.ts", import.meta.url),
        { type: "module" },
      );
      const stop = () => {
        worker.terminate();
        signal.removeEventListener("abort", abort);
      };
      const abort = () => {
        stop();
        reject(new DOMException("Cancelled", "AbortError"));
      };
      signal.addEventListener("abort", abort, { once: true });
      worker.onerror = () => {
        stop();
        reject(
          new Error(
            "Word extraction failed. The document may be damaged or require too much memory.",
          ),
        );
      };
      worker.onmessage = (e) => {
        stop();
        if (e.data.error) reject(new Error(e.data.error));
        else resolve(e.data);
      };
      worker.postMessage({ buffer, legacy: /\.doc$/i.test(file.name) }, [
        buffer,
      ]);
    },
  );
}
export interface ExtractionProvider {
  id: string;
  accepts: (file: File) => boolean;
  extract: (
    file: File,
    signal: AbortSignal,
    progress: (message: string) => void,
  ) => Promise<ExtractionResult>;
}
const providers: ExtractionProvider[] = [];
export function registerExtractionProvider(provider: ExtractionProvider) {
  providers.push(provider);
}
export async function extractFile(
  file: File,
  signal: AbortSignal,
  progress: (message: string) => void,
): Promise<ExtractionResult> {
  const provider = providers.find((p) => p.accepts(file));
  if (provider) return provider.extract(file, signal, progress);
  const session = new LocalOCR(signal, progress);
  try {
    return await extractLocalFile(file, signal, progress, session);
  } finally {
    session.destroy();
  }
}
async function extractLocalFile(
  file: File,
  signal: AbortSignal,
  progress: (message: string) => void,
  session: LocalOCR,
): Promise<ExtractionResult> {
  const sourceId = crypto.randomUUID();
  const ext = file.name.split(".").pop()?.toLowerCase();
  const warnings: string[] = [];
  let blocks: Block[] = [];
  progress(`Loading ${file.name}`);
  abortIf(signal);
  if (["txt", "md", "markdown"].includes(ext ?? "")) {
    const reader = file
      .stream()
      .pipeThrough(new TextDecoderStream())
      .getReader();
    let text = "";
    try {
      while (true) {
        abortIf(signal);
        const part = await reader.read();
        if (part.done) break;
        text += part.value;
        progress(`Loading ${file.name} · ${Math.round(text.length / 1024)} KB`);
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    blocks = textBlocks(text, file.name, sourceId);
    if (ext !== "txt")
      blocks = blocks.map((b) => ({
        ...b,
        cleaned: b.original
          .replace(/^#{1,6}\s+/gm, "")
          .replace(/!\[([^\]]*)\]\([^)]*\)/g, "")
          .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
          .replace(/^(?:[-*+]\s+)/gm, "")
          .replace(/\*\*([^*]+)\*\*/g, "$1")
          .replace(/`([^`]+)`/g, "$1"),
      }));
  } else if (["html", "htm"].includes(ext ?? ""))
    blocks = htmlBlocks(await file.text(), file.name, sourceId);
  else if (ext === "docx" || ext === "doc") {
    progress(`Extracting ${file.name}`);
    const result = await office(file, signal);
    warnings.push(...result.warnings);
    blocks = result.html
      ? htmlBlocks(result.html, file.name, sourceId)
      : textBlocks(result.text ?? "", file.name, sourceId);
  } else if (ext === "pdf") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).href;
    const url = URL.createObjectURL(file);
    const task = pdfjs.getDocument({
      url,
      disableAutoFetch: true,
      disableStream: true,
      cMapUrl: "/pdf/cmaps/",
      standardFontDataUrl: "/pdf/standard_fonts/",
    });
    const cancel = () => {
      void task.destroy();
    };
    signal.addEventListener("abort", cancel, { once: true });
    try {
      const pdf = await task.promise;
      for (let page = 1; page <= pdf.numPages; page++) {
        abortIf(signal);
        progress(`Analysing layout · page ${page} of ${pdf.numPages}`);
        const p = await pdf.getPage(page);
        const viewport = p.getViewport({ scale: 1 });
        const content = await p.getTextContent();
        const items = content.items.filter(
          (i): i is typeof i & TextItem => "str" in i,
        );
        const tableAnalysis = extractPdfTables(items);
        const lines = reconstruct(tableAnalysis.items, viewport.width);
        for (const table of tableAnalysis.tables)
          blocks.push({
            id: `${sourceId}:table:${page}:${blocks.length}`,
            sourceId,
            file: file.name,
            page,
            bbox: [
              table.x,
              table.y - table.height + 12,
              table.width,
              table.height,
            ],
            original: table.original,
            cleaned: table.cleaned,
            type: "table",
            tableReadable: table.readable,
            order: blocks.length,
            confidence: 0.85,
            included: true,
          });
        if (
          items
            .map((l) => l.str)
            .join("")
            .trim().length < 12
        ) {
          progress(`Performing OCR · page ${page} of ${pdf.numPages}`);
          const scale = Math.min(
            2,
            Math.sqrt(16_000_000 / (viewport.width * viewport.height)),
          );
          const vp = p.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(vp.width);
          canvas.height = Math.ceil(vp.height);
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Canvas is unavailable.");
          await p.render({ canvasContext: context, canvas, viewport: vp })
            .promise;
          blocks.push(
            ...(await ocr(
              canvas,
              file.name,
              sourceId,
              signal,
              progress,
              page,
              session,
            )),
          );
          canvas.width = canvas.height = 0;
        } else {
          for (const line of lines) {
            const margin =
              line.y > viewport.height * 0.94 ||
              line.y < viewport.height * 0.06;
            const type: BlockType = margin
              ? "margin"
              : /^(?:Figure|Fig\.|Chart|Diagram)\s+\d+[.:]/i.test(line.text)
                ? "caption"
                : line.height > 16 && line.text.length < 160
                  ? "heading"
                  : "paragraph";
            const prior = blocks.at(-1);
            if (
              prior &&
              prior.page === page &&
              prior.type === "paragraph" &&
              type === "paragraph" &&
              prior.bbox &&
              Math.abs(prior.bbox[0] - line.x) < 20 &&
              Math.abs(prior.bbox[1] - line.y) < line.height * 1.9
            ) {
              prior.original += "\n" + line.text;
              prior.cleaned = prior.original;
              prior.bbox[1] = line.y;
              prior.bbox[2] = Math.max(prior.bbox[2], line.width);
            } else
              blocks.push({
                id: `${sourceId}:${blocks.length}`,
                sourceId,
                file: file.name,
                page,
                bbox: [line.x, line.y, line.width, line.height],
                original: line.text,
                cleaned: line.text,
                type,
                order: blocks.length,
                confidence: 1,
                included: true,
              });
          }
          // Selective OCR for image regions with no usable overlapping text layer.
          const ops = await p.getOperatorList();
          const regions = imageRegions(ops, pdfjs.OPS);
          let imageIndex = 0;
          for (const region of regions) {
            const covered = lines
              .filter(
                (l) =>
                  l.x < region.x + region.width &&
                  l.x + l.width > region.x &&
                  l.y >= region.y &&
                  l.y <= region.y + region.height,
              )
              .map((l) => l.text)
              .join("");
            if (covered.trim().length >= 12) continue;
            abortIf(signal);
            progress(`OCR image region · page ${page} of ${pdf.numPages}`);
            const scale = Math.min(
              2,
              Math.sqrt(16_000_000 / (viewport.width * viewport.height)),
            );
            const vp = p.getViewport({ scale });
            const raster = document.createElement("canvas");
            raster.width = Math.ceil(vp.width);
            raster.height = Math.ceil(vp.height);
            const ctx = raster.getContext("2d")!;
            await p.render({ canvas: raster, canvasContext: ctx, viewport: vp })
              .promise;
            const corners = vp.convertToViewportRectangle([
              region.x,
              region.y,
              region.x + region.width,
              region.y + region.height,
            ]);
            const x = Math.max(0, Math.floor(Math.min(corners[0], corners[2]))),
              y = Math.max(0, Math.floor(Math.min(corners[1], corners[3])));
            const crop = document.createElement("canvas");
            crop.width = Math.max(
              1,
              Math.min(
                raster.width - x,
                Math.ceil(Math.abs(corners[2] - corners[0])),
              ),
            );
            crop.height = Math.max(
              1,
              Math.min(
                raster.height - y,
                Math.ceil(Math.abs(corners[3] - corners[1])),
              ),
            );
            crop
              .getContext("2d")!
              .drawImage(
                raster,
                x,
                y,
                crop.width,
                crop.height,
                0,
                0,
                crop.width,
                crop.height,
              );
            raster.width = raster.height = 0;
            const recognised = await ocr(
              crop,
              file.name,
              `${sourceId}:image${page}-${imageIndex++}`,
              signal,
              progress,
              page,
              session,
            );
            crop.width = crop.height = 0;
            for (const b of recognised) {
              const bounds = b.bbox;
              if (bounds) {
                const origin = vp.convertToPdfPoint(
                  x + bounds[0],
                  y + bounds[1] + bounds[3],
                );
                b.bbox = [
                  origin[0],
                  origin[1],
                  bounds[2] / scale,
                  bounds[3] / scale,
                ];
              }
              b.sourceId = sourceId;
              if (
                !blocks.some(
                  (existing) =>
                    existing.page === page &&
                    existing.cleaned.replace(/\s/g, "") ===
                      b.cleaned.replace(/\s/g, ""),
                )
              )
                blocks.push(b);
            }
          }
          if (regions.length || tableAnalysis.tables.length) {
            const pageBlocks = blocks.filter((b) => b.page === page);
            const ordered = reconstruct(
              pageBlocks
                .filter((b) => b.bbox)
                .map((b) => ({
                  str: b.original,
                  transform: [12, 0, 0, 12, b.bbox![0], b.bbox![1]],
                  width: b.bbox![2],
                  height: 12,
                })),
              viewport.width,
            );
            const ranks = new Map(ordered.map((l, i) => [l.text, i]));
            blocks = blocks
              .filter((b) => b.page !== page)
              .concat(
                pageBlocks.sort(
                  (a, b) =>
                    (ranks.get(a.original) ?? 1e9) -
                    (ranks.get(b.original) ?? 1e9),
                ),
              );
            warnings.push(
              `Page ${page}: image-only regions were checked with OCR. Review diagrams and any overlapping or complex layouts against the source.`,
            );
          }
        }
        p.cleanup();
      }
      warnings.push(
        "PDF reading order is reconstructed geometrically. Review complex tables, sidebars, rotated text and mixed image/text pages against the source.",
      );
    } finally {
      signal.removeEventListener("abort", cancel);
      await task.destroy();
      URL.revokeObjectURL(url);
    }
  } else if (
    ["png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff"].includes(ext ?? "")
  ) {
    if (ext === "tif" || ext === "tiff") {
      await forEachTiffPage(file, signal, async (canvas, page) => {
        blocks.push(
          ...(await ocr(
            canvas,
            file.name,
            sourceId,
            signal,
            progress,
            page,
            session,
          )),
        );
      });
    } else {
      const bitmap = await createImageBitmap(file);
      if (bitmap.width * bitmap.height > 40_000_000) {
        bitmap.close();
        throw new Error(
          "Image dimensions exceed the safe working budget. Export a smaller image.",
        );
      }
      const canvas = document.createElement("canvas");
      const scale = Math.min(
        1,
        Math.sqrt(16_000_000 / (bitmap.width * bitmap.height)),
      );
      canvas.width = Math.ceil(bitmap.width * scale);
      canvas.height = Math.ceil(bitmap.height * scale);
      canvas
        .getContext("2d")!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      blocks = await ocr(
        canvas,
        file.name,
        sourceId,
        signal,
        progress,
        1,
        session,
      );
      canvas.width = canvas.height = 0;
    }
    warnings.push(
      "OCR is an estimate. Check low-confidence blocks, numbers and layout against the original image.",
    );
  } else
    throw new Error(
      `.${ext ?? "unknown"} files are not supported. Choose a listed format.`,
    );
  abortIf(signal);
  if (!blocks.length || !blocks.some((b) => b.original.trim()))
    throw new Error(
      "No readable text was found. Try a clearer image or a text-based document.",
    );
  return { blocks, warnings: [...new Set(warnings)] };
}
async function ocr(
  canvas: HTMLCanvasElement,
  file: string,
  sourceId: string,
  signal: AbortSignal,
  progress: (message: string) => void,
  page: number,
  session: LocalOCR,
): Promise<Block[]> {
  progress(`Performing OCR · page ${page}`);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value
          ? resolve(value)
          : reject(new Error("The image could not be prepared for OCR.")),
      "image/png",
    ),
  );
  abortIf(signal);
  const result = await session.recognize(await blob.arrayBuffer(), page);
  abortIf(signal);
  const paragraphs = result.blocks?.flatMap((b) => b.paragraphs) ?? [];
  if (!paragraphs.length)
    return textBlocks(result.text, file, sourceId).map((b) => ({
      ...b,
      page,
      confidence: result.confidence / 100,
    }));
  return paragraphs.map((p, i) => ({
    id: `${sourceId}:p${page}:${i}`,
    sourceId,
    file,
    page,
    bbox: [p.bbox.x0, p.bbox.y0, p.bbox.x1 - p.bbox.x0, p.bbox.y1 - p.bbox.y0],
    original: p.text,
    cleaned: p.text,
    type: "paragraph",
    order: i,
    confidence: p.confidence / 100,
    included: true,
  }));
}
