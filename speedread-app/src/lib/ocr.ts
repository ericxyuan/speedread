import type { Page } from "tesseract.js";
/** One cancellable OCR engine per document; reused for sequential pages. */
export class LocalOCR {
  private worker?: Worker;
  private reject?: (reason: Error) => void;
  private abort = () => {
    this.worker?.terminate();
    this.reject?.(new DOMException("Cancelled", "AbortError"));
  };
  constructor(
    private signal: AbortSignal,
    private progress: (message: string) => void,
  ) {
    signal.addEventListener("abort", this.abort, { once: true });
  }
  recognize(buffer: ArrayBuffer, page: number): Promise<Page> {
    return new Promise((resolve, reject) => {
      this.reject = reject;
      if (this.signal.aborted) {
        this.abort();
        return;
      }
      this.worker ??= new Worker(
        new URL("../workers/ocr.worker.ts", import.meta.url),
        { type: "module" },
      );
      this.worker.onmessage = (e) => {
        if (e.data.progress) {
          if (!this.signal.aborted) this.progress(e.data.progress);
        } else if (e.data.error) reject(new Error(e.data.error));
        else resolve(e.data.data);
      };
      this.worker.onerror = () =>
        reject(
          new Error(
            "The local OCR engine could not start. Reload the app and try again.",
          ),
        );
      this.worker.postMessage({ buffer, page }, [buffer]);
    });
  }
  destroy() {
    this.signal.removeEventListener("abort", this.abort);
    this.worker?.terminate();
    this.worker = undefined;
    this.reject = undefined;
  }
}
