import { Notice, normalizePath } from "obsidian";
import type { VeilSettings } from "./settings";
import { parseVeilSettingsImport, serializeVeilSettings } from "./settings-transfer";

export const MAX_SETTINGS_IMPORT_BYTES = 1024 * 1024;

export interface SettingsTransferIoActions {
  applyImportedSettings: (settings: VeilSettings) => Promise<void>;
  refreshSettings: () => void;
}

export function exportVeilSettingsFile(
  containerEl: HTMLElement,
  settings: VeilSettings,
  pluginVersion: string,
): void {
  const text = serializeVeilSettings(settings, pluginVersion);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = containerEl.createEl("a");
  link.href = url;
  link.download = `veil-settings-${new Date().toISOString().slice(0, 10)}.json`;
  link.hidden = true;
  link.click();
  window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 0);
  new Notice("Veil settings exported.");
}

export function chooseVeilSettingsImportFile(
  containerEl: HTMLElement,
  actions: SettingsTransferIoActions,
): void {
  const input = containerEl.createEl("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.hidden = true;
  const cleanup = (): void => input.remove();
  input.addEventListener("cancel", cleanup, { once: true });
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) {
      cleanup();
      return;
    }
    void importVeilSettingsFile(file, actions).finally(cleanup);
  }, { once: true });
  input.click();
}

export async function importVeilSettingsFile(
  file: File,
  actions: SettingsTransferIoActions,
): Promise<void> {
  if (file.size > MAX_SETTINGS_IMPORT_BYTES) {
    new Notice("Veil settings import is limited to one megabyte.");
    return;
  }
  try {
    const imported = parseVeilSettingsImport(await file.text(), normalizePath);
    await actions.applyImportedSettings(imported);
    actions.refreshSettings();
    new Notice("Veil settings imported.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown import error.";
    new Notice(`Veil could not import settings: ${message}`);
  }
}
