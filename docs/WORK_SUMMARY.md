# Speedread — work summary

Recorded 30 October 2026. Repository `ericxyuan/speedread`. Code commit
`03a8224` ("Split traditional OCR model for Sites file limits") is on
`origin/main`; the record commit follows it. Both were force-pushed as
`ericxyuan`. The private Site is live at
`https://speedread.ericxyuan.chatgpt.site`.

## Published release

| Item | Value |
| --- | --- |
| Sites project | `appgprj_6ae4f4222af08191898caecebe55bbb9` |
| Saved version | **3** — `appgprj_6ae4f4222af08191898caecebe55bbb9~appgver_76fbd90ab6bc8191a832000421bae114` |
| Deployment | `appgdep_6ae523c671c88191a9aaf161976ed06b` — `succeeded` |
| Site source commit | `429155a649d1b7b06d812ecb3951f23d06253396` |
| Audience | `custom`, owner account only; unchanged |
| Release archive | `.sites-runtime/speedread-release-2026-10-30-hardened.tar.gz` |
| Archive size / SHA-256 | 65,446,370 bytes / `c2914bcd50896b52a58cdb9648da759f2b25feda1e795be598a7f23004e0bed6` |
| Archive files | 208, largest 20,159,757 bytes |

Version 2 was saved but failed because a single deployment file exceeded the
Sites 25 MiB limit. Version 3 is the successful replacement.

## What the project is

`speedread-app` is a private, local-first RSVP reader built with React 19, strict
TypeScript and Vite. Incoming images, PDFs, DOCX/DOC, TXT, Markdown, HTML,
multipage TIFF and clipboard or drag-and-drop text are extracted and read
entirely in the browser. Extraction is reviewable and reversible; the library,
corrections and reading progress live in IndexedDB. OCR models, PDF character
maps and fonts are served by the app itself, so no document is sent to a
service.

The reader provides six speed presets plus 100–2000 WPM, strict or adaptive
timing, a fixed anchor with variable-width glyph layout, backwards navigation,
transcript search and section jumps, source preview, keyboard and touch
controls, fullscreen and reduced-motion support.

## Chinese reading

- Chinese text is segmented into whole words with `Intl.Segmenter`; particles and
  punctuation stay attached to the word they belong to. Soft line breaks inside
  a word are joined for reading without altering the source.
- Pinyin is computed for the complete block with `pinyin-pro` 3.29.5 and
  `@pinyin-pro/data` 1.3.1, so phrase context resolves readings such as 银行
  (yín háng) and 重庆 (chóng qìng). Each Han character receives its own
  annotation cell directly above the character; alignment is independent of the
  anchor and of long-word scaling.
- A curated phrase lexicon fixes common polyphones, neutral tones and traditional
  forms (還是, 乾淨, 著火, 瞭解, 學生, 得 complements and others), with a 還
  context rule for `hái`/`huán`. User corrections are applied last and always
  win.
- Pinyin can be hidden, corrected per source block, and reset. Corrections are
  validated one syllable per Han character and persist with the reading.
- Simplified and traditional Chinese OCR use bundled local models and preserve
  whole words; the original OCR path remains available.
- Interface hierarchy, typography, materials and motion follow
  `speedread-app/DESIGN.md`, derived from Apple Human Interface Guidelines with
  Fluidity applied.

## The Sites file-limit fix

The traditional Chinese model, `chi_tra.traineddata.gz`, was 27,120,340 bytes.
Sites rejects any single deployment file over 26,214,400 bytes (25 MiB), so
version 2 failed with:

```
Invalid manifest: file size of 27120340 exceeds 26214400 limit
```

The fix has three parts:

1. `scripts/split-dist-ocr.mjs` runs after `vite build`. It partitions
   `dist/ocr/chi_tra.traineddata.gz` into two 13,560,170-byte parts, writes
   `chi_tra.parts.json`, removes the oversized original from `dist`, and leaves
   the source copy in `public/ocr` intact for local development.
2. `src/lib/ocr-model-cache.ts` fetches the manifest and parts, joins them,
   validates the gzip header on the assembled result, and writes the joined gzip
   to the same IndexedDB `keyval-store`/`keyval` entry (`./chi_tra.traineddata`)
   that Tesseract reads before requesting a language.
3. `src/workers/ocr.worker.ts` calls that cache preparation before creating the
   Tesseract worker when `chi_tra` is selected. Local development without a
   manifest falls back to the original `.gz`.

The largest deployed file is now `chi_sim.traineddata.gz` at 20,159,757 bytes.
`package.json` `build` is `tsc -b && vite build && node scripts/split-dist-ocr.mjs`.

## Verification performed

Windows 11, Node 24.22.1 (Codex runtime), Microsoft Edge. `pnpm` was not on this
shell's PATH, so commands ran through Node directly.

| Check | Result |
| --- | --- |
| Unit tests | **344/344 passed** (14 Chinese, 67 core, 263 pinyin/lexicon) |
| Strict typecheck | `tsc -b` passed |
| Production build | Passed, 1,602 modules; `index-C3IX9uzI.js` 304.06 kB (96.91 kB gzip); OCR worker 18.14 kB |
| Browser suite | **23/23 passed** in 49.3 s, including 1440 px and 390 px alignment, traditional readings, correction persistence, simplified OCR and the new traditional OCR reassembly test |
| Traditional cache | Test asserts 27,120,340 bytes at `./chi_tra.traineddata` after OCR |
| Strict 500 WPM | **120.0 ms/token** over 16 intervals |
| Archive limit | No entry over 25 MiB; max 20,159,757 bytes |
| Live anonymous access | **401**; private gate intact |
| Live authenticated access | **200** with `OAI-Sites-Authorization`; new bundle referenced; manifest `application/json`; part1 `application/octet-stream`, 13,560,170 bytes; bundle `text/javascript` |
| Deployment status | `succeeded`, production URL returned, no failure message |

The traditional OCR test generates an image under `test-results/`, selects
`eng+chi_tra`, prepares the reading, verifies extracted text contains 中文, and
checks the cache byte length. Generated PDF fixtures were restored afterwards.

## Run it locally

```
cd speedread-app
pnpm install
node scripts/prepare-assets.mjs   # vendors OCR models, CMaps and fonts into public/
pnpm dev                          # http://127.0.0.1:5173
```

`pnpm test`, `pnpm build` and `pnpm test:e2e` run the unit suite, the strict
typecheck plus production build (including the OCR split), and the Edge browser
suite. The browser suite needs Microsoft Edge installed. Full user instructions
are in [speedread-app/README.md](speedread-app/README.md).

## Not verified

- Interactive OCR over the public network. The live Site is owner-private; the
  HTML, JS, manifest and first model part were verified over authenticated HTTP,
  while the identical production build passed all 23 browser tests locally.
- Real iOS/Android hardware, screen readers and browsers other than Edge and
  Chromium.
- Universal polyphone, name and dialect accuracy. The lexicon is curated, not
  exhaustive; ambiguous words such as 地方 and 東西 are intentionally left to the
  automatic engine.
- Complex multi-column layouts, sidebars, rotated text, tables without reliable
  headers and handwriting, as documented in the README.
