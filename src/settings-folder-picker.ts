import { FuzzySuggestModal, TFolder, type App } from "obsidian";

class VaultFolderPicker extends FuzzySuggestModal<TFolder> {
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

export function openVaultFolderPicker(
  app: App,
  choose: (path: string) => void,
): void {
  new VaultFolderPicker(app, choose).open();
}
