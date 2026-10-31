# Speedread checkpoint

Workspace: `C:\Users\admin\iCloudDrive\Speedread`. App: `speedread-app`. GitHub: `https://github.com/ericxyuan/speedread`. Live Site: `https://speedread.ericxyuan.chatgpt.site` (private, owner-only). Sites project: `appgprj_6ae4f4222af08191898caecebe55bbb9`; manifest: `speedread-app/.openai/hosting.json`.

**Status: published.** The regular-pacing build is saved as **version 5** and deployed successfully. No implementation or publication work remains.

## Published state

- Live URL: `https://speedread.ericxyuan.chatgpt.site`
- Saved version: **5** — `appgprj_6ae4f4222af08191898caecebe55bbb9~appgver_e1cdddcf5b448191be25c688c5f5aca2`
- Deployment: `appgdep_6ae53189c9dc819185c18e3dfcb8e10d`, status `succeeded`, deployed 2026-10-31 00:08:54 UTC
- Site source commit: `0a777110763dcf3afe1e951bd520c09851185206` (authored by `ericxyuan`)
- GitHub code commit: `92dd937` "Keep RSVP pacing independent of word length", force-pushed to `origin/main` as `ericxyuan`
- Audience: unchanged `custom`, only the owner account; no external visitors
- Release archive: `.sites-runtime/speedread-release-2026-10-30-regular-timing-site.tar.gz`, **65,446,448 bytes**, SHA-256 `3f82e35f1b5e12e3f10273f77363ea3abe78142aa1472a74e220f37b66b9a0a4`, 208 files, largest 20,159,757 bytes
- Hosted source checkout: `.sites-runtime/hosted-source`, clean at `0a77711`; `dist` is ignored
- Version 4 (side controls) and version 5 (regular pacing) supersede version 3; versions 2 and 3 remain saved

## Timing change

Word length no longer affects display time. Regular timing is the default, and adaptive punctuation or paragraph-end pauses are an explicit opt-in setting. At 250 WPM every token targets 240 ms.

Live browser measurement of the deployed build, 25 intervals: average **240.3 ms**, minimum **230.2 ms**, maximum **249.1 ms**. The one-character token `a` took 241.1 ms and the thirteen-character token `distractions` took 235.1 ms, confirming no length scaling.

## Verification performed (30–31 October 2026)

Windows 11, Node 24.22.1 (Codex runtime), Microsoft Edge. `pnpm` was not on the shell's PATH, so it ran through `corepack pnpm` with the pinned 11.25.0.

| Check | Result |
| --- | --- |
| Unit suite | **346/346 passed** (14 Chinese, 69 core, 263 pinyin/lexicon) |
| Strict typecheck | `tsc -b` passed |
| Production build | Passed, 1,602 modules; `index-2cDKkYrd.js` 304.15 kB (96.95 kB gzip); OCR worker 18.14 kB |
| Browser suite | **24/24 passed** in 44.2 s on Edge, including strict playback timing |
| Live playback | 25 intervals at 250 WPM; average 240.3 ms, range 230.2–249.1 ms; long and short words equal |
| Live anonymous access | HTTP **401** (private gate intact) |
| Live authenticated access | HTTP **200**; HTML references `index-2cDKkYrd.js` and `index-jxO13Wof.css`; bundle `text/javascript`; CSS `text/css` |
| Live OCR parts | `chi_tra.parts.json` `application/json`; part1 and part2 `application/octet-stream`, 13,560,170 bytes each |
| Archive limit | No file over 25 MiB; max 20,159,757 bytes |
| Deployment status | `succeeded`, production URL returned, no failure message |

## What the app is

A private, local-first RSVP reader: React 19, strict TypeScript, Vite. PDF text and scanned pages, DOCX, legacy DOC, TXT, Markdown, HTML, images, multipage TIFF, and clipboard or drag-and-drop input. Extraction is reviewable and reversible; library, corrections and progress live in IndexedDB. OCR models, PDF CMaps and fonts are bundled, so documents never leave the device. Reading pace and display controls sit beside the import card so the main flow rarely needs vertical scrolling. See `docs/WORK_SUMMARY.md` for architecture and limitations.

## Known limitations

- Browser coverage is Edge on Windows. Real iOS/Android hardware, screen readers and other engines remain unqualified.
- Interactive OCR over the public network was not rerun after this deployment; the identical production build passed the local browser suite, and live asset and model delivery were verified over authenticated HTTP.
- The curated pinyin lexicon covers common readings, not every name, dialect or genuinely ambiguous sentence. `地方`/`東西` are deliberately left to the automatic engine; bare `睡著` is ambiguous.
- Complex multi-column layouts, sidebars, rotated text, tables without reliable headers and handwriting still need review, as documented in `README.md`.

## Heartbeat

The user requested a continuation safeguard at 10% remaining and confirmed it. Native one-time heartbeat `continue-speedread` is ACTIVE for **2026-10-31 00:48:30 London**, attached to the Codex chat, with RRULE `FREQ=DAILY;COUNT=1;BYHOUR=0;BYMINUTE=48;BYSECOND=30`. Its prompt contains project progress, remaining work and goals. Do not create a duplicate. Publication is now complete, so the heartbeat only needs to verify the recorded state.
