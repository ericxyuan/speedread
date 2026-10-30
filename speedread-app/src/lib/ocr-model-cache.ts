const DATABASE = "keyval-store";
const STORE = "keyval";
const KEY = "./chi_tra.traineddata";
type ModelPart = { name: string; size: number };
type ModelManifest = { parts: ModelPart[] };
let pending: Promise<void> | null = null;

function openCache(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE))
        request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("The OCR cache is unavailable."));
    request.onblocked = () =>
      reject(new Error("The OCR cache is blocked by another tab."));
  });
}

function hasModel(db: IDBDatabase): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
    request.onsuccess = () => resolve(request.result !== undefined);
    request.onerror = () =>
      reject(request.error ?? new Error("The OCR cache could not be read."));
  });
}

function storeModel(db: IDBDatabase, data: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(data, KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("The OCR cache could not be written."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("The OCR cache write was aborted."));
  });
}

function modelUrl(file: string) {
  return new URL(file, new URL("/ocr/", self.location.origin)).href;
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(
      `The traditional Chinese OCR model could not be loaded (${response.status}).`,
    );
  return new Uint8Array(await response.arrayBuffer());
}

function assertGzip(data: Uint8Array) {
  if (data[0] !== 0x1f || data[1] !== 0x8b)
    throw new Error(
      "The traditional Chinese OCR model is missing or is not a gzip archive.",
    );
  return data;
}

async function loadModel(): Promise<Uint8Array> {
  const manifestResponse = await fetch(modelUrl("chi_tra.parts.json"));
  if (manifestResponse.ok) {
    const manifest = (await manifestResponse.json()) as ModelManifest;
    if (!Array.isArray(manifest.parts) || !manifest.parts.length)
      throw new Error("The traditional Chinese OCR model manifest is invalid.");
    const parts = await Promise.all(
      manifest.parts.map((part) => fetchBytes(modelUrl(part.name))),
    );
    const data = new Uint8Array(
      parts.reduce((total, part) => total + part.byteLength, 0),
    );
    let offset = 0;
    for (const part of parts) {
      data.set(part, offset);
      offset += part.byteLength;
    }
    return assertGzip(data);
  }
  return assertGzip(await fetchBytes(modelUrl("chi_tra.traineddata.gz")));
}

/**
 * Sites rejects any single deployment file over 25 MiB. The traditional
 * Chinese model is larger than that, so the production build splits it into
 * bounded parts and this worker writes the joined gzip into the same
 * IndexedDB cache Tesseract reads, before the engine requests a language.
 */
export function ensureTraditionalOcrModel(): Promise<void> {
  pending ??= (async () => {
    const db = await openCache();
    try {
      if (await hasModel(db)) return;
      await storeModel(db, await loadModel());
    } finally {
      db.close();
    }
  })().catch((error) => {
    pending = null;
    throw error;
  });
  return pending;
}
