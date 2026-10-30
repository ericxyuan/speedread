import { createWorker, PSM } from "tesseract.js";
import type { Worker as TesseractWorker } from "tesseract.js";
let currentPage = 1;
let engine: TesseractWorker | null = null;
self.onmessage = async (
  e: MessageEvent<{ buffer: ArrayBuffer; page: number; language: string }>,
) => {
  currentPage = e.data.page;
  try {
    if (!engine) {
      const root = new URL("/ocr/", self.location.origin).href;
      engine = await createWorker(e.data.language.split("+"), 1, {
        workerPath: new URL("worker.min.js", root).href,
        corePath: root,
        langPath: root,
        workerBlobURL: false,
        logger: (m) =>
          self.postMessage({
            progress: `OCR page ${currentPage} · ${m.status} ${Math.round((m.progress ?? 0) * 100)}%`,
          }),
        errorHandler: (error) =>
          self.postMessage({
            error: `OCR could not load or recognise this image: ${String(error)}`,
          }),
      });
      await engine.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
    }
    const result = await engine.recognize(
      new Blob([e.data.buffer], { type: "image/png" }),
      { rotateAuto: true },
      { blocks: true, text: true },
    );
    self.postMessage({ data: result.data });
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error
          ? error.message
          : "OCR failed. Try a clearer image.",
    });
  }
};
