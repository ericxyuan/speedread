# Speedread checkpoint

Workspace: `C:\Users\admin\iCloudDrive\Speedread`. App: `speedread-app`. GitHub: `https://github.com/ericxyuan/speedread`. Live Site: `https://speedread.ericxyuan.chatgpt.site` (private). Sites project: `appgprj_6ae4f4222af08191898caecebe55bbb9`; manifest: `speedread-app/.openai/hosting.json`.

**Status: pinyin and numeric hardening is complete and verified. Publication of the hardened build is prepared but not yet executed.** The implementation commit is `82df928` on top of `c88105e`, authored and committed by `ericxyuan`. The live Site's last recorded deployment remains version 1, the pre-Chinese build; the 401 sign-in gate prevents confirming the current live bundle. The final publish needs the ChatGPT Sites connector, which Freebuff cannot call, and Codex's account usage limit resets at **31 October 2026, 00:45**.

## Verified state — 30 October 2026

- Windows 11, Node 24.22.1 (Codex runtime), Microsoft Edge. `pnpm` was not on this shell's PATH, so commands ran through Node directly.
- `vitest run`: **344/344 passed** — `chinese.test.ts` 14, `core.test.ts` 67, `pinyin-lexicon.test.ts` 263.
- `tsc -b` and `vite build`: **passed**, 1,602 modules; production bundle `dist/assets/index-DFWIjKEX.js` (304.06 kB, 96.91 kB gzip).
- Playwright with Edge against the production build: **22/22 passed**, including Chinese alignment at 1440 px and 390 px, the new traditional-reading test, pinyin correction persistence and simplified-Chinese OCR.
- Strict 500 WPM: **120.2 ms/token** over 16 intervals.
- An earlier Linux Chromium run (59 unit / 21 browser) remains historical evidence for the Chinese release; it is superseded by the numbers above.
- 50 Codex skills remain installed in `C:\Users\admin\.codex\skills`; Fluidity is enabled at `C:\Users\admin\plugins\fluidity`.

## What the hardening changed

- Added `src/lib/pinyin-lexicon.ts`: a curated, longest-first phrase lexicon for common polyphones, neutral tones and traditional variants (`還是`, `乾淨`, `著火`, `瞭解`, `學生`, `得` complements, and others). It claims character positions so a shorter phrase cannot overwrite a longer word; user corrections are applied afterwards and always win.
- Added a 還/还 context rule: default `hái`, but `huán` before return-object characters (錢/款/書/給/原/…) or after return verbs (歸/償/返/退/…). Explicit phrases handle exceptions such as `還以顏色`.
- Replaced the permissive pinyin override check with real syllable-structure and tone-placement validation. `hello`/`abc` are rejected, `haǒ` is rejected, neutral tones and `v` for `ü` are accepted, and corrections are normalised to lowercase with `ü` for display.
- Fixed Chinese numeric tokenisation: currency signs prefix their number, decimal/thousands fragments rejoin, percent signs stay attached, and grouping works when Chinese punctuation follows (`12,500%。` → `12 500%。`).
- Added 285 unit tests and a browser test for traditional readings; expanded anchor-boundary, adaptive-timing precedence, scheduler seek/restart/clamp and number-format coverage.

## Site preparation

- `.sites-runtime/hosted-source` now mirrors the hardened source and verified build: **16 modified files and 12 new files (28 paths)**, same project ID and audience. Changes are deliberately uncommitted; the Sites workflow owns the `Update Site source` commit.
- Hardened archive: `.sites-runtime/speedread-release-2026-10-30-hardened.tar.gz`, **65,445,379 bytes**, SHA-256 `537a60bbfd475593fe08ec834c97cc9db214bc617a378c4904f2c434c5473466`. It contains the correct project manifest, `dist/assets/index-DFWIjKEX.js` and both Chinese OCR models.
- The older `speedread-release.tar.gz` (18 MB, pre-Chinese) and `speedread-release-2026-10-30-chinese.tar.gz` (the previous Chinese build) are stale for publication; do not deploy them.

## Remaining action — publish with the Sites connector

After the Codex usage limit resets, in Codex (Sites skill enabled), from `C:\Users\admin\iCloudDrive\Speedread`:

> Publish the refreshed Speedread source in `.sites-runtime/hosted-source` to the existing private Site `appgprj_6ae4f4222af08191898caecebe55bbb9`, using `.sites-runtime/speedread-release-2026-10-30-hardened.tar.gz`. Keep the current audience. Do not create a new Site.

That skill must call `get_site`, `create_source_repository_write_credential`, run the Sites source helper against the hosted-source checkout, then `save_version_and_deploy_private` with the archive. Record the returned source commit, saved version ID, deployment ID and final URL here. Do not attempt publication from Freebuff: it has no ChatGPT Sites connector, and using Freebuff Sites would change the URL and break the existing audience.

## Known limitations

- The live deployment is not verified; the Site is private behind HTTP 401, and version 1 is the last confirmed deployment.
- The curated lexicon covers common readings, not every name, dialect or genuinely ambiguous sentence. `地方`/`東西` are deliberately left to the automatic engine because their readings depend on meaning; bare `睡著` is ambiguous between `zhe` and `zháo` and is only forced in `睡著了`.
- Browser coverage is Edge on Windows, including an emulated mobile viewport. Real iOS/Android hardware, screen readers and other engines were not qualified.
- Complex multi-column layouts, sidebars, rotated text, tables without reliable headers and handwriting still need review, as documented in `README.md`.
- GitHub now contains `82df928` and this record commit; both are force-pushed from `ericxyuan`, not from a Codebuff identity.

## Heartbeat

The user requested a continuation safeguard at 10% remaining and confirmed it. Native one-time heartbeat `continue-speedread` is ACTIVE for **2026-10-31 00:48:30 London**, attached to the Codex chat, with RRULE `FREQ=DAILY;COUNT=1;BYHOUR=0;BYMINUTE=48;BYSECOND=30`. Its prompt contains project progress, remaining work and goals. Do not create a duplicate.
