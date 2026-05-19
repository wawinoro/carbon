import { Page } from 'playwright';

export interface SnapshotRef {
  id: string;
  sessionId: string;
  timestamp: number;
  url: string;
  title: string;
  screenshotBase64?: string;
}

export interface SnapshotOptions {
  includeScreenshot?: boolean;
  label?: string;
}

export class SnapshotManager {
  private snapshots: Map<string, SnapshotRef> = new Map();

  async capture(page: Page, sessionId: string, options: SnapshotOptions = {}): Promise<SnapshotRef> {
    const id = `snap_${sessionId}_${Date.now()}`;

    let screenshotBase64: string | undefined;
    if (options.includeScreenshot) {
      const buffer = await page.screenshot({ type: 'png', fullPage: false });
      screenshotBase64 = buffer.toString('base64');
    }

    const snapshot: SnapshotRef = {
      id,
      sessionId,
      timestamp: Date.now(),
      url: page.url(),
      title: await page.title(),
      screenshotBase64,
    };

    this.snapshots.set(id, snapshot);
    return snapshot;
  }

  get(id: string): SnapshotRef | undefined {
    return this.snapshots.get(id);
  }

  listBySession(sessionId: string): SnapshotRef[] {
    return Array.from(this.snapshots.values()).filter(
      (snap) => snap.sessionId === sessionId
    );
  }

  delete(id: string): boolean {
    return this.snapshots.delete(id);
  }

  clearSession(sessionId: string): number {
    const toDelete = this.listBySession(sessionId).map((s) => s.id);
    toDelete.forEach((id) => this.snapshots.delete(id));
    return toDelete.length;
  }

  size(): number {
    return this.snapshots.size;
  }
}

export const snapshotManager = new SnapshotManager();
