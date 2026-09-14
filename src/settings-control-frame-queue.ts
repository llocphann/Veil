export type SettingsControlFrameRequest = (
  callback: () => void,
) => () => void;

export class SettingsControlFrameQueue {
  private readonly pending = new Map<string, unknown>();
  private cancelFrame: (() => void) | null = null;

  constructor(
    private readonly requestFrame: SettingsControlFrameRequest,
    private readonly apply: (values: ReadonlyMap<string, unknown>) => void,
  ) {}

  value(key: string, fallback: unknown): unknown {
    return this.pending.has(key) ? this.pending.get(key) : fallback;
  }

  queue(key: string, value: unknown): void {
    this.pending.set(key, value);
    if (this.cancelFrame) return;

    let completedSynchronously = false;
    const cancel = this.requestFrame(() => {
      completedSynchronously = true;
      this.cancelFrame = null;
      this.flushPending();
    });
    if (!completedSynchronously) this.cancelFrame = cancel;
  }

  flush(): void {
    const cancel = this.cancelFrame;
    this.cancelFrame = null;
    cancel?.();
    this.flushPending();
  }

  clear(): void {
    const cancel = this.cancelFrame;
    this.cancelFrame = null;
    cancel?.();
    this.pending.clear();
  }

  private flushPending(): void {
    if (this.pending.size === 0) return;
    const values = new Map(this.pending);
    this.pending.clear();
    this.apply(values);
  }
}
