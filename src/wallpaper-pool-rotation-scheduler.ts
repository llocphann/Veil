const POOL_ROTATION_BOUNDARY_BUFFER = 25;
const MAX_TIMEOUT_DELAY = 2_147_483_647;

export class WallpaperPoolRotationScheduler {
  private timer: number | null = null;
  private scheduledBoundary: number | null = null;

  constructor(
    private readonly getBoundary: () => number | null,
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
    const boundary = this.getBoundary();
    if (boundary === null) {
      this.clear();
      return;
    }
    if (this.timer !== null && this.scheduledBoundary === boundary) return;

    this.clear();
    const delay = Math.max(
      1,
      Math.min(MAX_TIMEOUT_DELAY, boundary - Date.now() + POOL_ROTATION_BOUNDARY_BUFFER),
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
