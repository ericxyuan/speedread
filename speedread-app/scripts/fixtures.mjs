import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
} from "docx";
import { writeFileSync, mkdirSync } from "node:fs";
import * as CFB from "cfb";
mkdirSync("e2e/fixtures", { recursive: true });
const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
for (let p = 1; p <= 2; p++) {
  const page = pdf.addPage([600, 800]);
  page.drawText("Running report title", { x: 40, y: 775, size: 10, font });
  page.drawText("A clear heading", { x: 40, y: 730, size: 22, font });
  for (let i = 0; i < 4; i++) {
    page.drawText(`Left column ${p} line ${i + 1}. Meaningful prose.`, {
      x: 40,
      y: 680 - i * 25,
      size: 11,
      font,
    });
    page.drawText(`Right column ${p} line ${i + 1}. More findings.`, {
      x: 330,
      y: 680 - i * 25,
      size: 11,
      font,
    });
  }
  page.drawText("Figure 3: Annual rainfall", { x: 40, y: 200, size: 11, font });
  page.drawText("Figure 3 demonstrates that rainfall increased.", {
    x: 40,
    y: 150,
    size: 11,
    font,
  });
  page.drawText(String(p), { x: 290, y: 20, size: 10, font });
}
writeFileSync("e2e/fixtures/columns.pdf", await pdf.save());
const doc = new Document({
  sections: [
    {
      children: [
        new Paragraph({
          text: "An accurate Word document",
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph("The important argument remains in the reading stream."),
        new Table({
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                new TableCell({ children: [new Paragraph("Country")] }),
                new TableCell({ children: [new Paragraph("Population")] }),
              ],
            }),
            ...["France|68 million", "Germany|84 million"].map(
              (row) =>
                new TableRow({
                  children: row
                    .split("|")
                    .map(
                      (text) =>
                        new TableCell({ children: [new Paragraph(text)] }),
                    ),
                }),
            ),
          ],
        }),
      ],
    },
  ],
});
writeFileSync("e2e/fixtures/document.docx", await Packer.toBuffer(doc));
writeFileSync(
  "e2e/fixtures/notes.txt",
  "A plain text reading.\n\nThere are 12,500 km to travel. Preserve the author’s ideas.",
);
writeFileSync(
  "e2e/fixtures/notes.md",
  "# A Markdown heading\n\n**Meaningful** text with a [reference](https://example.com).\n\nFigure 3: A caption\n\nFigure 3 demonstrates an important result.",
);
writeFileSync(
  "e2e/fixtures/safe.html",
  "<html><body><nav>Unwanted navigation</nav><script>window.EXECUTED=true</script><h1>HTML heading</h1><p>A safe paragraph survives.</p><table><tr><th>Country</th><th>Population</th></tr><tr><td>France</td><td>68 million</td></tr><tr><td>Germany</td><td>84 million</td></tr></table></body></html>",
);
const text = "A genuine legacy Word file.\rSecond paragraph remains.\r";
const bytes = new Uint8Array(1024);
const v = new DataView(bytes.buffer);
v.setUint16(0, 0xa5ec, true);
v.setUint32(0x4c, text.length, true);
v.setUint32(0x1a2, 0, true);
v.setUint32(0x1a6, 21, true);
bytes.set(new TextEncoder().encode(text), 512);
const table = new Uint8Array(21);
const t = new DataView(table.buffer);
table[0] = 2;
t.setUint32(1, 16, true);
t.setUint32(9, text.length, true);
t.setUint32(15, 0x40000000 + 1024, true);
const c = CFB.utils.cfb_new();
CFB.utils.cfb_add(c, "WordDocument", bytes);
CFB.utils.cfb_add(c, "0Table", table);
writeFileSync("e2e/fixtures/legacy.doc", CFB.write(c, { type: "buffer" }));
console.log("Synthetic source fixtures generated.");
