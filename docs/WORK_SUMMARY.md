# Speedread — work summary

Recorded 30 October 2026. Repository `ericxyuan/speedread`, commit
`322c72408d6dc848728ad290f1606e029ab7bc4c` ("Add Chinese word reading and
character-aligned pinyin").

## What the project is

`speedread-app` is a private, local-first RSVP reader built with React 19, strict
TypeScript and Vite. Documents are extracted and read entirely in the browser:
PDF text and scanned pages, DOCX through Mammoth, Word 97–2003 DOC through its
piece table, TXT, Markdown, HTML, images, multipage TIFF, and clipboard or
drag-and-drop input. Extraction is reviewable and reversible; the library,
corrections and reading progress live in IndexedDB. OCR models, PDF character
maps and fonts are served by the app itself, so no document is sent to a
service.

The reader provides six speed presets plus 100–2000 WPM, strict or adaptive
timing, a fixed anchor with variable-width glyph layout, transcript search and
section jumps, keyboard and touch controls, fullscreen, and reduced-motion
support.

## The Chinese and Apple-design extension

- Chinese text is segmented into whole words with `Intl.Segmenter`; particles
  and punctuation stay attached to the word they belong to, and soft line
  breaks inside a word are joined for reading without altering the source.
- Pinyin is computed for the complete block with `pinyin-pro` and its
  traditional-character dictionary, so phrase context resolves readings such as
  银行 (yín háng) and 重庆 (chóng qìng). Each Han character receives its own
  annotation cell directly above the character; alignment is independent of the
  anchor and of long-word scaling.
- Pinyin can be hidden, corrected per source block, and reset to automatic.
  Corrections are validated one syllable per Han character and persist with the
  reading. Imported author text is never rewritten.
- Simplified Chinese OCR uses the bundled local model and preserves whole words;
  the original OCR path remains available. Interface hierarchy, typography,
  materials and motion follow the recorded Apple-derived design contract in
  `speedread-app/DESIGN.md`.

## Verification performed in this continuation

Environment: Linux cloud workspace, Node 24.21.0, pnpm 11.25.0 via Corepack,
frozen lockfile unchanged.

| Check | Command | Result |
| --- | --- | --- |
| Dependency restore | `corepack pnpm install --frozen-lockfile` | Passed, no lockfile change |
| Unit tests | `corepack pnpm test` | 59/59 passed (45 core, 14 Chinese) |
| Typecheck and production build | `corepack pnpm build` (`tsc -b && vite build`) | Passed |
| Git state | `git rev-parse HEAD`, `git log origin/main...HEAD` | `322c724` equals `origin/main`; no local modifications |

The production build emits `dist/` with bundled workers for OCR, PDF, Office,
TIFF and pipeline processing.

## Not verified in this environment

- The Playwright suite uses `channel: "msedge"`, and this Linux workspace has
  neither Edge nor Playwright Chromium installed. The suite was therefore not
  re-run here; the recorded result from the Windows host is 21 passing tests
  (20 declarations, one parameterised over 1440 px and 390 px).
- Real iOS/Android hardware, assistive technology and browsers other than
  Chromium/Edge remain unqualified, as stated in the README.
- Universal polyphone accuracy and every document layout are not claimed.

## Hosting status

The app is configured for ChatGPT Sites in `speedread-app/.openai/hosting.json`
with project ID `appgprj_6ae4f4222af08191898caecebe55bbb9` and static output
directory `dist`. That hosting and its source helper are not available from this
Linux cloud workspace, and no Freebuff Sites project exists for Speedread, so no
deployment was attempted and no new public site was created.

Remaining action, on the original host that owns the private Site:

1. `corepack pnpm install --frozen-lockfile && corepack pnpm build`.
2. Publish `speedread-app/dist` to project
   `appgprj_6ae4f4222af08191898caecebe55bbb9` with the Sites source helper and
   fresh source credentials, preserving the existing audience and library data.
3. Record the resulting source and deployment IDs here.

## Continuation state

Authorised implementation work is complete and the verified commit is on
GitHub. No application code was changed in this continuation; it added this
summary and refreshed the checkpoint in `RESUME_SPEEDREAD.md`. Reproduction steps
are in the root `README.md`.
