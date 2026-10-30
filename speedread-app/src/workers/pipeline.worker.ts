import { filterBlocks } from "../lib/filtering";
import { tokenize } from "../lib/tokenisation";
import type { Block, FilterMode } from "../types";
self.onmessage = (
  event: MessageEvent<{
    id: string;
    blocks: Block[];
    mode: FilterMode;
    locale?: string;
  }>,
) => {
  try {
    const blocks = filterBlocks(event.data.blocks, event.data.mode);
    self.postMessage({
      id: event.data.id,
      blocks,
      tokens: tokenize(blocks, event.data.locale),
    });
  } catch (e) {
    self.postMessage({
      id: event.data.id,
      error: e instanceof Error ? e.message : "Processing failed",
    });
  }
};
