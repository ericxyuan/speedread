# Speedread

A private, local-first RSVP reader. Import documents, review a reversible extraction, and read one word at a time with a stable coloured anchor.

The application lives in [`speedread-app`](./speedread-app). It uses React 19, strict TypeScript and Vite. A static application keeps document processing on the device and does not need an application server, account, or API key. Next.js was unnecessary for this browser-only workload.

## Run locally

Use Node.js 22.12+ and pnpm 11.25.0 (or a compatible npm installation).

```sh
cd speedread-app
pnpm install
node scripts/prepare-assets.mjs
pnpm dev
```

Open the Local URL printed by Vite, normally `http://127.0.0.1:5173`.

The source includes OCR models and PDF support assets. `prepare-assets.mjs` restores the assets from installed packages and downloads English, simplified Chinese and traditional Chinese models only when absent. At runtime all OCR code, model data, and PDF fonts are served by Speedread itself. Document contents are never sent to an extraction service.

```sh
pnpm test
node scripts/fixtures.mjs
pnpm build
pnpm test:e2e
pnpm preview
```

The browser suite uses installed Microsoft Edge by default. Change `channel` in `playwright.config.ts` for another supported browser, or install Playwright's Chromium and remove the channel. Tests run against the production build at port 4173. The synthetic test documents contain no personal data.

With npm, substitute `npm install`, `npm run dev`, `npm test`, and `npm run build` for the corresponding pnpm commands. The committed lockfile is pnpm's; use pnpm for a reproducible install.

## What works

- PDF embedded text, geometric column ordering, page-by-page scanned PDF OCR, and selective OCR for separate image-only regions in mixed PDFs.
- DOCX structure through Mammoth; Word 97–2003 DOC main-body extraction through OLE/CFB and its real piece table.
- TXT streaming, Markdown cleanup, inert HTML extraction, PNG/JPEG/WEBP/BMP OCR, and worker-based multipage TIFF decoding and OCR.
- Text and image clipboard input, permission-denied fallback, drop anywhere, multiple files, individual processing, reordering, and combined sessions.
- Conservative, balanced and aggressive filtering. Excluded blocks, reasons, originals, source IDs, page numbers, bounds and OCR confidence remain available. Restore, edit, reprocess, download originals or export cleaned text.
- PDF page and image preview. A PDF source block is outlined on the original page when bounds are available.
- Six named speed presets and custom 100–1000 WPM, strict or adaptive pacing, nominal and estimated effective WPM, pause/resume, word/five-word/sentence seeking, timeline, fullscreen and automatic hidden-tab pause.
- Fixed anchor coordinate with variable-width glyph layout and long-token scaling. Instant word replacement, restrained speed-colour interpolation, adjustable typography, guides, glow, anchor colour, number notation and reduced-motion support.
- Chinese whole-word segmentation (for example, 可以 remains one displayed word), phrase-context pinyin and a separate annotation cell above each Han character. Simplified and traditional text retain their original characters. Pinyin can be hidden or corrected per source block, and corrections are saved with the reading.
- Searchable, bounded transcript windows (120 tokens), section navigation, reader/transcript/split views, touch swipes, keyboard controls and focused-control visibility.
- IndexedDB library, original files, extraction decisions, corrections and progress. Position saves use a small separate record rather than rewriting entire documents during playback. Rename, delete and clear all local data are available.

## Architecture

`src/lib/extraction.ts` coordinates ingestion and format adapters. `registerExtractionProvider` provides a code-level extension point for future OCR/layout providers; no cloud provider is enabled. Office conversion, TIFF decoding, OCR orchestration, PDF parsing and cleanup/tokenisation use workers. PDF pages and TIFF images are processed sequentially.

Filtering, tokenisation, geometric layout, resource checks, timing and persistence are independent modules. Blocks retain stable source identity. Tokens keep paragraph/sentence IDs and source-block links. The reader subscribes directly to a deterministic engine, so token updates do not rerender the upload/library application.

