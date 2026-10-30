import UTIF from "utif2";
let buffer: ArrayBuffer;
let pages: any[] = [];
self.onmessage = (e: MessageEvent<{ buffer?: ArrayBuffer; page?: number }>) => {
  try {
    if (e.data.buffer) {
      buffer = e.data.buffer;
      pages = UTIF.decode(buffer);
      self.postMessage({ pages: pages.length });
    } else {
      const page = pages[e.data.page ?? 0];
      const width = page.t256?.[0] ?? 0,
        height = page.t257?.[0] ?? 0;
      if (!width || !height || width * height > 40_000_000)
        throw new Error(
          "TIFF page dimensions exceed the safe working budget. Export smaller pages.",
        );
      UTIF.decodeImage(buffer, page);
      const rgba = new Uint8ClampedArray(UTIF.toRGBA8(page));
      self.postMessage(
        { width: page.width, height: page.height, rgba },
        { transfer: [rgba.buffer] },
      );
    }
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "TIFF decoding failed.",
    });
  }
};
