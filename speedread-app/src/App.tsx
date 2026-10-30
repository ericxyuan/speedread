import { useMemo } from "react";
import { validatePinyinOverride } from "./lib/pinyin-validation";
import { SourcePreview } from "./components/SourcePreview";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Upload,
  FileText,
  Clipboard,
  Type,
  BookOpen,
  ShieldCheck,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  Check,
  SlidersHorizontal,
  Command,
  LoaderCircle,
  Trash2,
  Download,
  RotateCcw,
  Layers,
  Eye,
  AlertCircle,
  Search,
  Zap,
  HelpCircle,
} from "lucide-react";
import type { Block, ReadingDocument, Preferences, FilterMode } from "./types";
import { defaults, speedColor } from "./types";
import {
  allDocuments,
  saveDocument,
  saveProgress,
  deleteDocument,
  clearDocuments,
} from "./lib/persistence";
import { extractFile, supported, textBlocks } from "./lib/extraction";
import { processBlocks } from "./lib/pipeline";
import { effectiveWpm } from "./lib/reading-metrics";
import Reader, { AnchorWord } from "./components/Reader";
import { SpeedControl } from "./components/SpeedControl";
import { Settings } from "./components/Settings";
import { Modal } from "./components/Modal";
const sample = `The art of paying attention\n\nThere is a particular kind of quiet that arrives when you give one thing your full attention. The distractions do not disappear. You simply stop following them.\n\nReading offers a small practice in that kind of focus. One sentence leads to another. An unfamiliar idea becomes a question, and the question invites you to look a little closer. The aim is not to reach the last page as quickly as possible. It is to arrive with something worth keeping.\n\nFinding your pace\n\nTry a comfortable speed first. Pause whenever you need to, or move back a sentence to revisit an idea. A faster pace can help you scan familiar material, but understanding still takes time.\n\nNumbers deserve attention too. A distance of 12,500 km is different from 12.5 km. A cost of £1,250.50 should retain its exact meaning. Good reading tools preserve those details.\n\nMake room for the words. Let the next one come to you.`;
function loadPrefs() {
  try {
    return {
      ...defaults,
      ...JSON.parse(localStorage.getItem("speedread-preferences") || "{}"),
    } as Preferences;
  } catch {
    return defaults;
  }
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function App() {
  const [prefs, setPrefs] = useState(loadPrefs);
  const [screen, setScreen] = useState<
    "home" | "prepare" | "reader" | "library"
  >("home");
  const [doc, setDoc] = useState<ReadingDocument | null>(null);
  const docRef = useRef(doc);
  docRef.current = doc;
  const [library, setLibrary] = useState<ReadingDocument[]>([]);
  const [files, setFiles] = useState<{ id: string; file: File }[]>([]);
  const [input, setInput] = useState<"files" | "text">("files");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"settings" | "help" | "clear" | null>(
    null,
  );
  const [drag, setDrag] = useState(false);
  const [preview, setPreview] = useState<"cleaned" | "excluded" | "source">(
    "cleaned",
  );
  const [filter, setFilter] = useState<FilterMode>("balanced");
  const [blockPage, setBlockPage] = useState(0);
  const [sourceBlock, setSourceBlock] = useState("");
  const [viewSource, setViewSource] = useState<Block | null>(null);
  const [libraryQuery, setLibraryQuery] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const cancellation = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("speedread-preferences", JSON.stringify(prefs));
    } catch {
      setError(
        "Preferences could not be saved because browser storage is unavailable.",
      );
    }
  }, [prefs]);
  const refresh = useCallback(() => {
    allDocuments()
      .then(setLibrary)
      .catch(() =>
        setError(
          "Your browser blocked local storage. Reading is available, but your library cannot be saved.",
        ),
      );
  }, []);
  useEffect(refresh, [refresh]);
  const persist = async (d: ReadingDocument) => {
    try {
      await saveDocument(d);
      await saveProgress(d.id, d.position);
      refresh();
    } catch {
      setError(
        "This session is ready, but it could not be saved. Your browser storage may be full. Export the cleaned text before closing.",
      );
    }
  };
  const progress = useCallback((index: number) => {
    const current = docRef.current;
    if (!current) return;
    const next = { ...current, position: index };
    docRef.current = next;
    void saveProgress(next.id, index).catch(() =>
      setError(
        "Reading progress could not be saved. Browser storage may be full.",
      ),
    );
  }, []);
  const addFiles = (incoming: File[]) => {
    setFiles((old) => [
      ...old,
      ...incoming.map((file) => ({ file, id: crypto.randomUUID() })),
    ]);
    setInput("files");
    setError("");
  };
  const paste = async () => {
    setError("");
    try {
      if (navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        let found = false;
        for (const item of items) {
          const image = item.types.find((t) => t.startsWith("image/"));
          if (image) {
            const blob = await item.getType(image);
            addFiles([
              new File(
                [blob],
                `Clipboard-${Date.now()}.${image.split("/")[1]}`,
                { type: image },
              ),
            ]);
            found = true;
          } else if (item.types.includes("text/plain")) {
            setText(await (await item.getType("text/plain")).text());
            setInput("text");
            found = true;
          }
        }
        if (!found) throw new Error("No supported text or image found.");
      } else {
        setText(await navigator.clipboard.readText());
        setInput("text");
      }
    } catch {
      setInput("text");
      setError(
        "Clipboard access is unavailable. Paste into the text box with Ctrl+V, or upload the copied file.",
      );
    }
  };
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("input,textarea,[contenteditable]") ||
        screen === "reader" ||
        busy
      )
        return;
      const incoming = Array.from(e.clipboardData?.files ?? []);
      if (incoming.length) {
        e.preventDefault();
        addFiles(incoming);
      } else {
        const value = e.clipboardData?.getData("text/plain");
        if (value) {
          e.preventDefault();
          setText(value);
          setInput("text");
          setScreen("home");
        }
      }
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [screen, busy]);
  async function prepare(
    selected = files.map((f) => f.file),
    demo: boolean | "chinese" = false,
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    const controller = new AbortController();
    cancellation.current = controller;
    try {
      let blocks: Block[] = [];
      let warnings: string[] = [];
      const sources: ReadingDocument["sources"] = [];
      if (demo || input === "text") {
        const value =
          demo === "chinese"
            ? "我们可以一起阅读中文。每个词都会完整显示，拼音位于对应汉字的上方。\n\n银行行长来到重庆，重新阅读这份报告。音乐让人快乐，学习需要耐心。\n\n你可以随时暂停，返回上一句，或者调整阅读速度。"
            : demo
              ? sample
              : text;
        if (!value.trim()) throw new Error("Add some text to begin.");
        const id = crypto.randomUUID();
        blocks = textBlocks(
          value,
          demo ? "A little room to focus" : "Pasted text",
          id,
        );
        blocks = blocks.map((b, i) => ({
          ...b,
          type:
            i === 0 || b.original === "Finding your pace" ? "heading" : b.type,
        }));
        sources.push({
          id,
          name: demo ? "Sample.txt" : title || "Pasted text.txt",
          blob: new Blob([value], { type: "text/plain" }),
        });
      } else {
        if (!selected.length) throw new Error("Choose a file to begin.");
        for (let i = 0; i < selected.length; i++) {
          setStatus(`File ${i + 1} of ${selected.length}`);
          const result = await extractFile(
            selected[i],
            controller.signal,
            setStatus,
            prefs.ocrLanguage,
          );
          blocks.push(...result.blocks);
          warnings.push(...result.warnings);
          sources.push({
            id: result.blocks[0].sourceId,
            name: selected[i].name,
            blob: selected[i],
          });
        }
      }
      blocks = blocks.map((b, order) => ({ ...b, order }));
      setStatus("Filtering content and preparing reading session");
      const result = await processBlocks(
        blocks,
        filter,
        controller.signal,
        prefs.numericLocale,
      );
      if (!result.tokens.length)
        throw new Error(
          "There is no readable text after filtering. Try conservative mode or another document.",
        );
      const now = Date.now();
      const next: ReadingDocument = {
        id: crypto.randomUUID(),
        title:
          demo === "chinese"
            ? "中文阅读练习"
            : demo
              ? "A little room to focus"
              : input === "text"
                ? title.trim() || "Untitled reading"
                : selected.length === 1
                  ? selected[0].name.replace(/\.[^.]+$/, "")
                  : `${selected[0].name.replace(/\.[^.]+$/, "")} + ${selected.length - 1}`,
        format:
          demo || input === "text"
            ? "TEXT"
            : selected.length > 1
              ? "COLLECTION"
              : selected[0].name.split(".").pop()!.toUpperCase(),
        blocks: result.blocks,
        tokens: result.tokens,
        position: 0,
        created: now,
        opened: now,
        mode: filter,
        sources,
        warnings: [...new Set(warnings)],
      };
      setDoc(next);
      setPreview("cleaned");
      setBlockPage(0);
      setScreen("prepare");
      await persist(next);
    } catch (e) {
      if (controller.signal.aborted)
        setStatus("Processing cancelled. Your files are ready to try again.");
      else
        setError(
          e instanceof Error
            ? e.message
            : "Could not process this document. Try again.",
        );
    } finally {
      setBusy(false);
      cancellation.current = null;
    }
  }
  async function reprocess(blocks: Block[], mode: FilterMode) {
    if (!doc) return;
    setBusy(true);
    setStatus("Updating extraction");
    setError("");
    const controller = new AbortController();
    cancellation.current = controller;
    try {
      const result = await processBlocks(
        blocks,
        mode,
        controller.signal,
        prefs.numericLocale,
      );
      const next = {
        ...doc,
        ...result,
        mode,
        position: Math.min(
          docRef.current?.position ?? 0,
          Math.max(0, result.tokens.length - 1),
        ),
      };
      setDoc(next);
      setFilter(mode);
      await persist(next);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof Error ? e.message : "Could not update extraction.",
        );
    } finally {
      setBusy(false);
      cancellation.current = null;
    }
  }
  const openDoc = async (d: ReadingDocument) => {
    try {
      if (
        d.blocks.some((b) => /\p{Script=Han}/u.test(b.cleaned)) &&
        !d.tokens.some((t) => t.pinyin)
      ) {
        setBusy(true);
        setStatus("Preparing Chinese word boundaries and pinyin");
        const result = await processBlocks(
          d.blocks,
          d.mode,
          undefined,
          prefs.numericLocale,
        );
        const source = d.tokens[d.position]?.sourceBlockId;
        d = {
          ...d,
          ...result,
          position: Math.max(
            0,
            result.tokens.findIndex((t) => t.sourceBlockId === source),
          ),
        };
      }
      const next = { ...d, opened: Date.now() };
      setDoc(next);
      setFilter(d.mode);
      setPreview("cleaned");
      setBlockPage(0);
      setScreen("prepare");
      await persist(next);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not open this reading.",
      );
    } finally {
      setBusy(false);
    }
  };
  const back = () => {
    if (docRef.current) setDoc(docRef.current);
    setScreen("prepare");
  };
  const displayBlocks =
    doc?.blocks.filter(
      (b) =>
        preview === "source" ||
        (preview === "excluded" ? !b.included : b.included),
    ) ?? [];
  const excluded = doc?.blocks.filter((b) => !b.included).length ?? 0;
  const pinyinByBlock = useMemo(() => {
    const pinyinByBlock = new Map<string, string[]>();
    for (const token of doc?.tokens ?? []) {
      if (token.pinyin) {
        const marks = pinyinByBlock.get(token.sourceBlockId) ?? [];
        for (let i = 0; i < token.pinyin.length; i++)
          if (/\p{Script=Han}/u.test(Array.from(token.text)[i] ?? ""))
            marks.push(token.pinyin[i] || "·");
        pinyinByBlock.set(token.sourceBlockId, marks);
      }
    }
    return pinyinByBlock;
  }, [doc?.tokens]);

  const style = {
    "--accent": speedColor(prefs.wpm),
    "--glow-opacity": prefs.glow ? prefs.glowIntensity : 0,
  } as React.CSSProperties;
  if (screen === "reader" && doc)
    return (
      <div style={style}>
        <Reader
          doc={doc}
          prefs={prefs}
          setPrefs={setPrefs}
          onExit={back}
          onProgress={progress}
          onSource={(id) => {
            back();
            setSourceBlock(id);
            setPreview("source");
            const index = doc.blocks.findIndex((b) => b.id === id);
            setBlockPage(Math.floor(Math.max(0, index) / 40));
          }}
        />
        {error && (
          <div className="reader-error" role="alert">
            {error}
            <button aria-label="Dismiss error" onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    );
  return (
    <div
      className={`app-shell ${drag ? "dragging" : ""}`}
      style={style}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDrag(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrag(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (!busy) addFiles(Array.from(e.dataTransfer.files));
        setScreen("home");
      }}
    >
      <div className="home-atmosphere" />
      <header className="app-header">
        <button
          className="brand"
          onClick={() => setScreen("home")}
          aria-label="Speedread home"
        >
          <span className="brand-mark">
            <Zap size={19} strokeWidth={2.2} />
          </span>
          speedread<span className="brand-dot">.</span>
        </button>
        <nav>
          <button
            className={screen === "library" ? "nav-selected" : ""}
            onClick={() => {
              refresh();
              setScreen("library");
            }}
          >
            <BookOpen size={16} />
            Library
            {library.length > 0 && (
              <span className="count">{library.length}</span>
            )}
          </button>
          <button
            className="nav-icon"
            title="Reading preferences"
            aria-label="Reading preferences"
            onClick={() => setModal("settings")}
          >
            <SlidersHorizontal size={17} />
          </button>
          <button
            className="nav-icon"
            title="Help and keyboard shortcuts"
            aria-label="Help and keyboard shortcuts"
            onClick={() => setModal("help")}
          >
            <HelpCircle size={18} />
          </button>
        </nav>
      </header>
      {error && (
        <div className="error-banner" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {screen === "home" && (
        <main className="home-main">
          <section className="intro">
            <h1>
              Read at your <em>pace.</em>
            </h1>
            <p>
              Upload a document or paste text, review the extraction,
              <br />
              then read one word at a time.
            </p>
            <div className="trust">
              <ShieldCheck size={15} />
              <span>Your files stay on this device.</span>
            </div>
          </section>
          <section className="import-card" aria-label="Import reading material">
            <div className="import-tabs">
              <button
                className={input === "files" ? "active" : ""}
                onClick={() => setInput("files")}
              >
                <Upload size={15} />
                Upload files
              </button>
              <button
                className={input === "text" ? "active" : ""}
                onClick={() => setInput("text")}
              >
                <Type size={16} />
                Enter text
              </button>
              <button onClick={() => void paste()}>
                <Clipboard size={15} />
                Paste
              </button>
            </div>
            {input === "files" ? (
              <>
                <button
                  className="drop-zone"
                  onClick={() => fileInput.current?.click()}
                  disabled={busy}
                >
                  <div className="upload-glyph">
                    <FileText size={25} />
                    <span>
                      <Plus size={12} />
                    </span>
                  </div>
                  <strong>Add a document to read.</strong>
                  <span>
                    Drag your files here, or <u>browse files</u>
                  </span>
                  <small>PDF, Word, text, Markdown & images</small>
                </button>
                <input
                  ref={fileInput}
                  className="visually-hidden"
                  aria-label="Upload files"
                  type="file"
                  accept={supported}
                  multiple
                  onChange={(e) => {
                    addFiles(Array.from(e.target.files ?? []));
                    e.target.value = "";
                  }}
                />
                {files.length > 0 && (
                  <div className="file-queue">
                    {files.map((f, i) => (
                      <div key={f.id} className="queue-row">
                        <FileText size={17} />
                        <div>
                          <span>{f.file.name}</span>
                          <small>{(f.file.size / 1024).toFixed(1)} KB</small>
                        </div>
                        <button
                          aria-label={`Move ${f.file.name} up`}
                          disabled={i === 0 || busy}
                          onClick={() =>
                            setFiles((old) => {
                              const a = [...old];
                              [a[i - 1], a[i]] = [a[i], a[i - 1]];
                              return a;
                            })
                          }
                        >
                          <ChevronUp size={15} />
                        </button>
                        <button
                          aria-label={`Move ${f.file.name} down`}
                          disabled={i === files.length - 1 || busy}
                          onClick={() =>
                            setFiles((old) => {
                              const a = [...old];
                              [a[i], a[i + 1]] = [a[i + 1], a[i]];
                              return a;
                            })
                          }
                        >
                          <ChevronDown size={15} />
                        </button>
                        <button
                          title="Process this file"
                          aria-label={`Process ${f.file.name}`}
                          disabled={busy}
                          onClick={() => void prepare([f.file])}
                        >
                          <ArrowRight size={16} />
                        </button>
                        <button
                          aria-label={`Remove ${f.file.name}`}
                          disabled={busy}
                          onClick={() =>
                            setFiles((old) => old.filter((x) => x.id !== f.id))
                          }
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-input">
                <input
                  aria-label="Reading title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give this reading a title (optional)"
                />
                <textarea
                  aria-label="Text to read"
                  placeholder="A thought, an article, a whole chapter…\n\nPaste or start typing here."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  spellCheck={false}
                />
                <small>
                  {text.trim()
                    ? text.trim().split(/\s+/).length.toLocaleString()
                    : 0}{" "}
                  words
                </small>
              </div>
            )}
            <div className="import-bottom">
              <span>
                <ShieldCheck size={13} />
                No account needed
              </span>
              {(files.length > 0 || input === "text") && (
                <button
                  className="primary"
                  disabled={busy || (input === "text" && !text.trim())}
                  onClick={() => void prepare()}
                >
                  {files.length > 1 && input === "files"
                    ? "Combine & prepare"
                    : "Prepare reading"}
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </section>
          <div className="sample-link">
            <span>Start with an example</span>
            <button onClick={() => void prepare([], true)} disabled={busy}>
              Try a sample
              <ArrowUpRight size={15} />
            </button>
            <button onClick={() => void prepare([], "chinese")} disabled={busy}>
              Try Chinese
              <ArrowUpRight size={15} />
            </button>
          </div>
          <section className="home-lower">
            <div className="pace-card">
              <SpeedControl
                wpm={prefs.wpm}
                onChange={(wpm) => setPrefs({ ...prefs, wpm })}
              />
            </div>
            <div className="preview-card">
              <span className="eyebrow">Reader preview</span>
              <div className="mini-reader">
                <span className="mini-guide" />
                <AnchorWord
                  text="possibility"
                  prefs={{ ...prefs, fontSize: 39 }}
                />
              </div>
              <span className="subtle">
                The highlighted letter stays centred.
              </span>
            </div>
          </section>
          {library.length > 0 && (
            <section className="recent">
              <div className="section-label">
                PICK UP WHERE YOU LEFT OFF
                <button onClick={() => setScreen("library")}>
                  View library <ArrowRight size={13} />
                </button>
              </div>
              {library.slice(0, 2).map((d) => (
                <button
                  key={d.id}
                  className="recent-document"
                  onClick={() => openDoc(d)}
                >
                  <FileText size={18} />
                  <div>
                    <strong>{d.title}</strong>
                    <span>
                      {d.tokens.length.toLocaleString()} words · {d.format}
                    </span>
                  </div>
                  <span>
                    {Math.round(
                      (d.position / Math.max(1, d.tokens.length - 1)) * 100,
                    )}
                    %
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              ))}
            </section>
          )}
        </main>
      )}
      {screen === "library" && (
        <main className="library-main">
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR SPACE</div>
              <h1>
                Reading library<span className="brand-dot">.</span>
              </h1>
              <p>Your documents and saved reading positions.</p>
            </div>
            <button className="primary" onClick={() => setScreen("home")}>
              <Plus size={16} />
              New reading
            </button>
          </div>
          <div className="library-toolbar">
            <label className="search-field">
              <Search size={16} />
              <input
                aria-label="Search library"
                placeholder="Find a reading…"
                value={libraryQuery}
                onChange={(e) => setLibraryQuery(e.target.value)}
              />
            </label>
            <button
              className="text-button"
              disabled={!library.length}
              onClick={() => setModal("clear")}
            >
              <Trash2 size={14} />
              Clear local data
            </button>
          </div>
          {library.filter((d) =>
            d.title.toLowerCase().includes(libraryQuery.toLowerCase()),
          ).length === 0 ? (
            <div className="empty-state">
              <BookOpen size={32} />
              <h2>
                {library.length
                  ? "No matching readings."
                  : "A little space for your next idea."}
              </h2>
              <p>
                {library.length
                  ? "Try another title."
                  : "Upload a document or paste some text to begin."}
              </p>
            </div>
          ) : (
            <div className="library-grid">
              {library
                .filter((d) =>
                  d.title.toLowerCase().includes(libraryQuery.toLowerCase()),
                )
                .map((d) => (
                  <article key={d.id}>
                    <div className="document-top">
                      <span>{d.format}</span>
                      <button
                        aria-label={`Delete ${d.title}`}
                        onClick={async () => {
                          await deleteDocument(d.id);
                          refresh();
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <button
                      className="document-open"
                      onClick={() => openDoc(d)}
                    >
                      <h2>{d.title}</h2>
                      <p>
                        {d.tokens.length.toLocaleString()} words ·{" "}
                        {Math.ceil(d.tokens.length / prefs.wpm)} min
                      </p>
                      <div className="library-progress">
                        <i
                          style={{
                            width: `${(d.position / Math.max(1, d.tokens.length - 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <span>
                        {d.position ? "Continue reading" : "Start reading"}
                        <ArrowUpRight size={15} />
                      </span>
                    </button>
                    <div className="document-date">
                      <span>
                        {new Date(d.opened).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      <button
                        onClick={() => {
                          const name = prompt("Rename reading", d.title);
                          if (name?.trim())
                            void persist({ ...d, title: name.trim() });
                        }}
                      >
                        Rename
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          )}
        </main>
      )}
      {screen === "prepare" && doc && (
        <main className="prepare-main">
          <button
            className="text-button back-link"
            onClick={() => {
              setScreen("home");
              refresh();
            }}
          >
            <ArrowLeft size={15} />
            New reading
          </button>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <Check size={12} />
                Extraction ready
              </div>
              <h1>{doc.title}</h1>
              <p>
                {doc.tokens.length.toLocaleString()} words <span>·</span>{" "}
                {Math.ceil(
                  doc.tokens.length /
                    effectiveWpm(doc.tokens, prefs.wpm, prefs.adaptive),
                )}{" "}
                min at your pace <span>·</span> {doc.sources.length} source
                {doc.sources.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              className="primary start-reading"
              disabled={busy || !doc.tokens.length}
              onClick={() => {
                setDoc({
                  ...doc,
                  position: docRef.current?.position ?? doc.position,
                });
                setScreen("reader");
              }}
            >
              {(docRef.current?.position ?? 0) > 0
                ? "Resume reading"
                : "Start reading"}
              <ArrowRight size={17} />
            </button>
          </div>
          {doc.position > 0 && (
            <div className="resume-notice">
              <BookOpen size={16} />
              <span>Your place is saved at word {doc.position + 1}.</span>
              <button
                onClick={() => {
                  const next = { ...doc, position: 0 };
                  setDoc(next);
                  void persist(next);
                }}
              >
                Start over
              </button>
            </div>
          )}
          <div className="preparation-grid">
            <section className="extraction-card">
              <div className="extraction-toolbar">
                <div className="segmented">
                  <button
                    className={preview === "cleaned" ? "active" : ""}
                    onClick={() => {
                      setPreview("cleaned");
                      setBlockPage(0);
                    }}
                  >
                    Reading text
                  </button>
                  <button
                    className={preview === "excluded" ? "active" : ""}
                    onClick={() => {
                      setPreview("excluded");
                      setBlockPage(0);
                    }}
                  >
                    Excluded <span>{excluded}</span>
                  </button>
                  <button
                    className={preview === "source" ? "active" : ""}
                    onClick={() => {
                      setPreview("source");
                      setBlockPage(0);
                    }}
                  >
                    Source
                  </button>
                </div>
                <button
                  title="Export cleaned text"
                  aria-label="Export cleaned text"
                  onClick={() =>
                    download(
                      new Blob(
                        [
                          doc.blocks
                            .filter((b) => b.included)
                            .map((b) => b.cleaned)
                            .join("\n\n"),
                        ],
                        { type: "text/plain" },
                      ),
                      `${doc.title}.txt`,
                    )
                  }
                >
                  <Download size={16} />
                </button>
              </div>
              <div className="preview-explanation">
                {preview === "cleaned"
                  ? "Your reading stream. Edit any block; changes save when you leave the field."
                  : preview === "excluded"
                    ? "Nothing is discarded. Restore any block to the reading stream."
                    : "Original extraction, before cleanup. Compare with each source file below."}
              </div>
              <div className="block-list">
                {displayBlocks.length === 0 && (
                  <div className="empty-state">
                    <Check size={25} />
                    <h2>Nothing excluded.</h2>
                    <p>All extracted blocks are in your reading stream.</p>
                  </div>
                )}
                {displayBlocks
                  .slice(blockPage * 40, blockPage * 40 + 40)
                  .map((b) => (
                    <article
                      key={`${b.id}:${preview}`}
                      id={b.id}
                      className={`text-block ${b.type === "heading" ? "heading-block" : ""} ${sourceBlock === b.id ? "source-highlight" : ""}`}
                    >
                      <div className="block-meta">
                        <span>
                          {b.page ? `Page ${b.page} · ` : ""}
                          {b.type}
                          {doc.sources.length > 1 ? ` · ${b.file}` : ""}
                        </span>
                        <div>
                          <button
                            title="View original source"
                            aria-label={`View source for block ${b.order + 1}`}
                            onClick={() => setViewSource(b)}
                          >
                            <Eye size={13} />
                          </button>
                          {b.confidence < 0.8 && (
                            <span className="confidence">
                              Check OCR · {Math.round(b.confidence * 100)}%
                            </span>
                          )}
                          {preview === "excluded" ? (
                            <button
                              disabled={busy}
                              onClick={() =>
                                void reprocess(
                                  doc.blocks.map((x) =>
                                    x.id === b.id
                                      ? { ...x, override: true }
                                      : x,
                                  ),
                                  doc.mode,
                                )
                              }
                            >
                              <RotateCcw size={12} />
                              Restore
                            </button>
                          ) : preview === "cleaned" ? (
                            <button
                              title="Exclude this block"
                              aria-label={`Exclude block ${b.order + 1}`}
                              disabled={busy}
                              onClick={() =>
                                void reprocess(
                                  doc.blocks.map((x) =>
                                    x.id === b.id
                                      ? { ...x, override: false }
                                      : x,
                                  ),
                                  doc.mode,
                                )
                              }
                            >
                              <X size={13} />
                            </button>
                          ) : (
                            <span
                              className={
                                b.included ? "included-label" : "excluded-label"
                              }
                            >
                              {b.included ? "Included" : "Excluded"}
                            </span>
                          )}
                        </div>
                      </div>
                      {preview === "source" ? (
                        <>
                          <p>{b.original}</p>
                          {b.original !== b.cleaned && (
                            <details>
                              <summary>Compare cleaned text</summary>
                              <p>{b.cleaned}</p>
                            </details>
                          )}
                          {b.bbox && (
                            <small className="subtle">
                              Source bounds:{" "}
                              {b.bbox.map((n) => Math.round(n)).join(", ")}
                            </small>
                          )}
                        </>
                      ) : preview === "cleaned" ? (
                        <>
                          <textarea
                            aria-label={`Edit block ${b.order + 1}`}
                            defaultValue={b.cleaned}
                            rows={Math.max(
                              2,
                              Math.min(12, Math.ceil(b.cleaned.length / 85)),
                            )}
                            disabled={busy}
                            onBlur={(e) => {
                              const value = e.target.value;
                              if (value !== b.cleaned)
                                void reprocess(
                                  doc.blocks.map((x) =>
                                    x.id === b.id
                                      ? {
                                          ...x,
                                          cleaned: value,
                                          pinyinOverride: undefined,
                                        }
                                      : x,
                                  ),
                                  doc.mode,
                                );
                            }}
                          />
                          {pinyinByBlock.has(b.id) && (
                            <details className="pinyin-review">
                              <summary>Review pinyin</summary>
                              <p className="subtle">
                                Phrase-aware pronunciation. Check names and
                                ambiguous readings; enter one syllable for each
                                Chinese character.
                              </p>
                              <input
                                key={b.pinyinOverride ?? "automatic"}
                                aria-label={`Edit pinyin for block ${b.order + 1}`}
                                defaultValue={
                                  b.pinyinOverride ??
                                  pinyinByBlock.get(b.id)?.join(" ")
                                }
                                disabled={busy}
                                onBlur={(e) => {
                                  const value = e.target.value.trim();
                                  const current =
                                    b.pinyinOverride ??
                                    pinyinByBlock.get(b.id)?.join(" ");
                                  if (value !== current) {
                                    try {
                                      validatePinyinOverride(b.cleaned, value);
                                      void reprocess(
                                        doc.blocks.map((x) =>
                                          x.id === b.id
                                            ? {
                                                ...x,
                                                pinyinOverride:
                                                  value || undefined,
                                              }
                                            : x,
                                        ),
                                        doc.mode,
                                      );
                                    } catch (error) {
                                      setError(
                                        error instanceof Error
                                          ? error.message
                                          : "Check the pinyin syllables.",
                                      );
                                    }
                                  }
                                }}
                              />
                              {b.pinyinOverride && (
                                <button
                                  className="text-button"
                                  disabled={busy}
                                  onClick={() =>
                                    void reprocess(
                                      doc.blocks.map((x) =>
                                        x.id === b.id
                                          ? { ...x, pinyinOverride: undefined }
                                          : x,
                                      ),
                                      doc.mode,
                                    )
                                  }
                                >
                                  Use automatic pinyin
                                </button>
                              )}
                            </details>
                          )}
                        </>
                      ) : (
                        <>
                          <p>{b.original}</p>
                          <small className="filter-reason">{b.reason}</small>
                        </>
                      )}
                    </article>
                  ))}
              </div>
              {displayBlocks.length > 40 && (
                <div className="block-pagination">
                  <button
                    disabled={blockPage === 0}
                    onClick={() => setBlockPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    {blockPage + 1} / {Math.ceil(displayBlocks.length / 40)}
                  </span>
                  <button
                    disabled={(blockPage + 1) * 40 >= displayBlocks.length}
                    onClick={() => setBlockPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </section>
            <aside className="preparation-options">
              <div className="option-card">
                <div className="option-title">
                  <Layers size={16} />
                  <h2>Content filtering</h2>
                </div>
                <p>
                  Extraction and cleanup. Your author’s words stay their own.
                </p>
                <label className="field-label">
                  Content filtering
                  <select
                    aria-label="Content filtering"
                    value={doc.mode}
                    disabled={busy}
                    onChange={(e) =>
                      void reprocess(doc.blocks, e.target.value as FilterMode)
                    }
                  >
                    <option value="conservative">Conservative</option>
                    <option value="balanced">Balanced</option>
                    <option value="aggressive">Aggressive</option>
                  </select>
                </label>
                <p className="subtle">
                  {doc.mode === "conservative"
                    ? "Removes clearly irrelevant page furniture."
                    : doc.mode === "balanced"
                      ? "Also filters standalone captions and graph labels."
                      : "Also filters peripheral publication details."}
                </p>
                <div className="filter-stat">
                  <Check size={14} />
                  {doc.blocks.length - excluded} blocks kept
                  <span>{excluded} to review</span>
                </div>
              </div>
              <div className="option-card">
                <SpeedControl
                  wpm={prefs.wpm}
                  onChange={(wpm) => setPrefs({ ...prefs, wpm })}
                />
                <label className="switch-row">
                  <span>
                    Adaptive timing
                    <small>
                      {effectiveWpm(doc.tokens, prefs.wpm, prefs.adaptive)}{" "}
                      estimated effective WPM
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    checked={prefs.adaptive}
                    onChange={(e) =>
                      setPrefs({ ...prefs, adaptive: e.target.checked })
                    }
                  />
                </label>
              </div>
              <div className="option-card sources">
                <div className="option-title">
                  <Eye size={16} />
                  <h2>Original files</h2>
                </div>
                {doc.sources.map((s) => (
                  <button key={s.id} onClick={() => download(s.blob, s.name)}>
                    <FileText size={15} />
                    <span>{s.name}</span>
                    <Download size={14} />
                  </button>
                ))}
                {doc.warnings.length > 0 && (
                  <details>
                    <summary>
                      {doc.warnings.length} extraction note
                      {doc.warnings.length !== 1 ? "s" : ""}
                    </summary>
                    {doc.warnings.map((w, i) => (
                      <p className="subtle" key={i}>
                        {w}
                      </p>
                    ))}
                  </details>
                )}
              </div>
            </aside>
          </div>
        </main>
      )}
      <footer className="app-footer">
        <span>
          <span className="footer-dot" />A little more focus. A little more
          understanding.
        </span>
        <button onClick={() => setModal("help")}>
          <Command size={13} />
          Keyboard shortcuts
        </button>
      </footer>
      {drag && (
        <div className="drag-overlay">
          <Upload size={36} />
          <h2>Drop to add your reading.</h2>
        </div>
      )}
      {busy && (
        <div className="processing-overlay">
          <div className="processing-card" role="status">
            <LoaderCircle className="spinner" size={24} />
            <h2>Preparing your reading</h2>
            <p>{status}</p>
            <button onClick={() => cancellation.current?.abort()}>
              Cancel processing
            </button>
          </div>
        </div>
      )}
      {viewSource && doc && (
        <Modal
          title={`Original source · ${viewSource.file}`}
          onClose={() => setViewSource(null)}
        >
          <SourcePreview
            block={viewSource}
            source={
              doc.sources.find((s) => s.id === viewSource.sourceId) ??
              doc.sources[0]
            }
          />
        </Modal>
      )}
      {modal && (
        <Modal
          title={
            modal === "settings"
              ? "Your reading preferences"
              : modal === "help"
                ? "A little help to find your flow."
                : "Clear your local data?"
          }
          onClose={() => setModal(null)}
        >
          {modal === "settings" ? (
            <Settings prefs={prefs} setPrefs={setPrefs} />
          ) : modal === "clear" ? (
            <>
              <p>
                This removes every saved document, correction and reading
                position from this browser.
              </p>
              <button
                className="danger"
                onClick={async () => {
                  await clearDocuments();
                  setLibrary([]);
                  setDoc(null);
                  localStorage.removeItem("speedread-preferences");
                  setPrefs(defaults);
                  setModal(null);
                }}
              >
                Clear all local data
              </button>
            </>
          ) : (
            <div className="help-content">
              <p>
                Upload a document, inspect the extracted words, then settle into
                a comfortable pace. Your documents are processed and saved on
                this device. No account or API key is needed. Chinese reads as
                whole words, with phrase-aware pinyin above each character.
                Review ambiguous names and edit pinyin before reading.
              </p>
              <div className="shortcut-grid">
                {[
                  ["Space", "Play / pause"],
                  ["← / →", "Previous / next word"],
                  ["Shift + ← / →", "Previous / next sentence"],
                  ["↑ / ↓", "Adjust by 10 WPM"],
                  ["R", "Restart"],
                  ["F", "Toggle fullscreen"],
                  ["Esc", "Close panels / exit fullscreen"],
                ].map(([key, label]) => (
                  <div key={key}>
                    <kbd>{key}</kbd>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <p>
                On touch screens, swipe the reading word left or right to move
                five words. Double-tap the word to pause. Controls remain
                available when focused.
              </p>
              <p>
                PDF, DOCX, DOC, TXT, Markdown, HTML, PNG, JPEG, WEBP, TIFF and
                BMP are accepted. English, simplified Chinese and traditional
                Chinese OCR run locally; choose the OCR language in preferences
                before importing. Legacy DOC extraction supports the main body
                of Word 97–2003 files; convert unsupported or encrypted files to
                DOCX.
              </p>
              <p>
                There is no file-size cap. Your browser’s memory and storage
                still set practical limits. Pages process incrementally; Word
                and TIFF containers must be loaded in memory. OCR has a safe
                image-dimension budget.
              </p>
              <p>
                Fast reading can trade comprehension for speed. Start at a
                comfortable pace and rewind freely.{" "}
                <a
                  href="https://doi.org/10.1177/1529100615623267"
                  target="_blank"
                  rel="noreferrer"
                >
                  Read the research <ArrowUpRight size={12} />
                </a>
              </p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
