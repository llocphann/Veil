import { normalizePath } from "obsidian";
import { persistedVeilDataSnapshot } from "./persisted-data-schema";
import { normalizeSettings, type VeilSettings } from "./settings";
import type { WallpaperLibraryState } from "./wallpaper-library-state";

type SaveData = (data: unknown) => Promise<void>;
type SaveErrorHandler = (error: unknown) => void;

export class SettingsPersistence {
  private saveTimer: number | null = null;
  private pendingSave = false;
  private saveQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly getSettings: () => VeilSettings,
    private readonly getLibrary: () => WallpaperLibraryState,
    private readonly saveData: SaveData,
    private readonly onSaveError: SaveErrorHandler,
  ) {}

  schedule(): void {
    this.pendingSave = true;
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      void this.flush();
    }, 200);
  }

  flush(): Promise<void> {
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (!this.pendingSave) return this.saveQueue;

    this.pendingSave = false;
    const settings = normalizeSettings(this.getSettings(), normalizePath);
    const snapshot = persistedVeilDataSnapshot(settings, this.getLibrary());
    const task = this.saveQueue.then(() => this.saveData(snapshot));
    this.saveQueue = task.catch((error: unknown) => {
      this.onSaveError(error);
    });
    return this.saveQueue;
  }
}
