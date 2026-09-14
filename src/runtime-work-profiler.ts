export type RuntimeWorkKind =
  | "workspaceApply"
  | "documentApply"
  | "mediaAllocation"
  | "appearanceApply"
  | "libraryGridRender"
  | "libraryCardPatch";

export type RuntimeWorkSnapshot = Readonly<Record<RuntimeWorkKind, number>>;

const WORK_KINDS: readonly RuntimeWorkKind[] = [
  "workspaceApply",
  "documentApply",
  "mediaAllocation",
  "appearanceApply",
  "libraryGridRender",
  "libraryCardPatch",
];

export class RuntimeWorkProfiler {
  private readonly counts = new Map<RuntimeWorkKind, number>();

  record(kind: RuntimeWorkKind, amount = 1): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.counts.set(kind, (this.counts.get(kind) || 0) + amount);
  }

  snapshot(): RuntimeWorkSnapshot {
    return Object.fromEntries(
      WORK_KINDS.map((kind) => [kind, this.counts.get(kind) || 0]),
    ) as Record<RuntimeWorkKind, number>;
  }

  reset(): void {
    this.counts.clear();
  }
}

export const runtimeWorkProfiler = /* @__PURE__ */ new RuntimeWorkProfiler();
