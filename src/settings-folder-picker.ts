import {
  FuzzySuggestModal,
  TFolder,
  type App,
  type Setting,
} from "obsidian";

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

export function renderVaultFolderControl(
  app: App,
  setting: Setting,
  initialValue: string,
  commit: (path: string) => void,
): () => void {
  let draft = initialValue;
  let disposed = false;
  const cleanups: Array<() => void> = [];

  setting.addText((text) => {
    text
      .setPlaceholder("Media/Wallpapers")
      .setValue(initialValue)
      .onChange((value) => {
        draft = value;
      });

    const commitDraft = (): void => {
      if (disposed || draft === initialValue) return;
      commit(draft);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      commitDraft();
      text.inputEl.blur();
    };
    text.inputEl.addEventListener("blur", commitDraft);
    text.inputEl.addEventListener("keydown", onKeyDown);
    cleanups.push(() => text.inputEl.removeEventListener("blur", commitDraft));
    cleanups.push(() => text.inputEl.removeEventListener("keydown", onKeyDown));

    setting.addButton((button) =>
      button
        .setIcon("folder-open")
        .setTooltip("Choose folder")
        .onClick(() => {
          openVaultFolderPicker(app, (path) => {
            if (disposed || path === draft) return;
            draft = path;
            text.setValue(path);
            commit(path);
          });
        }),
    );
  });

  return () => {
    disposed = true;
    cleanups.forEach((cleanup) => cleanup());
  };
}

export function openVaultFolderPicker(
  app: App,
  choose: (path: string) => void,
): void {
  new VaultFolderPicker(app, choose).open();
}
