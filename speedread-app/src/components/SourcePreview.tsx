import { useEffect, useRef, useState } from "react";
import type { Block, ReadingDocument } from "../types";
export function SourcePreview({
  block,
  source,
}: {
  block: Block;
  source: ReadingDocument["sources"][number];
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState(block.page ?? 1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState("Loading source…");
  const [image, setImage] = useState("");
  useEffect(() => {
    let active = true;
    let release = () => {};
    const render = async () => {
      try {
        if (/\.pdf$/i.test(source.name)) {
          const pdfjs = await import("pdfjs-dist");
          pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url,
          ).href;
          const url = URL.createObjectURL(source.blob);
          const task = pdfjs.getDocument({
            url,
            standardFontDataUrl: "/pdf/standard_fonts/",
            cMapUrl: "/pdf/cmaps/",
          });
          release = () => {
            void task.destroy();
            URL.revokeObjectURL(url);
          };
          const pdf = await task.promise;
          if (!active) return;
          setPages(pdf.numPages);
          const pdfPage = await pdf.getPage(page);
          const v = pdfPage.getViewport({ scale: 1 });
          const scale = Math.min(2, 1000 / v.width);
          const viewport = pdfPage.getViewport({ scale });
          const el = canvas.current;
          if (!el) return;
          el.width = viewport.width;
          el.height = viewport.height;
          const ctx = el.getContext("2d")!;
          await pdfPage.render({ canvas: el, canvasContext: ctx, viewport })
            .promise;
          if (block.bbox && page === block.page) {
            const [x, y, w, h] = block.bbox;
            const r = viewport.convertToViewportRectangle([x, y, x + w, y + h]);
            ctx.strokeStyle = "#e99438";
            ctx.lineWidth = 3;
            ctx.strokeRect(
              Math.min(r[0], r[2]),
              Math.min(r[1], r[3]),
              Math.abs(r[2] - r[0]),
              Math.abs(r[3] - r[1]),
            );
          }
          if (active) setStatus("");
        } else if (/\.(png|jpe?g|webp|bmp)$/i.test(source.name)) {
          const url = URL.createObjectURL(source.blob);
          release = () => URL.revokeObjectURL(url);
          if (active) {
            setImage(url);
            setStatus("");
          }
        } else if (active)
          setStatus(
            "Original text for this block. Download the file to compare its full layout.",
          );
      } catch (e) {
        if (active)
          setStatus(
            e instanceof Error
              ? e.message
              : "Unable to display the source. Download it to inspect the original.",
          );
      }
    };
    void render();
    return () => {
      active = false;
      release();
    };
  }, [source, page, block]);
  return (
    <div className="source-preview">
      {pages > 1 && (
        <label>
          Page{" "}
          <input
            aria-label="Source page"
            type="number"
            min="1"
            max={pages}
            value={page}
            onChange={(e) =>
              setPage(Math.min(pages, Math.max(1, +e.target.value)))
            }
          />{" "}
          of {pages}
        </label>
      )}
      {status && <p role="status">{status}</p>}
      {/\.pdf$/i.test(source.name) && (
        <canvas
          ref={canvas}
          aria-label={`Source page ${page}. Highlighted block: ${block.original}`}
        />
      )}{" "}
      {image && <img src={image} alt={`Original source: ${source.name}`} />}
      <blockquote>{block.original}</blockquote>
      {block.confidence < 0.8 && (
        <p className="confidence">
          Low-confidence OCR. Check every numerical value against the original.
        </p>
      )}
    </div>
  );
}
