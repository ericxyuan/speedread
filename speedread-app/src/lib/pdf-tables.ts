import type { TextItem } from "./layout";
export interface GeometricTable {
  items: TextItem[];
  original: string;
  cleaned: string;
  readable: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}
/** Conservative detection: aligned cells, at least two numeric data rows and a
 * short, non-numeric header row. Prose columns do not meet the data-cell gate. */
export function extractPdfTables(items: TextItem[]): {
  items: TextItem[];
  tables: GeometricTable[];
} {
  const rows: { y: number; cells: TextItem[] }[] = [];
  for (const item of [...items]
    .filter((i) => i.str.trim())
    .sort(
      (a, b) =>
        b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4],
    )) {
    let row = rows.find((r) => Math.abs(r.y - item.transform[5]) < 3);
    if (!row) {
      row = { y: item.transform[5], cells: [] };
      rows.push(row);
    }
    row.cells.push(item);
  }
  const used = new Set<TextItem>();
  const tables: GeometricTable[] = [];
  for (let i = 0; i < rows.length - 2; i++) {
    const header = rows[i];
    const count = header.cells.length;
    if (
      count < 2 ||
      count > 8 ||
      header.cells.some(
        (c) => c.str.trim().split(/\s+/).length > 4 || /\d|[.!?]/.test(c.str),
      )
    )
      continue;
    const body: typeof rows = [];
    for (let j = i + 1; j < rows.length; j++) {
      const r = rows[j],
        previous = rows[j - 1];
      if (
        previous.y - r.y > 40 ||
        r.cells.length !== count ||
        !r.cells.every(
          (c, k) =>
            Math.abs(c.transform[4] - header.cells[k].transform[4]) < 18,
        ) ||
        !r.cells.some((c) => /^[\p{Sc}−+\-]?\d/u.test(c.str.trim()))
      )
        break;
      body.push(r);
    }
    if (body.length < 2) continue;
    const all = [header, ...body];
    const cells = all.flatMap((r) => r.cells);
    if (cells.some((c) => used.has(c))) continue;
    cells.forEach((c) => used.add(c));
    const x = Math.min(...cells.map((c) => c.transform[4])),
      right = Math.max(...cells.map((c) => c.transform[4] + c.width));
    const y = header.y;
    const original = all
      .map((r) => r.cells.map((c) => c.str.trim()).join(" | "))
      .join("\n");
    const readable = count <= 5;
    const cleaned = readable
      ? body
          .map(
            (r) =>
              `${r.cells[0].str.trim()} — ${r.cells
                .slice(1)
                .map(
                  (c, k) =>
                    `${header.cells[k + 1].str.trim()}: ${c.str.trim()}`,
                )
                .join("; ")}.`,
          )
          .join("\n")
      : original;
    tables.push({
      items: cells,
      original,
      cleaned,
      readable,
      x,
      y,
      width: right - x,
      height: header.y - body.at(-1)!.y + 12,
    });
    i += body.length;
  }
  return { items: items.filter((i) => !used.has(i)), tables };
}
