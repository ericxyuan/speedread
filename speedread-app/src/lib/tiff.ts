export async function forEachTiffPage(
  file: File,
  signal: AbortSignal,
  handle: (canvas: HTMLCanvasElement, page: number) => Promise<void>,
) {
  const worker = new Worker(
    new URL("../workers/tiff.worker.ts", import.meta.url),
    { type: "module" },
  );
  let rejectPending: ((e: Error) => void) | undefined;
  const abort = () => {
    worker.terminate();
    rejectPending?.(new DOMException("Cancelled", "AbortError"));
  };
  signal.addEventListener("abort", abort, { once: true });
  const request = <T>(
    message: unknown,
    transfer: Transferable[] = [],
  ): Promise<T> =>
    new Promise((resolve, reject) => {
      rejectPending = reject;
      if (signal.aborted) {
        abort();
        return;
      }
      worker.onmessage = (e) => {
        rejectPending = undefined;
        if (e.data.error) reject(new Error(e.data.error));
        else resolve(e.data);
      };
      worker.onerror = () =>
        reject(
          new Error("TIFF decoding failed. Try exporting this page as PNG."),
        );
      worker.postMessage(message, transfer);
    });
  try {
    const buffer = await file.arrayBuffer();
    const meta = await request<{ pages: number }>({ buffer }, [buffer]);
    for (let i = 0; i < meta.pages; i++) {
      const data = await request<{
        width: number;
        height: number;
        rgba: Uint8ClampedArray<ArrayBuffer>;
      }>({ page: i });
      const canvas = document.createElement("canvas");
      canvas.width = data.width;
      canvas.height = data.height;
      canvas
        .getContext("2d")!
        .putImageData(new ImageData(data.rgba, data.width, data.height), 0, 0);
      try {
        await handle(canvas, i + 1);
      } finally {
        canvas.width = canvas.height = 0;
      }
    }
  } finally {
    signal.removeEventListener("abort", abort);
    worker.terminate();
  }
}
