import { createWorker, PSM } from "tesseract.js";
import type { Worker as TesseractWorker } from "tesseract.js";
let engine: TesseractWorker | null = null;
self.onmessage = async (
  e: MessageEvent<{ buffer: ArrayBuffer; page: number }>,
) => {
  try {
    if (!engine) {
      const root = new URL("/ocr/", self.location.origin).href;
      engine = await createWorker("eng", 1, {
        workerPath: new URL("worker.min.js", root).href,
        corePath: root,
        langPath: root,
        workerBlobURL: false,
        logger: (m) =>
          self.postMessage({
            progress: `OCR page ${e.data.page} · ${m.status} ${Math.round((m.progress ?? 0) * 100)}%`,
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
