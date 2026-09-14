import {
  TFile,
  getAllTags,
  type App,
  type WorkspaceLeaf,
} from "obsidian";
import type { NoteContext } from "./context-rules";

export class DocumentContextResolver {
  private readonly activeRootLeaves = new Map<Document, WorkspaceLeaf>();

  constructor(private readonly app: App) {}

  rememberActiveRootLeaf(leaf: WorkspaceLeaf | null): void {
    if (!leaf) return;
    const document = leaf.view.containerEl.ownerDocument;
    if (!this.isRootLeafForDocument(leaf, document)) return;
    this.activeRootLeaves.set(document, leaf);
  }

  forgetDocument(document: Document): void {
    this.activeRootLeaves.delete(document);
  }

  clear(): void {
    this.activeRootLeaves.clear();
  }

  contextForDocument(document: Document): NoteContext {
    const candidate = this.fileForDocument(document);
    const theme = document.body.classList.contains("theme-dark")
      ? "dark"
      : document.body.classList.contains("theme-light")
        ? "light"
        : undefined;
    if (!candidate) {
      return {
        path: "",
        name: "",
        basename: "",
        tags: [],
        properties: {},
        theme,
      };
    }
    const cache = this.app.metadataCache.getFileCache(candidate);
    return {
      path: candidate.path,
      name: candidate.name,
      basename: candidate.basename,
      tags: cache ? getAllTags(cache) || [] : [],
      properties: cache?.frontmatter || {},
      theme,
    };
  }

  isActiveFile(file: TFile): boolean {
    const documents = new Set<Document>([this.app.workspace.containerEl.ownerDocument]);
    this.app.workspace.iterateAllLeaves((leaf) => documents.add(leaf.view.containerEl.ownerDocument));
    for (const document of documents) {
      if (this.fileForDocument(document)?.path === file.path) return true;
    }
    return false;
  }

  private fileForDocument(document: Document): TFile | null {
    const leaf = this.leafForDocument(document);
    const candidate: unknown = (leaf?.view as { file?: unknown } | undefined)?.file;
    return candidate instanceof TFile ? candidate : null;
  }

  private leafForDocument(document: Document): WorkspaceLeaf | null {
    const remembered = this.activeRootLeaves.get(document) || null;
    if (this.isRootLeafForDocument(remembered, document)) return remembered;
    if (remembered) this.activeRootLeaves.delete(document);

    const recent = this.app.workspace.getMostRecentLeaf();
    if (recent && this.isRootLeafForDocument(recent, document)) {
      this.activeRootLeaves.set(document, recent);
      return recent;
    }
    const fallback: { leaf: WorkspaceLeaf | null } = { leaf: null };
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (!fallback.leaf && this.isRootLeafForDocument(leaf, document)) fallback.leaf = leaf;
    });
    return fallback.leaf;
  }

  private isRootLeafForDocument(leaf: WorkspaceLeaf | null, document: Document): boolean {
    const container = leaf?.view?.containerEl;
    return container?.ownerDocument === document
      && container.isConnected
      && Boolean(container.closest(".workspace-split.mod-root"));
  }
}
