import {
  TFile,
  getAllTags,
  type App,
  type WorkspaceLeaf,
} from "obsidian";
import type { NoteContext } from "./context-rules";

export class DocumentContextResolver {
  private readonly activeRootLeaves = new Map<Document, WorkspaceLeaf>();
  private readonly workspaceDocumentRegistry = new Set<Document>();

  constructor(private readonly app: App) {
    this.rememberDocument(this.app.workspace.containerEl.ownerDocument);
  }

  initializeDocuments(): void {
    this.rememberDocument(this.app.workspace.containerEl.ownerDocument);
    this.app.workspace.iterateAllLeaves((leaf) => {
      this.rememberDocument(leaf.view.containerEl.ownerDocument);
    });
  }

  rememberDocument(document: Document): void {
    if (!document.defaultView?.closed) this.workspaceDocumentRegistry.add(document);
  }

  workspaceDocuments(): ReadonlySet<Document> {
    return this.workspaceDocumentRegistry;
  }

  rememberActiveRootLeaf(leaf: WorkspaceLeaf | null): Document | null {
    if (!leaf) return null;
    const document = leaf.view.containerEl.ownerDocument;
    if (!this.isRootLeafForDocument(leaf, document)) return null;
    this.rememberDocument(document);
    this.activeRootLeaves.set(document, leaf);
    return document;
  }

  forgetDocument(document: Document): void {
    this.activeRootLeaves.delete(document);
    this.workspaceDocumentRegistry.delete(document);
  }

  clear(): void {
    this.activeRootLeaves.clear();
    this.workspaceDocumentRegistry.clear();
  }

  documentsAffectedByLayoutChange(): Document[] {
    const affected: Document[] = [];
    for (const document of this.workspaceDocumentRegistry) {
      if (document.defaultView?.closed) {
        this.forgetDocument(document);
        continue;
      }
      const remembered = this.activeRootLeaves.get(document) || null;
      if (this.isRootLeafForDocument(remembered, document)) continue;

      if (remembered) this.activeRootLeaves.delete(document);
      const replacement = this.findRootLeafForDocument(document);
      if (replacement) this.activeRootLeaves.set(document, replacement);
      if (remembered || replacement) affected.push(document);
    }
    return affected;
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

  documentsForFile(file: TFile): Document[] {
    return Array.from(this.workspaceDocumentRegistry)
      .filter((document) => this.fileForDocument(document)?.path === file.path);
  }

  isActiveFile(file: TFile): boolean {
    return this.documentsForFile(file).length > 0;
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

    const replacement = this.findRootLeafForDocument(document);
    if (replacement) this.activeRootLeaves.set(document, replacement);
    return replacement;
  }

  private findRootLeafForDocument(document: Document): WorkspaceLeaf | null {
    const recent = this.app.workspace.getMostRecentLeaf();
    if (recent && this.isRootLeafForDocument(recent, document)) return recent;

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
