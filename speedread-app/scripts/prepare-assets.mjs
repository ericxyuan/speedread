import { createRequire } from "node:module";
import { cpSync, mkdirSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";
const require = createRequire(import.meta.url);
const dest = path.resolve("public/ocr");
mkdirSync(dest, { recursive: true });
const tess = path.dirname(require.resolve("tesseract.js/package.json"));
const core = path.dirname(
  createRequire(path.join(tess, "package.json")).resolve(
    "tesseract.js-core/package.json",
  ),
);
cpSync(path.join(tess, "dist/worker.min.js"), path.join(dest, "worker.min.js"));
for (const file of [
  "tesseract-core-lstm.wasm.js",
  "tesseract-core-lstm.wasm",
  "tesseract-core-simd-lstm.wasm.js",
  "tesseract-core-simd-lstm.wasm",
])
  cpSync(path.join(core, file), path.join(dest, file));
cpSync(path.join(tess, "LICENSE.md"), path.join(dest, "LICENSE-TESSERACT.txt"));
cpSync(path.join(core, "LICENSE"), path.join(dest, "LICENSE-CORE.txt"));
const pdf = path.dirname(require.resolve("pdfjs-dist/package.json"));
for (const dir of ["cmaps", "standard_fonts"])
  cpSync(path.join(pdf, dir), path.resolve("public/pdf", dir), {
    recursive: true,
  });
if (!existsSync(path.join(dest, "eng.traineddata.gz"))) {
  const res = await fetch(
    "https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz",
  );
  if (!res.ok) throw new Error("Unable to fetch English OCR model");
  writeFileSync(
    path.join(dest, "eng.traineddata.gz"),
    new Uint8Array(await res.arrayBuffer()),
  );
}
console.log("Local OCR and PDF assets ready.");
