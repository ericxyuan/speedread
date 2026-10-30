import { existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const dir = path.resolve("dist/ocr");
const source = path.join(dir, "chi_tra.traineddata.gz");
const manifestPath = path.join(dir, "chi_tra.parts.json");
const MAX_PART_BYTES = 20 * 1024 * 1024;

if (!existsSync(source)) {
  if (existsSync(manifestPath)) {
    console.log("Traditional Chinese OCR model is already split.");
    process.exit(0);
  }
  console.log("No traditional Chinese OCR model to split.");
  process.exit(0);
}

const data = readFileSync(source);
const partCount = Math.max(1, Math.ceil(data.length / MAX_PART_BYTES));
const partSize = Math.ceil(data.length / partCount);
const parts = [];
for (const entry of readdirSync(dir))
  if (/^chi_tra\.part\d+$/.test(entry)) unlinkSync(path.join(dir, entry));
for (let index = 0; index < partCount; index += 1) {
  const name = `chi_tra.part${index + 1}`;
  const chunk = data.subarray(
    index * partSize,
    Math.min(data.length, (index + 1) * partSize),
  );
  writeFileSync(path.join(dir, name), chunk);
  parts.push({ name, size: chunk.length });
}
writeFileSync(
  manifestPath,
  `${JSON.stringify({ language: "chi_tra", totalSize: data.length, parts }, null, 2)}\n`,
);
unlinkSync(source);
console.log(
  `Split chi_tra.traineddata.gz into ${parts.length} parts: ${parts
    .map((part) => `${part.name} (${part.size} bytes)`)
    .join(", ")}.`,
);
