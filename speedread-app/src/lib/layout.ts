export interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}
export interface LayoutLine {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
export function reconstruct(
  items: TextItem[],
  pageWidth: number,
): LayoutLine[] {
  const sorted = items
    .filter((i) => i.str.trim())
    .map((i) => ({
      text: i.str,
      x: i.transform[4],
      y: i.transform[5],
      width: i.width,
      height: Math.abs(i.height) || Math.abs(i.transform[3]) || 12,
    }))
    .sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: LayoutLine[] = [];
  for (const item of sorted) {
    const row = lines.find(
      (l) =>
        Math.abs(l.y - item.y) < Math.min(l.height, item.height) * 0.4 &&
        item.x >= l.x - 2 &&
        item.x - (l.x + l.width) < Math.max(20, item.height * 2),
    );
    if (row) {
      row.text += (item.x > row.x + row.width + 1 ? " " : "") + item.text;
      row.width = Math.max(row.width, item.x + item.width - row.x);
    } else lines.push({ ...item });
  }
  // Detect a persistent empty vertical gutter. Wide titles remain interleaved as boundaries.
  let gutter = 0,
    best = 0;
  for (let x = pageWidth * 0.3; x < pageWidth * 0.7; x += pageWidth * 0.02) {
    const left = lines.filter((l) => l.x + l.width < x - 6);
    const right = lines.filter((l) => l.x > x + 6);
    const crossing = lines.filter((l) => l.x < x && l.x + l.width > x);
    const score = Math.min(left.length, right.length) - crossing.length * 2;
    if (left.length >= 3 && right.length >= 3 && score > best) {
      best = score;
      gutter = x;
    }
  }
  if (!gutter) return lines.sort((a, b) => b.y - a.y || a.x - b.x);
  const spanning = lines
    .filter((l) => l.x < gutter && l.x + l.width > gutter)
    .sort((a, b) => b.y - a.y);
  const output: LayoutLine[] = [];
  let top = Infinity;
  for (const boundary of [
    ...spanning,
    { text: "", x: 0, y: -Infinity, width: 0, height: 0 },
  ]) {
    const band = lines.filter(
      (l) => !spanning.includes(l) && l.y <= top && l.y > boundary.y,
    );
    output.push(
      ...band.filter((l) => l.x < gutter).sort((a, b) => b.y - a.y),
      ...band.filter((l) => l.x >= gutter).sort((a, b) => b.y - a.y),
    );
    if (boundary.text) output.push(boundary);
    top = boundary.y;
  }
  return output;
}
