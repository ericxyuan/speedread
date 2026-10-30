import mammoth from "mammoth";
import { extractLegacyDoc } from "../lib/legacy-doc";
self.onmessage = async (
  e: MessageEvent<{ buffer: ArrayBuffer; legacy: boolean }>,
) => {
  try {
    if (e.data.legacy)
      self.postMessage({
        text: extractLegacyDoc(e.data.buffer),
        warnings: [
          "Legacy DOC: main-body text only. Check tables, fields and non-Western encodings against the source.",
        ],
      });
    else {
      const result = await mammoth.convertToHtml(
        { arrayBuffer: e.data.buffer },
        {
          externalFileAccess: false,
          convertImage: mammoth.images.imgElement(async () => ({ src: "" })),
        },
      );
      self.postMessage({
        html: result.value,
        warnings: result.messages.map((m) => m.message),
      });
    }
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "Word extraction failed.",
    });
  }
};