The timing engine uses `performance.now()` and deadline-based timeouts. Small timer jitter is compensated; stalls reset the next deadline. It advances exactly one token per tick and never flashes missed words to catch up. Adaptive multipliers use precedence and a 1.7 maximum, rather than multiplying pauses together. Long sessions may run slower when a device cannot sustain the requested timing; words are retained.

## Privacy and practical limits

Documents and preferences are browser-local. Storage is specific to the browser and Site origin; local development and the hosted app have separate libraries. Browser storage can be cleared or evicted. Export valuable corrected text. There is no cloud sync or cross-device backup.

No arbitrary upload-byte limit is imposed. Browser memory, IndexedDB quota, canvas dimensions and available CPU remain finite. PDF pages use bounded rasters, images have a safe dimension budget, and DOCX archives are inspected for excessive decompression before conversion. Office and TIFF containers still need to fit in memory. Very large libraries currently load full document records when opened; this is a known future optimisation.

Extraction is deterministic cleanup, not summarisation or an AI claim to understand every document:

- Complex multi-column layouts, sidebars, footnotes, text boxes, rotated text and tables can require review. Simple PDF tables with aligned header cells and numeric rows become labelled statements; ambiguous or complex relationships still need manual review. Simple HTML tables with explicit headers become labelled statements. Tables without reliable headers are retained as excluded source blocks for review.
- Mixed-PDF OCR targets separate raster regions without useful embedded text. Images overlapping a usable text layer use that layer to prevent duplication; partially overlapping or fragmented layers can require manual image import and review.
- OCR supports English, simplified Chinese with English, and traditional Chinese with English. Choose the language in Reading preferences before importing. Automatic rotation and segmentation are enabled; blurred handwriting, mathematical notation, diagrams and poor scans remain difficult. No missing words are invented. Low confidence is highlighted, but confidence is not a guarantee of accuracy.
- Chinese word boundaries use the browser's Chinese word segmenter. Pinyin is computed for the complete block before splitting words, with a traditional-character dictionary, tone marks and a curated lexicon for common polyphones, neutral tones and traditional forms (for example 還是, 乾淨 and 銀行). Correction values are normalised to lowercase pinyin, and a typed `v` is shown as `ü`. Names, dialect readings and genuinely ambiguous sentences can still require correction: open Review pinyin in the preparation screen, enter one syllable per Han character and leave the field to save. Automatic pronunciation is not a universal correctness guarantee. Chinese WPM counts segmented words, which is not directly comparable with English WPM.
- Legacy DOC supports unencrypted Word 97–2003 main-body piece tables, including Unicode pieces and Western compressed text. Other code pages, older DOC variants, fields and complex tables may need conversion to DOCX. A DOC is never passed to the DOCX parser.
- Number notation defaults to decimal-point English. Grouped numbers use spaces, and currency signs and percentages remain attached to their number, including inside Chinese text. Choose decimal-comma notation in preferences and reprocess the document when appropriate. Ambiguous identifiers and local conventions still require review.
- The transcript uses bounded windows and pagination rather than an unbounded DOM. It is not continuous scrolling virtualisation.
- Automated browser coverage is Chromium/Edge on Windows, including an emulated mobile viewport. Real iOS/Android touch feel, assistive technology, all browser engines and extreme device limits have not been qualified.

Speed is not a comprehension guarantee. The default is 250 WPM, backwards navigation is prominent, and high speeds are labelled for scanning. The anchor heuristic and adaptive timing constants are configurable interface choices, not validated scientific constants. See [Rayner et al. (2016), *So Much to Read, So Little Time*](https://doi.org/10.1177/1529100615623267).

## Next improvements

Add a larger reference corpus with human-verified reading order, improve table and sidebar segmentation, extend OCR language coverage, use lazy library metadata loading and chunked token storage for very large collections, and qualify real mobile and screen-reader use. Any future cloud analysis should be explicit opt-in and explain the transmitted content.
