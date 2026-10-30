import type { Token } from "../types";
export interface Clock {
  now: () => number;
  set: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clear: (id: ReturnType<typeof setTimeout>) => void;
}
const realClock: Clock = {
  now: () => performance.now(),
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (id) => clearTimeout(id),
};
export class PlaybackEngine {
  private listeners = new Set<() => void>();
  private timer?: ReturnType<typeof setTimeout>;
  private due = 0;
  private remaining = 0;
  private state = { index: 0, playing: false, ended: false };
  private wpm = 250;
  private adaptive = true;
  constructor(
    public tokens: Token[],
    private clock: Clock = realClock,
  ) {}
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  snapshot = () => this.state;
  private emit() {
    this.state = { ...this.state };
    this.listeners.forEach((fn) => fn());
  }
  duration(index = this.state.index) {
    return (
      (60000 / this.wpm) *
      (this.adaptive ? (this.tokens[index]?.multiplier ?? 1) : 1)
    );
  }
  private cancel() {
    if (this.timer !== undefined) this.clock.clear(this.timer);
    this.timer = undefined;
  }
  private schedule() {
    this.timer = this.clock.set(
      () => this.tick(),
      Math.max(0, this.due - this.clock.now()),
    );
  }
  private tick() {
    if (!this.state.playing) return;
    const now = this.clock.now();
    if (now + 0.5 < this.due) {
      this.schedule();
      return;
    }
    if (this.state.index >= this.tokens.length - 1) {
      this.state = { ...this.state, playing: false, ended: true };
      this.remaining = 0;
      this.emit();
      return;
    }
    const late = now - this.due;
    this.state.index++;
    const duration = this.duration();
    // Compensate small jitter; reset after a stall so every word remains readable.
    this.due =
      late > Math.min(50, duration * 0.25)
        ? now + duration
        : this.due + duration;
    this.emit();
    this.schedule();
  }
  play() {
    if (!this.tokens.length || this.state.playing) return;
    if (this.state.ended) this.seek(0);
    this.state.playing = true;
    this.due = this.clock.now() + (this.remaining || this.duration());
    this.remaining = 0;
    this.emit();
    this.schedule();
  }
  pause() {
    if (!this.state.playing) return;
    this.remaining = Math.max(1, this.due - this.clock.now());
    this.state.playing = false;
    this.cancel();
    this.emit();
  }
  toggle() {
    if (this.state.playing) this.pause();
    else this.play();
  }
  seek(index: number) {
    const play = this.state.playing;
    this.cancel();
    this.state = {
      index: Math.max(0, Math.min(this.tokens.length - 1, index)),
      playing: play,
      ended: false,
    };
    this.remaining = 0;
    if (play) {
      this.due = this.clock.now() + this.duration();
      this.schedule();
    }
    this.emit();
  }
  configure(wpm: number, adaptive: boolean) {
    const old = this.duration();
    const fraction = this.state.playing
      ? Math.max(0, Math.min(1, (this.due - this.clock.now()) / old))
      : this.remaining
        ? this.remaining / old
        : 1;
    this.wpm = Math.max(100, Math.min(2000, wpm));
    this.adaptive = adaptive;
    this.remaining = this.duration() * fraction;
    if (this.state.playing) {
      this.cancel();
      this.due = this.clock.now() + this.remaining;
      this.remaining = 0;
      this.schedule();
    }
  }
  sentence(direction: number) {
    const id = this.tokens[this.state.index]?.sentenceId ?? 0;
    let i = this.state.index;
    if (direction < 0) {
      if (i > 0) i--;
      while (
        i > 0 &&
        this.tokens[i - 1].sentenceId === this.tokens[i].sentenceId
      )
        i--;
    } else {
      while (i < this.tokens.length - 1 && this.tokens[i].sentenceId === id)
        i++;
    }
    this.seek(i);
  }
  destroy() {
    this.cancel();
    this.listeners.clear();
  }
}
