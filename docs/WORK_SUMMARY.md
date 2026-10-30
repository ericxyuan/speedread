# Speedread — work summary

Recorded 30 October 2026. Repository `ericxyuan/speedread`, implementation commit
`82df928` (pinyin and numeric hardening) on top of `c88105e` (Chinese word
reading and character-aligned pinyin), authored by `ericxyuan`. Documentation is
in the record commit that follows.

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

## Chinese reading and the Apple-derived interface

- Chinese text is segmented into whole words with `Intl.Segmenter`; particles and
  punctuation stay attached to the word they belong to. Soft line breaks inside
  a word are joined for reading without altering the source.
- Pinyin is computed for the complete block with `pinyin-pro` 3.29.5 and
  `@pinyin-pro/data` 1.3.1, so phrase context resolves readings such as 银行
  (yín háng) and 重庆 (chóng qìng). Each Han character receives its own
  annotation cell directly above the character; alignment is independent of the
  anchor and of long-word scaling.
- Pinyin can be hidden, corrected per source block, and reset. Corrections are
  validated one syllable per Han character and persist with the reading.
  Imported author text is never rewritten.
- Simplified Chinese OCR uses the bundled local model and preserves whole words;
  the original OCR path remains available.
- Interface hierarchy, typography, materials and motion follow
  `speedread-app/DESIGN.md`, derived from Apple Human Interface Guidelines with
  Fluidity applied. Screenshots are in `docs/`.

## Hardening added in this continuation

The earlier Chinese release passed 59 tests but still had measurable reading
defects. Two probes and a curated corpus (traditional forms, polyphones, neutral
tones and numbers) exposed them; this work fixes them without changing the
automatic engine's broad behaviour.

- **Curated phrase lexicon** (`src/lib/pinyin-lexicon.ts`): longest-first entries
  for common polyphones, neutral tones and traditional variants, including
  還是/还 of 是 (hái shì), 乾淨 (gān jìng), 著火 (zháo huǒ), 瞭解 (liǎo jiě),
  學生 (xué sheng), 朋友 (péng you), 時候 (shí hou) and 得 complements. A phrase
  claims only its own character positions, so a shorter match cannot overwrite a
  longer word. User corrections are applied afterwards and always win.
- **還/还 context rule**: `hái` by default, `huán` before return-object
  characters (錢/款/書/給/原/…) or after return verbs (歸/償/返/退/…), with
  explicit phrases for exceptions such as 還以顏色. This covers unlisted
  contexts like 天氣還冷 instead of relying on a finite word list.
- **Stricter override validation** (`src/lib/pinyin-validation.ts`): a pinyin
  syllable must have a legal structure and tone marks must sit on the right
  vowel; `hello`, `abc` and `haǒ` are rejected, neutral tones and `v` for `ü`
  are accepted. Valid corrections are normalised to lowercase with `ü` for
  display.
- **Chinese numeric tokenisation** (`src/lib/tokenisation.ts`): currency signs
  prefix their number (US$12.50, ¥1,200, €30), decimal and thousands fragments
  rejoin (3.14, 12,500), percent signs remain attached (25%, 12,500%。), and the
  grouping handles Chinese punctuation.
- **Tests**: 285 new unit tests (lexicon readings and longest-match behaviour,
  traditional forms, 還 contexts, validation edge cases, currency/percent,
  anchor boundaries, adaptive precedence, scheduler seek/restart/clamp, number
  formats) plus a production browser test asserting 還是/還冷 reach the reader
  with corrected readings.

## Verification performed

Windows 11, Node 24.22.1 (the Codex runtime; `pnpm` is not on this shell's PATH,
so commands ran through Node), Microsoft Edge.

| Check | Command | Result |
| --- | --- | --- |
| Unit tests | `node node_modules/vitest/vitest.mjs run` | **344/344 passed** (14 Chinese, 67 core, 263 pinyin/lexicon) |
| Typecheck | `node node_modules/typescript/bin/tsc -b` | Passed |
| Production build | `node node_modules/vite/bin/vite.js build` | Passed, 1,602 modules, 96.91 kB gzip main bundle (`index-DFWIjKEX.js`) |
| Browser suite | `node node_modules/@playwright/test/cli.js test` (Edge, production preview) | **22/22 passed**, including 1440 px and 390 px alignment, correction persistence, simplified Chinese OCR and the new traditional-reading test |
| Strict 500 WPM | timing assertion in `e2e/app.spec.ts` | 120.2 ms/token over 16 intervals |
| Hosted-source refresh | Site source helper | 16 modified, 12 new paths; same project ID |
| Release archive | prepared for Sites | 65,445,379 bytes, SHA-256 `537a60bbfd475593fe08ec834c97cc9db214bc617a378c4904f2c434c5473466` |

An earlier Linux Chromium run (59 unit / 21 browser) remains historical evidence
for the Chinese release; the Windows Edge numbers above supersede it.

## Run it locally

```
cd speedread-app
pnpm install
node scripts/prepare-assets.mjs   # vendors OCR models, CMaps and fonts into public/
pnpm dev                          # http://127.0.0.1:5173
```

`pnpm test`, `pnpm build` and `pnpm test:e2e` run the unit suite, the strict
typecheck plus production build, and the Edge browser suite. The browser suite
needs Microsoft Edge installed. Full user instructions are in
[speedread-app/README.md](speedread-app/README.md).

## Hosting status

The app targets ChatGPT Sites: `speedread-app/.openai/hosting.json` points at
project `appgprj_6ae4f4222af08191898caecebe55bbb9`; the Site is private at
`https://speedread.ericxyuan.chatgpt.site` behind a 401 sign-in gate.

**Publication of this hardened build is still outstanding.** The last confirmed
deployment is version 1, the pre-Chinese build. The refreshed source and the
archive above are staged in git-ignored `.sites-runtime/`. Publication requires
the ChatGPT Sites connector: Freebuff has no connector for it, and deploying to
Freebuff Sites would change the URL and break the existing private audience and
library data. Codex's account usage limit resets at 31 October 2026, 00:45, after
which the handoff prompt in `RESUME_SPEEDREAD.md` completes the publish and
records the source commit, version and deployment IDs.

## Not verified

- The live deployment itself. The 401 gate prevents reading the served bundle,
  so "hosted and private" is verified, but which version it serves is not.
- Real iOS/Android hardware, screen readers and browsers other than Edge and
  Chromium.
- Universal polyphone, name and dialect accuracy. The lexicon is curated, not
  exhaustive; ambiguous words such as 地方 and 東西 are intentionally left to the
  automatic engine.
- Complex multi-column layouts, sidebars, rotated text, tables without reliable
  headers and handwriting, as documented in the README.
