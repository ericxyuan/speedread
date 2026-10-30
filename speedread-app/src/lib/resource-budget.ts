// Inspect the ZIP central directory before decompression. Budgets reflect device
// resources, rather than an advertised upload-size limit.
export function validateOfficeContainer(buffer: ArrayBuffer, memoryGiB = 4) {
  const view = new DataView(buffer);
  let end = -1;
  for (
    let i = buffer.byteLength - 22;
    i >= Math.max(0, buffer.byteLength - 65557);
    i--
  )
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0) throw new Error("The DOCX ZIP container is invalid.");
  const count = view.getUint16(end + 10, true);
  let pos = view.getUint32(end + 16, true),
    total = 0;
  const budget = Math.min(512, Math.max(64, memoryGiB * 64)) * 1024 * 1024;
  for (let i = 0; i < count; i++) {
    if (
      pos + 46 > buffer.byteLength ||
      view.getUint32(pos, true) !== 0x02014b50
    )
      throw new Error("The DOCX archive directory is damaged.");
    const compressed = view.getUint32(pos + 20, true),
      size = view.getUint32(pos + 24, true);
    total += size;
    if (total > budget || size > Math.max(1, compressed) * 1000)
      throw new Error(
        "This document expands beyond the safe memory budget for this device. Split it into smaller documents.",
      );
    pos +=
      46 +
      view.getUint16(pos + 28, true) +
      view.getUint16(pos + 30, true) +
      view.getUint16(pos + 32, true);
  }
  return total;
}
