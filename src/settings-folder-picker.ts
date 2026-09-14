import { FuzzySuggestModal, TFolder } from "obsidian";
import type { App, Setting } from "obsidian";

class VaultFolderModal extends FuzzySuggestModal<TFolder> {
  constructor(
    app: App,
    private readonly choose: (path: string) => void,
  ) {
    super(app);
    this.setPlaceholder("Choose a wallpaper folder…");
  }

  getItems(): TFolder[] {
    const root = this.app.vault.getRoot();
    return [
      root,
      ...this.app.vault.getAllLoadedFiles()
        .filter((file): file is TFolder => file instanceof TFolder && file !== root)
        .sort((left, right) => left.path.localeCompare(right.path)),
    ];
  }

  getItemText(folder: TFolder): string {
    return folder === this.app.vault.getRoot() ? "Vault root" : folder.path;
  }

  onChooseItem(folder: TFolder): void {
    this.choose(folder === this.app.vault.getRoot() ? "" : folder.path);
  }
}

export function renderVaultFolderControl(
  app: App,
  setting: Setting,
  value: string,
  onChange: (path: string) => void,
): void {
  let currentValue = value;
  setting.addText((text) => {
    text
      .setPlaceholder("Media/Wallpapers")
      .setValue(value)
      .onChange((next) => {
        currentValue = next;
        onChange(next);
      });

    setting.addButton((button) =>
      button
        .setIcon("folder-open")
        .setTooltip("Choose folder")
        .onClick(() => {
          new VaultFolderModal(app, (path) => {
            if (path === currentValue) return;
            currentValue = path;
            text.setValue(path);
            onChange(path);
          }).open();
        }),
    );
  });
}
