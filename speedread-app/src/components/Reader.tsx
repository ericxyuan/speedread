import { AnnotatedText } from "./AnnotatedText";
import { SpeedInput } from "./SpeedInput";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useLayoutEffect,
} from "react";
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
  Maximize,
  Minimize,
  SlidersHorizontal,
  PanelRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  X,
  Search,
} from "lucide-react";
import { MAX_WPM, MIN_WPM } from "../types";
import type { ReadingDocument, Preferences } from "../types";
import { PlaybackEngine } from "../lib/timing";
import { anchorIndex, effectiveWpm } from "../lib/reading-metrics";
import { SpeedControl } from "./SpeedControl";
import { Settings } from "./Settings";
export function AnchorWord({
  text,
  prefs,
  pinyin,
}: {
  text: string;
  pinyin?: string[];
  prefs: Preferences;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const chars = Array.from(text);
  const i = anchorIndex(text, prefs.anchorOffset);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const left = el.querySelector(".word-before") as HTMLElement;
      const anchor = el.querySelector(".word-anchor") as HTMLElement;
      const right = el.querySelector(".word-after") as HTMLElement;
      if (left && anchor && right) {
        const needed =
          Math.max(
            left.offsetWidth + anchor.offsetWidth / 2,
            right.offsetWidth + anchor.offsetWidth / 2,
          ) * 2;
        setScale(
          Math.min(
            1,
            (Math.min(
              window.innerWidth,
              el.parentElement?.clientWidth ?? window.innerWidth,
            ) -
              40) /
              Math.max(1, needed),
          ),
        );
      }
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el.parentElement!);
    return () => obs.disconnect();
  }, [text, prefs.fontSize, prefs.fontFamily, prefs.fontWeight, prefs.spacing]);
  return (
    <div
      className={`word-stage ${pinyin && prefs.showPinyin ? "has-pinyin" : ""}`}
      aria-label={text}
      style={{
        fontSize: `clamp(28px, 8vw, ${prefs.fontSize}px)`,
        fontFamily: prefs.fontFamily,
        fontWeight: prefs.fontWeight,
        letterSpacing: prefs.spacing,
        color: prefs.textColor,
      }}
    >
      <div
        ref={ref}
        className="word-position"
        aria-hidden="true"
        style={{ transform: `translateX(-50%) scale(${scale})` }}
      >
        <span className="word-before">
          <AnnotatedText
            text={chars.slice(0, i).join("")}
            pinyin={pinyin?.slice(0, i)}
            show={prefs.showPinyin}
          />
        </span>
        <span
          className="word-anchor"
          style={{ color: prefs.anchorColor || "var(--accent)" }}
        >
          <AnnotatedText
            text={chars[i] ?? ""}
            pinyin={pinyin?.slice(i, i + 1)}
            show={prefs.showPinyin}
          />
        </span>
        <span className="word-after">
          <AnnotatedText
            text={chars.slice(i + 1).join("")}
            pinyin={pinyin?.slice(i + 1)}
            show={prefs.showPinyin}
          />
        </span>
      </div>
    </div>
  );
}
export default function Reader({
  doc,
  prefs,
  setPrefs,
  onExit,
  onProgress,
  onSource,
}: {
  doc: ReadingDocument;
  prefs: Preferences;
  setPrefs: (p: Preferences) => void;
  onExit: () => void;
  onProgress: (n: number) => void;
  onSource: (blockId: string) => void;
}) {
  const engine = useMemo(
    () => new PlaybackEngine(doc.tokens),
    [doc.id, doc.tokens],
  );
  const state = useSyncExternalStore(engine.subscribe, engine.snapshot);
  const [panel, setPanel] = useState<"transcript" | "settings" | null>(null);
  const [view, setView] = useState<"reader" | "split" | "transcript">("reader");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [immersive, setImmersive] = useState(false);
  const [idle, setIdle] = useState(false);
  const [full, setFull] = useState(!!document.fullscreenElement);
  const root = useRef<HTMLDivElement>(null);
  const lastInteraction = useRef(performance.now());
  const controls = useRef<HTMLDivElement>(null);
  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;
  useEffect(() => {
    engine.seek(doc.position);
    return () => {
      progressRef.current(engine.snapshot().index);
      engine.destroy();
    };
  }, [engine]);
  useEffect(
    () => engine.configure(prefs.wpm, prefs.adaptive),
    [engine, prefs.wpm, prefs.adaptive],
  );
  useEffect(() => {
    const save = () => progressRef.current(engine.snapshot().index);
    const timer = setInterval(save, 2000);
    window.addEventListener("pagehide", save);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", save);
    };
  }, [engine]);
  const interact = () => {
    lastInteraction.current = performance.now();
    setIdle(false);
  };
  useEffect(() => {
    const timer = setInterval(() => {
      if (
        state.playing &&
        performance.now() - lastInteraction.current > 2500 &&
        !controls.current?.contains(document.activeElement)
      )
        setIdle(true);
    }, 500);
    return () => clearInterval(timer);
  }, [state.playing]);
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await root.current?.requestFullscreen();
    } catch {
      setFull(false);
    }
  };
  useEffect(() => {
    const onChange = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden && prefs.pauseHidden) engine.pause();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, [engine, prefs.pauseHidden]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "Escape") {
        if (document.fullscreenElement) void document.exitFullscreen();
        setPanel(null);
        setImmersive(false);
        return;
      }
      if (
        el.closest(
          "input,textarea,select,[contenteditable],[role=slider],[role=combobox]",
        )
      )
        return;
      if (el.closest("button,a") && (e.key === " " || e.key === "Enter"))
        return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      let handled = true;
      interact();
      switch (e.key) {
        case " ":
          engine.toggle();
          break;
        case "ArrowLeft":
          e.shiftKey
            ? engine.sentence(-1)
            : engine.seek(engine.snapshot().index - 1);
          break;
        case "ArrowRight":
          e.shiftKey
            ? engine.sentence(1)
            : engine.seek(engine.snapshot().index + 1);
          break;
        case "ArrowUp":
          setPrefs({ ...prefs, wpm: Math.min(MAX_WPM, prefs.wpm + 10) });
          break;
        case "ArrowDown":
          setPrefs({ ...prefs, wpm: Math.max(MIN_WPM, prefs.wpm - 10) });
          break;
        case "r":
        case "R":
          engine.seek(0);
          break;
        case "f":
        case "F":
          void fullscreen();
          break;
        case "Escape":
          if (document.fullscreenElement) void document.exitFullscreen();
          setPanel(null);
          setImmersive(false);
          break;
        default:
          handled = false;
      }
      if (handled) e.preventDefault();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [engine, prefs]);
  const token = doc.tokens[state.index];
  const effective = useMemo(
    () => effectiveWpm(doc.tokens, prefs.wpm, prefs.adaptive),
    [doc.tokens, prefs.wpm, prefs.adaptive],
  );
  const remaining = useMemo(() => {
    const suffix = new Float64Array(doc.tokens.length + 1);
    for (let i = doc.tokens.length - 1; i >= 0; i--)
      suffix[i] =
        suffix[i + 1] + (prefs.adaptive ? doc.tokens[i].multiplier : 1);
    return suffix;
  }, [doc.tokens, prefs.adaptive]);
  const seconds = Math.ceil(((remaining[state.index] ?? 0) * 60) / prefs.wpm);
  const percent =
    doc.tokens.length > 1
      ? Math.round((state.index / (doc.tokens.length - 1)) * 100)
      : 0;
  const results = useMemo(
    () =>
      query
        ? doc.tokens
            .filter((t) => t.text.toLowerCase().includes(query.toLowerCase()))
            .map((t) => t.id)
        : null,
    [query, doc.tokens],
  );
  const start = results ? page * 120 : Math.floor(state.index / 120) * 120;
  const visible = results
    ? results.slice(start, start + 120).map((i) => doc.tokens[i])
    : doc.tokens.slice(start, start + 120);
  const sourceMap = useMemo(
    () => new Map(doc.blocks.map((b) => [b.id, b])),
    [doc.blocks],
  );
  const source = sourceMap.get(token?.sourceBlockId);
  const headings = useMemo(() => {
    const first = new Map<string, number>();
    for (const t of doc.tokens)
      if (!first.has(t.sourceBlockId)) first.set(t.sourceBlockId, t.id);
    const list = doc.blocks
      .filter((b) => b.type === "heading" && b.included)
      .map((block) => ({ block, index: first.get(block.id) ?? -1 }))
      .filter((h) => h.index >= 0);
    return list.map((h, i) => ({
      ...h,
      end: list[i + 1]?.index ?? doc.tokens.length,
    }));
  }, [doc.blocks, doc.tokens]);
  const touch = useRef<{ x: number; y: number } | null>(null);
  return (
    <div
      ref={root}
      className={`reader ${!state.playing ? "paused" : ""} ${(idle && state.playing) || immersive ? "hide-chrome" : ""} ${view}`}
      onPointerMove={interact}
      onClick={interact}
      style={
        {
          "--glow-opacity": prefs.glow ? prefs.glowIntensity : 0,
        } as React.CSSProperties
      }
    >
      <div className="atmosphere" />
      <header className="reader-header chrome">
        <button
          onClick={() => {
            engine.pause();
            progressRef.current(engine.snapshot().index);
            onExit();
          }}
          className="text-button"
        >
          <ArrowLeft size={16} />
          Back to document
        </button>
        <div className="reader-title">
          <span>{doc.title}</span>
          <small>
            {source?.page ? `Page ${source.page} · ` : ""}
            {doc.format} · {doc.tokens.length.toLocaleString()} words
          </small>
        </div>
        <button
          title="Hide interface"
          aria-label="Hide interface"
          onClick={() => {
            setImmersive(true);
            setPanel(null);
          }}
        >
          <EyeOff size={18} />
        </button>
      </header>
      {view !== "transcript" && (
        <div
          className={`reading-area ${token?.pinyin && prefs.showPinyin ? "has-pinyin" : ""}`}
          onTouchStart={(e) => {
            touch.current = {
              x: e.touches[0].clientX,
              y: e.touches[0].clientY,
            };
          }}
          onTouchEnd={(e) => {
            if (!touch.current) return;
            const dx = e.changedTouches[0].clientX - touch.current.x,
              dy = e.changedTouches[0].clientY - touch.current.y;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy))
              engine.seek(state.index + (dx > 0 ? -5 : 5));
            touch.current = null;
          }}
          onDoubleClick={() => engine.toggle()}
        >
          {prefs.guides && (
            <>
              <span className="anchor-guide top" />
              <span className="anchor-guide bottom" />
            </>
          )}
          <AnchorWord
            text={token?.text ?? "Ready"}
            pinyin={token?.pinyin}
            prefs={prefs}
          />
          <p className="reading-status chrome">
            {state.ended
              ? "Session complete. Take a moment to reflect."
              : state.playing
                ? ""
                : `Paused · ${state.index === 0 ? "press Space to begin" : "press Space to continue"}`}
          </p>
        </div>
      )}
      {(panel === "transcript" ||
        view === "split" ||
        view === "transcript") && (
        <aside
          className={`transcript-panel ${view === "transcript" ? "wide" : ""}`}
        >
          <div className="panel-heading">
            <h2>Transcript</h2>
            <button
              aria-label="Close transcript"
              onClick={() => {
                setPanel(null);
                setView("reader");
              }}
            >
              <X size={18} />
            </button>
          </div>
          <label className="search-field">
            <Search size={16} />
            <input
              aria-label="Search transcript"
              placeholder="Find a word…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </label>
          {headings.length > 0 && (
            <select
              aria-label="Jump to section"
              value=""
              onChange={(e) => {
                engine.pause();
                engine.seek(+e.target.value);
              }}
            >
              <option value="">Jump to section…</option>
              {headings.map((h) => (
                <option key={h.block.id} value={h.index}>
                  {h.block.cleaned} ·{" "}
                  {Math.round(
                    (Math.min(
                      h.end - h.index,
                      Math.max(0, state.index - h.index),
                    ) /
                      Math.max(1, h.end - h.index)) *
                      100,
                  )}
                  %
                </option>
              ))}
            </select>
          )}
          <p className="subtle">
            {results
              ? `${results.length} matches`
              : `Words ${start + 1}–${Math.min(start + 120, doc.tokens.length)}`}
          </p>
          <div className="transcript-words" aria-label="Static transcript">
            {visible.map((t) => (
              <button
                key={t.id}
                className={`${t.id === state.index ? "active" : ""} ${t.paragraphEnd ? "paragraph-end" : ""}`}
                aria-current={t.id === state.index ? "true" : undefined}
                onClick={() => {
                  engine.pause();
                  engine.seek(t.id);
                }}
              >
                <AnnotatedText
                  text={t.text}
                  pinyin={t.pinyin}
                  show={prefs.showPinyin}
                />
              </button>
            ))}
          </div>
          <div className="transcript-pagination">
            <button
              disabled={page === 0 && start === 0}
              onClick={() => {
                engine.pause();
                if (results) setPage((p) => Math.max(0, p - 1));
                else engine.seek(Math.max(0, start - 120));
              }}
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <button
              disabled={
                results
                  ? (page + 1) * 120 >= results.length
                  : start + 120 >= doc.tokens.length
              }
              onClick={() => {
                engine.pause();
                if (results) setPage((p) => p + 1);
                else engine.seek(start + 120);
              }}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            className="text-button"
            onClick={() => {
              engine.pause();
              progressRef.current(engine.snapshot().index);
              onSource(token?.sourceBlockId ?? "");
            }}
          >
            Review current source block ↗
          </button>
        </aside>
      )}
      {panel === "settings" && (
        <aside className="reader-settings">
          <div className="panel-heading">
            <h2>Make it yours</h2>
            <button aria-label="Close settings" onClick={() => setPanel(null)}>
              <X size={18} />
            </button>
          </div>
          <Settings prefs={prefs} setPrefs={setPrefs} />
        </aside>
      )}
      <div ref={controls} className="reader-bottom chrome" onFocus={interact}>
        <div className="playback-bar">
          <div className="control-group">
            <button
              title="Restart (R)"
              aria-label="Restart"
              onClick={() => {
                engine.pause();
                engine.seek(0);
              }}
            >
              <RotateCcw size={17} />
            </button>
            <button
              title="Previous sentence (Shift ←)"
              aria-label="Previous sentence"
              onClick={() => engine.sentence(-1)}
            >
              <SkipBack size={17} />
            </button>
            <button
              aria-label="Rewind five words"
              title="Rewind five words"
              onClick={() => engine.seek(state.index - 5)}
            >
              <Rewind size={18} />
            </button>
            <button
              aria-label="Previous word"
              title="Previous word (←)"
              onClick={() => engine.seek(state.index - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="play-button"
              aria-label={state.playing ? "Pause" : "Play"}
              title="Play or pause (Space)"
              onClick={() => engine.toggle()}
            >
              {state.playing ? (
                <Pause size={21} fill="currentColor" />
              ) : (
                <Play size={21} fill="currentColor" />
              )}
            </button>
            <button
              aria-label="Next word"
              title="Next word (→)"
              onClick={() => engine.seek(state.index + 1)}
            >
              <ChevronRight size={18} />
            </button>
            <button
              aria-label="Forward five words"
              title="Forward five words"
              onClick={() => engine.seek(state.index + 5)}
            >
              <FastForward size={18} />
            </button>
            <button
              aria-label="Next sentence"
              title="Next sentence (Shift →)"
              onClick={() => engine.sentence(1)}
            >
              <SkipForward size={17} />
            </button>
          </div>
          <span className="control-divider" />
          <div className="reader-speed">
            <SpeedInput
              label="Reader words per minute"
              wpm={prefs.wpm}
              onChange={(wpm) => setPrefs({ ...prefs, wpm })}
            />
            <span>WPM</span>
            <small>
              {prefs.adaptive ? `${effective} effective` : "Strict timing"}
            </small>
          </div>
          <div className="control-group secondary">
            <button
              title="Transcript"
              aria-label="Toggle transcript"
              aria-pressed={panel === "transcript"}
              onClick={() =>
                setPanel(panel === "transcript" ? null : "transcript")
              }
            >
              <PanelRight size={18} />
            </button>
            <button
              title="Change view"
              aria-label="Change reader view"
              onClick={() => {
                setView(
                  view === "reader"
                    ? "split"
                    : view === "split"
                      ? "transcript"
                      : "reader",
                );
                setPanel(null);
              }}
            >
              <BookOpen size={18} />
            </button>
            <button
              title="Settings"
              aria-label="Reader settings"
              onClick={() => setPanel(panel === "settings" ? null : "settings")}
            >
              <SlidersHorizontal size={18} />
            </button>
            <button
              title="Fullscreen (F)"
              aria-label="Toggle fullscreen"
              onClick={() => void fullscreen()}
            >
              {full ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
        <div className="reader-pace">
          <SpeedControl
            compact
            wpm={prefs.wpm}
            onChange={(wpm) => setPrefs({ ...prefs, wpm })}
          />
        </div>
        <div className="timeline">
          <input
            aria-label="Reading progress"
            type="range"
            min="0"
            max={Math.max(0, doc.tokens.length - 1)}
            value={state.index}
            onChange={(e) => engine.seek(+e.target.value)}
          />
          <div className="progress-meta">
            <span>
              {percent}% <i />{" "}
              {Math.min(state.index + 1, doc.tokens.length).toLocaleString()} /{" "}
              {doc.tokens.length.toLocaleString()} words
            </span>
            <span>
              {Math.floor(seconds / 60)}m {seconds % 60}s remaining
            </span>
          </div>
        </div>
      </div>
      {immersive && (
        <button
          className="restore-interface"
          onClick={() => setImmersive(false)}
        >
          Show controls
        </button>
      )}
    </div>
  );
}
