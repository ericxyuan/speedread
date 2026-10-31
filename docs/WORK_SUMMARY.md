# Speedread — work summary

Recorded 31 October 2026. Repository `ericxyuan/speedread`. Code commit
`92dd937` ("Keep RSVP pacing independent of word length") is on `origin/main`
and was force-pushed as `ericxyuan`. The private Site is live at
`https://speedread.ericxyuan.chatgpt.site`.

## Published release

| Item | Value |
| --- | --- |
| Sites project | `appgprj_6ae4f4222af08191898caecebe55bbb9` |
| Saved version | **5** — `appgprj_6ae4f4222af08191898caecebe55bbb9~appgver_e1cdddcf5b448191be25c688c5f5aca2` |
| Deployment | `appgdep_6ae53189c9dc819185c18e3dfcb8e10d` — `succeeded`, 2026-10-31 00:08:54 UTC |
| Site source commit | `0a777110763dcf3afe1e951bd520c09851185206` |
| Audience | `custom`, owner account only; unchanged |
| Release archive | `.sites-runtime/speedread-release-2026-10-30-regular-timing-site.tar.gz` |
| Archive size / SHA-256 | 65,446,448 bytes / `3f82e35f1b5e12e3f10273f77363ea3abe78142aa1472a74e220f37b66b9a0a4` |
| Archive files | 208, largest 20,159,757 bytes |

Version 2 was saved but failed because a single deployment file exceeded the
Sites 25 MiB limit. Version 3 replaced it, version 4 moved the reading controls
beside the import card, and version 5 keeps display time independent of word
length.

## Regular pacing

The timer previously stretched display time for words longer than 9 and 16
characters, so longer words stayed on screen longer. That length term has been
removed from token timing. Regular timing is now the default: every token gets
the same interval at a given WPM. Punctuation and paragraph-end pauses remain
available through the opt-in **Adaptive timing** setting, but they no longer
depend on character count.

The playback engine still compensates for small timer jitter and resets its
deadline after a stall, so a backgrounded tab cannot cause a burst of words.

Live measurement of the deployed build at 250 WPM over 25 intervals: average
**240.3 ms**, minimum **230.2 ms**, maximum **249.1 ms**. The one-character word
`a` took 241.1 ms and the thirteen-character word `distractions` took 235.1 ms.

## What the project is

`speedread-app` is a private, local-first RSVP reader built with React 19, strict
TypeScript and Vite. Incoming images, PDFs, DOCX/DOC, TXT, Markdown, HTML,
multipage TIFF and clipboard or drag-and-drop text are extracted and read
entirely in the browser. Extraction is reviewable and reversible; the library,
corrections and reading progress live in IndexedDB. OCR models, PDF character
maps and fonts are served by the app itself, so no document is sent to a
service.

The reader provides six presets plus 100–1000 WPM, regular or optional adaptive
timing, a fixed anchor with variable-width glyph layout, backwards navigation,
transcript search and section jumps, source preview, keyboard and touch
controls, fullscreen and reduced-motion support. Reading pace, presets and
display settings sit beside the import card so the main flow needs little
vertical scrolling.

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

Windows 11, Node 24.22.1 (Codex runtime), Microsoft Edge, pinned pnpm 11.25.0.

| Check | Result |
| --- | --- |
| Unit tests | **346/346 passed** (14 Chinese, 69 core, 263 pinyin/lexicon) |
| Strict typecheck | `tsc -b` passed |
| Production build | Passed, 1,602 modules; `index-2cDKkYrd.js` 304.15 kB (96.95 kB gzip); OCR worker 18.14 kB |
| Browser suite | **24/24 passed** in 44.2 s, including strict playback timing |
| Live playback | 25 intervals at 250 WPM; average 240.3 ms, range 230.2–249.1 ms; long and short words equal |
| Archive limit | No entry over 25 MiB; max 20,159,757 bytes |
| Live anonymous access | **401**; private gate intact |
| Live authenticated access | **200**; HTML references `index-2cDKkYrd.js` and `index-jxO13Wof.css`; bundle `text/javascript`; CSS `text/css` |
| Live OCR delivery | Manifest `application/json`; part1 and part2 `application/octet-stream`, 13,560,170 bytes each |
| Deployment status | `succeeded`, production URL returned, no failure message |

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
are in [speedread-app/README.md](../speedread-app/README.md).

## Not verified

- Interactive OCR over the public network after this deployment. The live HTML,
  bundle and OCR parts were verified over authenticated HTTP, while the identical
  production build passed all 24 browser tests locally.
- Real iOS/Android hardware, screen readers and browsers other than Edge and
  Chromium.
- Universal polyphone, name and dialect accuracy. The lexicon is curated, not
  exhaustive; ambiguous words such as 地方 and 東西 are intentionally left to the
  automatic engine.
- Complex multi-column layouts, sidebars, rotated text, tables without reliable
  headers and handwriting, as documented in the README.
