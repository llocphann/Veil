export class DocumentApplyScheduler {
  private frame: number | null = null;
  private applyAllRequested = false;
  private readonly pendingDocuments = new Set<Document>();

  constructor(
    private readonly isActive: () => boolean,
    private readonly applyAll: () => void,
    private readonly applyDocument: (document: Document) => void,
  ) {}

  scheduleAll(): void {
    if (!this.isActive()) return;
    this.applyAllRequested = true;
    this.pendingDocuments.clear();
    this.scheduleFrame();
  }

  scheduleDocuments(documents: Iterable<Document>): void {
    if (!this.isActive() || this.applyAllRequested) return;
    for (const document of documents) this.pendingDocuments.add(document);
    if (this.pendingDocuments.size > 0) this.scheduleFrame();
  }

  cancel(): void {
    if (this.frame !== null) window.cancelAnimationFrame(this.frame);
    this.frame = null;
    this.applyAllRequested = false;
    this.pendingDocuments.clear();
  }

  private scheduleFrame(): void {
    if (this.frame !== null) return;
    this.frame = window.requestAnimationFrame(() => {
      this.frame = null;
      if (!this.isActive()) {
        this.applyAllRequested = false;
        this.pendingDocuments.clear();
        return;
      }
      if (this.applyAllRequested) {
        this.applyAllRequested = false;
        this.pendingDocuments.clear();
        this.applyAll();
        return;
      }
      const documents = Array.from(this.pendingDocuments);
      this.pendingDocuments.clear();
      for (const document of documents) this.applyDocument(document);
    });
  }
}
