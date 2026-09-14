import { nextSystemContextBoundary } from "./context-rules";
import type { VeilSettings } from "./settings";

const SYSTEM_ROUTING_BOUNDARY_BUFFER = 50;
const MAX_TIMEOUT_DELAY = 2_147_483_647;

export class SystemRoutingScheduler {
  private timer: number | null = null;
  private scheduledBoundary: number | null = null;

  constructor(
    private readonly getSettings: () => VeilSettings,
    private readonly isActive: () => boolean,
    private readonly onBoundary: () => void,
  ) {}

  clear(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    this.scheduledBoundary = null;
  }

  reschedule(): void {
    if (!this.isActive()) {
      this.clear();
      return;
    }
    const settings = this.getSettings();
    if (!settings.enabled) {
      this.clear();
      return;
    }

    const boundary = nextSystemContextBoundary([
      ...settings.wallpaperRules,
      ...settings.opacityExclusions,
    ]);
    if (boundary === null) {
      this.clear();
      return;
    }
    if (this.timer !== null && this.scheduledBoundary === boundary) return;

    this.clear();
    const delay = Math.max(
      1,
      Math.min(MAX_TIMEOUT_DELAY, boundary - Date.now() + SYSTEM_ROUTING_BOUNDARY_BUFFER),
    );
    this.scheduledBoundary = boundary;
    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.scheduledBoundary = null;
      if (!this.isActive()) return;
      this.onBoundary();
      this.reschedule();
    }, delay);
  }
}
