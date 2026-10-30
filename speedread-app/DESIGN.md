# Speedread design contract

Speedread is a reading tool. The reader succeeds by understanding source material, correcting an extraction and keeping a comfortable pace. The primary interface is the current word, not a marketing page.

The user explicitly chose the Apple design guidance in Fluidity. Use native system typography, a calm dark canvas, clear hierarchy, compact controls, measured spacing and materials that explain a floating layer. Make focus and pressed state immediate. Word replacement is instantaneous. The speed colour transition remains 400 ms because the original brief specifically requests a continuous colour change; reduced motion removes it.

## Hierarchy and tokens

- Primary: add material, inspect extracted text, start or resume reading, the active word.
- Supporting: progress, pace, nominal/effective WPM, source identity and per-character pinyin.
- Contextual: filtering details, source bounds, typography settings, library management.

Extend the existing CSS variables: `--accent`, `--muted`, `--dim`, `--line`, `--surface`. The six pace colours are an explicit product requirement; do not replace them with one fixed brand hue. The original reader glow is also explicit and optional. Keep translucency limited to floating controls and focus-isolating overlays. Use solid fallbacks and respect reduced transparency and forced colours.

System UI is the default English font. PingFang SC and Microsoft YaHei are Chinese fallbacks. Pinyin uses Latin system glyphs with tone marks. Each Han character owns a separate annotation cell; the annotation centre must match the character centre within one CSS pixel. Character annotations must not drift when an anchor changes or a long word scales. Keep whole Chinese words such as 可以 together.

## Review guidance

Fluidity supplies the interaction and motion policy. Impeccable and UI Craft supply the Operate/Read review, responsive and typography checks. Taste supplies product-specific hierarchy and meaningful control choices. Antislop, Unslop, the writing skill and Shuorenhua keep interface copy factual and direct. Attention Span guides concise status reports. Auteur's relevant consistency and verification principles may inform review; its cinematic rebuild workflow does not apply to this existing reading tool.

These skills edit the app's interface and documentation. They must never rewrite, summarise, simplify or stylistically filter imported authors' prose. Extraction decisions remain reversible. Pinyin is computed with phrase context, and users can correct ambiguous pronunciations without editing the source text.

Every meaningful change must retain file ingestion, review, restoration, editing, persistence, timing, backwards navigation, source review, touch/keyboard input and reduced-motion behaviour. Verify the rendered app at desktop and constrained widths. A successful build is not a claim of universal document accuracy or physical mobile qualification.
