import * as CFB from "cfb";
// MS-DOC FibRgFcLcb97.fcClx / lcbClx and PlcPcd piece table. Never decode DOC as DOCX.
export function extractLegacyDoc(buffer: ArrayBuffer): string {
  const cfb = CFB.read(new Uint8Array(buffer), { type: "array" });
  const word = CFB.find(cfb, "WordDocument");
  if (!word?.content)
    throw new Error(
      "This DOC is not a supported Word 97–2003 document. Save it as DOCX.",
    );
  const data = new Uint8Array(word.content);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (view.getUint16(0, true) !== 0xa5ec)
    throw new Error("Unsupported legacy Word format. Save as DOCX.");
  if (view.getUint16(10, true) & 0x100)
    throw new Error(
      "Encrypted DOC files cannot be read locally. Remove the password or save as DOCX.",
    );
  const table = CFB.find(
    cfb,
    view.getUint16(10, true) & 0x200 ? "1Table" : "0Table",
  );
  if (!table?.content)
    throw new Error("Missing DOC piece table. Save the document as DOCX.");
  const t = new Uint8Array(table.content);
  const tv = new DataView(t.buffer, t.byteOffset, t.byteLength);
  let pos = view.getUint32(0x1a2, true);
  const end = pos + view.getUint32(0x1a6, true);
  if (end > t.length) throw new Error("Invalid DOC text table.");
  while (pos < end && t[pos] === 1) pos += 3 + tv.getUint16(pos + 1, true);
  if (t[pos] !== 2)
    throw new Error("This DOC variant is unsupported. Save as DOCX.");
  const length = tv.getUint32(pos + 1, true);
  pos += 5;
  const count = (length - 4) / 12;
  if (!Number.isInteger(count) || count < 0 || pos + length > t.length)
    throw new Error("Corrupt DOC piece table.");
  const mainLength = view.getUint32(0x4c, true);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const start = tv.getUint32(pos + i * 4, true);
    const finish = Math.min(mainLength, tv.getUint32(pos + (i + 1) * 4, true));
    if (start >= mainLength) break;
    const fc = tv.getUint32(pos + (count + 1) * 4 + i * 8 + 2, true);
    const compressed = !!(fc & 0x40000000);
    const offset = (fc & 0x3fffffff) / (compressed ? 2 : 1);
    const size = (finish - start) * (compressed ? 1 : 2);
    if (offset + size > data.length) throw new Error("Corrupt DOC text data.");
    out.push(
      new TextDecoder(compressed ? "windows-1252" : "utf-16le").decode(
        data.subarray(offset, offset + size),
      ),
    );
  }
  return out
    .join("")
    .replace(/\r/g, "\n\n")
    .replace(/\x07/g, " | ")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
}
