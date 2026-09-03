from pathlib import Path

modal_path = Path("src/wallpaper-library-modal.ts")
source = modal_path.read_text()
old = '''  private async importAndSelectWallhaven(wallpaper: WallhavenWallpaper, targetId: string): Promise<void> {
    if (this.wallhavenDownloading.size > 0) return;
    const localPath = wallhavenLocalPath(wallpaper);
    const existed = this.app.vault.getAbstractFileByPath(localPath) instanceof TFile;
    this.wallhavenDownloading.add(wallpaper.id);
    this.renderWallhavenGrid();
    try {
      const file = await importWallhavenWallpaper(this.app.vault, wallpaper);
      if (!this.files.some((candidate) => candidate.path === file.path)) {
        this.files.push(file);
        this.files.sort((left, right) => left.path.localeCompare(right.path));
      }
      this.controller.selectWallpaper(targetId, file.path);
      new Notice(existed ? "Applied downloaded Wallhaven wallpaper." : `Saved ${file.path}`);
    } catch (error) {
      new Notice(errorMessage(error));
    } finally {
      this.wallhavenDownloading.delete(wallpaper.id);
      this.renderWallhavenGrid();
    }
  }
'''
new = '''  private targetSelectedPath(targetId: string): string | null {
    const target = this.controller.getTargets().find((candidate) => candidate.id === targetId);
    return target?.selectedPath ?? null;
  }

  private async importAndSelectWallhaven(wallpaper: WallhavenWallpaper, targetId: string): Promise<void> {
    if (this.wallhavenDownloading.size > 0) return;
    const expectedSelectedPath = this.targetSelectedPath(targetId);
    if (expectedSelectedPath === null) {
      new Notice("Wallpaper target is no longer available.");
      return;
    }

    const localPath = wallhavenLocalPath(wallpaper);
    const existed = this.app.vault.getAbstractFileByPath(localPath) instanceof TFile;
    this.wallhavenDownloading.add(wallpaper.id);
    this.renderWallhavenGrid();
    try {
      const file = await importWallhavenWallpaper(this.app.vault, wallpaper);
      if (!this.files.some((candidate) => candidate.path === file.path)) {
        this.files.push(file);
        this.files.sort((left, right) => left.path.localeCompare(right.path));
      }

      const currentSelectedPath = this.targetSelectedPath(targetId);
      if (currentSelectedPath === null) {
        new Notice(`Saved ${file.path}; the target is no longer available.`);
      } else if (currentSelectedPath !== expectedSelectedPath) {
        new Notice(`Saved ${file.path}; a newer wallpaper choice was kept.`);
      } else {
        this.controller.selectWallpaper(targetId, file.path);
        new Notice(existed ? "Applied downloaded Wallhaven wallpaper." : `Saved ${file.path}`);
      }
    } catch (error) {
      new Notice(errorMessage(error));
    } finally {
      this.wallhavenDownloading.delete(wallpaper.id);
      this.renderWallhavenGrid();
    }
  }
'''
if source.count(old) != 1:
    raise SystemExit(f"Expected one import method target, found {source.count(old)}")
modal_path.write_text(source.replace(old, new))

test_path = Path("tests/wallhaven-library.test.ts")
tests = test_path.read_text()
marker = 'void test("Wallpaper Library toolbars can wrap on narrow windows", () => {'
addition = '''void test("Wallhaven completion cannot overwrite a newer target choice", () => {
  assert.match(library, /private targetSelectedPath\\(targetId: string\\): string \\| null/);
  assert.match(library, /const expectedSelectedPath = this\\.targetSelectedPath\\(targetId\\);/);
  assert.match(library, /const currentSelectedPath = this\\.targetSelectedPath\\(targetId\\);/);
  assert.match(library, /currentSelectedPath !== expectedSelectedPath/);
  assert.match(library, /a newer wallpaper choice was kept/);
});

'''
if tests.count(marker) != 1:
    raise SystemExit(f"Expected one test insertion marker, found {tests.count(marker)}")
test_path.write_text(tests.replace(marker, addition + marker))
