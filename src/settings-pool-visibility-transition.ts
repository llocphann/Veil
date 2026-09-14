const POOL_VISIBILITY_ROW_NAMES = new Set([
  "Wallpaper file",
  "Wallpaper library",
  "Wallpaper folder",
  "Include subfolders",
  "Change interval",
]);

const EXIT_DURATION_MS = 140;
const ENTER_DURATION_MS = 180;
const EASING = "cubic-bezier(0.2, 0, 0, 1)";

function rowName(row: HTMLElement): string {
  return row.querySelector<HTMLElement>(".setting-item-name")?.textContent?.trim() || "";
}

function visiblePoolRows(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(".setting-item"))
    .filter((row) => POOL_VISIBILITY_ROW_NAMES.has(rowName(row)))
    .filter((row) => !row.hidden && row.getClientRects().length > 0);
}

function rowKeyframes(row: HTMLElement, entering: boolean): Keyframe[] {
  const win = row.ownerDocument.defaultView;
  const style = win?.getComputedStyle(row);
  const height = Math.ceil(row.getBoundingClientRect().height);
  const open: Keyframe = {
    opacity: 1,
    transform: "translateY(0)",
    maxHeight: `${height}px`,
    marginTop: style?.marginTop || "0px",
    marginBottom: style?.marginBottom || "0px",
    paddingTop: style?.paddingTop || "0px",
    paddingBottom: style?.paddingBottom || "0px",
    borderTopWidth: style?.borderTopWidth || "0px",
    borderBottomWidth: style?.borderBottomWidth || "0px",
  };
  const closed: Keyframe = {
    opacity: 0,
    transform: "translateY(-6px)",
    maxHeight: "0px",
    marginTop: "0px",
    marginBottom: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
    borderTopWidth: "0px",
    borderBottomWidth: "0px",
  };
  return entering ? [closed, open] : [open, closed];
}

export class SettingsPoolVisibilityTransition {
  private generation = 0;
  private readonly animations = new Set<Animation>();

  constructor(private readonly root: () => HTMLElement) {}

  run(refresh: () => void): void {
    const generation = ++this.generation;
    this.cancelAnimations();

    const root = this.root();
    const win = root.ownerDocument.defaultView;
    if (!win || win.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      refresh();
      return;
    }

    const outgoing = visiblePoolRows(root);
    if (outgoing.length === 0) {
      refresh();
      this.animateIncoming(generation);
      return;
    }

    const exits = outgoing.map((row) => this.animateRow(row, false));
    void Promise.allSettled(exits.map((animation) => animation.finished)).then(() => {
      if (generation !== this.generation) return;
      this.animations.clear();
      refresh();
      this.animateIncoming(generation);
    });
  }

  clear(): void {
    this.generation += 1;
    this.cancelAnimations();
  }

  private animateIncoming(generation: number): void {
    if (generation !== this.generation) return;
    for (const row of visiblePoolRows(this.root())) {
      const animation = this.animateRow(row, true);
      void animation.finished.finally(() => this.animations.delete(animation));
    }
  }

  private animateRow(row: HTMLElement, entering: boolean): Animation {
    const animation = row.animate(rowKeyframes(row, entering), {
      duration: entering ? ENTER_DURATION_MS : EXIT_DURATION_MS,
      easing: EASING,
      fill: entering ? "none" : "forwards",
    });
    this.animations.add(animation);
    return animation;
  }

  private cancelAnimations(): void {
    for (const animation of this.animations) animation.cancel();
    this.animations.clear();
  }
}
