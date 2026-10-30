# Speedread checkpoint

Workspace: `C:\Users\admin\iCloudDrive\Speedread`. App: `speedread-app`. GitHub: `https://github.com/ericxyuan/speedread`. Live Site: `https://speedread.ericxyuan.chatgpt.site` (private, owner-only). Sites project: `appgprj_6ae4f4222af08191898caecebe55bbb9`; manifest: `speedread-app/.openai/hosting.json`.

**Status: published.** The hardened Chinese build is saved as **version 3** and deployed successfully. No implementation or publication work remains.

## Published state

- Live URL: `https://speedread.ericxyuan.chatgpt.site`
- Saved version: **3** — `appgprj_6ae4f4222af08191898caecebe55bbb9~appgver_76fbd90ab6bc8191a832000421bae114`
- Deployment: `appgdep_6ae523c671c88191a9aaf161976ed06b`, status `succeeded`, deployed 2026-10-30 23:10 UTC
- Site source commit: `429155a649d1b7b06d812ecb3951f23d06253396` (authored by `ericxyuan`)
- Audience: unchanged `custom`, only the owner account; no external visitors
- GitHub: code commit `03a8224` "Split traditional OCR model for Sites file limits", force-pushed to `origin/main` as `ericxyuan`; this record commit follows
- Release archive: `.sites-runtime/speedread-release-2026-10-30-hardened.tar.gz`, **65,446,370 bytes**, SHA-256 `c2914bcd50896b52a58cdb9648da759f2b25feda1e795be598a7f23004e0bed6`, 208 files
- Hosted source checkout: `.sites-runtime/hosted-source`, clean at `429155a`; `dist` is ignored
- Version 2 remains saved but failed on the Sites per-file limit; version 3 supersedes it

## Deployment constraint and fix

Sites rejects any deployment file over 25 MiB. The traditional Chinese OCR model was 27,120,340 bytes, so version 2 failed with `file size of 27120340 exceeds 26214400 limit`.

The build now runs `scripts/split-dist-ocr.mjs` after Vite. It splits `dist/ocr/chi_tra.traineddata.gz` into two **13,560,170-byte** parts plus a 204-byte manifest, and removes the oversized original from `dist`. The largest deployed file is now `chi_sim.traineddata.gz` at 20,159,757 bytes.

`src/lib/ocr-model-cache.ts` joins the parts, validates the gzip header, and writes the joined gzip into the same IndexedDB `keyval-store`/`keyval` cache under `./chi_tra.traineddata` that Tesseract reads before its language request. Local development without a manifest falls back to the original `.gz`. The integrity check runs on the assembled model, not on each chunk.

## Verification performed (30 October 2026)

Windows 11, Node 24.22.1 (Codex runtime), Microsoft Edge. `pnpm` is not on this shell's PATH, so commands ran through Node directly.

| Check | Result |
| --- | --- |
| Unit suite | **344/344 passed** (14 Chinese, 67 core, 263 pinyin/lexicon) |
| Strict typecheck | `tsc -b` passed |
| Production build | Passed, 1,602 modules; `index-C3IX9uzI.js` 304.06 kB (96.91 kB gzip); OCR worker 18.14 kB |
| Browser suite | **23/23 passed**, including 1440 px and 390 px alignment, traditional readings, correction persistence, simplified OCR and the new traditional OCR reassembly test |
| Traditional model cache | Test asserts 27,120,340 bytes in `./chi_tra.traineddata` after OCR |
| Strict 500 WPM | **120.0 ms/token** over 16 intervals |
| Archive | No file over 25 MiB; `chi_tra.part1`/`part2` and manifest present |
| Live anonymous access | HTTP **401** (private gate intact) |
| Live authenticated access | HTTP **200** with `OAI-Sites-Authorization`; HTML references `index-C3IX9uzI.js`; manifest `application/json`; part1 `application/octet-stream` 13,560,170 bytes; bundle `text/javascript` |

The traditional OCR test generates its own image under `test-results/`, selects `eng+chi_tra`, and verifies extracted text, the cache size and zero external requests. Generated PDF fixtures were restored after the suite.

## What the app is

A private, local-first RSVP reader: React 19, strict TypeScript, Vite. PDF text and scanned pages, DOCX, legacy DOC, TXT, Markdown, HTML, images, multipage TIFF, and clipboard or drag-and-drop input. Extraction is reviewable and reversible; library, corrections and progress live in IndexedDB. OCR models, PDF CMaps and fonts are bundled, so documents never leave the device. See `docs/WORK_SUMMARY.md` for architecture and limitations.

## Known limitations

- The live Site is owner-private. Interactive OCR over the public network was not run; the identical production build passed all 23 browser tests locally, and the live HTML, bundle, manifest and first model part were verified over HTTP.
- Browser coverage is Edge on Windows, including an emulated 390 px viewport. Real iOS/Android hardware, screen readers and other engines remain unqualified.
- The curated pinyin lexicon covers common readings, not every name, dialect or genuinely ambiguous sentence. `地方`/`東西` are deliberately left to the automatic engine; bare `睡著` is ambiguous.
- Complex multi-column layouts, sidebars, rotated text, tables without reliable headers and handwriting still need review, as documented in `README.md`.

## Heartbeat

The user requested a continuation safeguard at 10% remaining and confirmed it. Native one-time heartbeat `continue-speedread` is ACTIVE for **2026-10-31 00:48:30 London**, attached to the Codex chat, with RRULE `FREQ=DAILY;COUNT=1;BYHOUR=0;BYMINUTE=48;BYSECOND=30`. Its prompt contains project progress, remaining work and goals. Do not create a duplicate. Publication is now complete, so the heartbeat only needs to verify the recorded state.
