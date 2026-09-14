import { nextSystemContextBoundary } from "./context-rules";
import type { VeilSettings } from "./settings";

const SYSTEM_ROUTING_BOUNDARY_BUFFER = 50;
const MAX_TIMEOUT_DELAY = 2_147_483_647;

export class SystemRoutingScheduler {
  private timer: number | null = null;

  constructor(
    private readonly getSettings: () => VeilSettings,
    private readonly isActive: () => boolean,
    private readonly onBoundary: () => void,
  ) {}

  clear(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
  }

  reschedule(): void {
    this.clear();
    if (!this.isActive()) return;
    const settings = this.getSettings();
    if (!settings.enabled) return;

    const boundary = nextSystemContextBoundary([
      ...settings.wallpaperRules,
      ...settings.opacityExclusions,
    ]);
    if (boundary === null) return;

    const delay = Math.max(
      1,
      Math.min(MAX_TIMEOUT_DELAY, boundary - Date.now() + SYSTEM_ROUTING_BOUNDARY_BUFFER),
    );
    this.timer = window.setTimeout(() => {
      this.timer = null;
      if (!this.isActive()) return;
      this.onBoundary();
      this.reschedule();
    }, delay);
  }
}
