import type { Block, FilterMode, Token } from "../types";
export function processBlocks(
  blocks: Block[],
  mode: FilterMode,
  signal?: AbortSignal,
  locale = "en-GB",
): Promise<{ blocks: Block[]; tokens: Token[] }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/pipeline.worker.ts", import.meta.url),
      { type: "module" },
    );
    const stop = () => {
      worker.terminate();
      signal?.removeEventListener("abort", abort);
    };
    const abort = () => {
      stop();
      reject(new DOMException("Cancelled", "AbortError"));
    };
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
    worker.onerror = () => {
      stop();
      reject(
        new Error(
          "Text processing failed. Try a smaller batch or another file.",
        ),
      );
    };
    worker.onmessage = (e) => {
      stop();
      if (e.data.error) reject(new Error(e.data.error));
      else resolve({ blocks: e.data.blocks, tokens: e.data.tokens });
    };
    worker.postMessage({ id: crypto.randomUUID(), blocks, mode, locale });
  });
}
