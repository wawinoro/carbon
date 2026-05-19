import { SnapshotManager } from './snapshot-manager';

const makeMockPage = (url = 'https://example.com', title = 'Example') => ({
  url: () => url,
  title: async () => title,
  screenshot: async () => Buffer.from('fake-png-data'),
});

describe('SnapshotManager', () => {
  let manager: SnapshotManager;

  beforeEach(() => {
    manager = new SnapshotManager();
  });

  it('captures a snapshot without screenshot', async () => {
    const page = makeMockPage() as any;
    const snap = await manager.capture(page, 'session-1');

    expect(snap.sessionId).toBe('session-1');
    expect(snap.url).toBe('https://example.com');
    expect(snap.title).toBe('Example');
    expect(snap.screenshotBase64).toBeUndefined();
    expect(snap.id).toMatch(/^snap_session-1_/);
  });

  it('captures a snapshot with screenshot when requested', async () => {
    const page = makeMockPage() as any;
    const snap = await manager.capture(page, 'session-1', { includeScreenshot: true });

    expect(snap.screenshotBase64).toBeDefined();
    expect(typeof snap.screenshotBase64).toBe('string');
  });

  it('retrieves a snapshot by id', async () => {
    const page = makeMockPage() as any;
    const snap = await manager.capture(page, 'session-1');

    const retrieved = manager.get(snap.id);
    expect(retrieved).toEqual(snap);
  });

  it('returns undefined for unknown snapshot id', () => {
    expect(manager.get('nonexistent')).toBeUndefined();
  });

  it('lists snapshots by session', async () => {
    const page = makeMockPage() as any;
    await manager.capture(page, 'session-1');
    await manager.capture(page, 'session-1');
    await manager.capture(page, 'session-2');

    expect(manager.listBySession('session-1')).toHaveLength(2);
    expect(manager.listBySession('session-2')).toHaveLength(1);
    expect(manager.listBySession('session-3')).toHaveLength(0);
  });

  it('deletes a snapshot by id', async () => {
    const page = makeMockPage() as any;
    const snap = await manager.capture(page, 'session-1');

    expect(manager.delete(snap.id)).toBe(true);
    expect(manager.get(snap.id)).toBeUndefined();
    expect(manager.delete(snap.id)).toBe(false);
  });

  it('clears all snapshots for a session', async () => {
    const page = makeMockPage() as any;
    await manager.capture(page, 'session-1');
    await manager.capture(page, 'session-1');
    await manager.capture(page, 'session-2');

    const cleared = manager.clearSession('session-1');
    expect(cleared).toBe(2);
    expect(manager.listBySession('session-1')).toHaveLength(0);
    expect(manager.listBySession('session-2')).toHaveLength(1);
  });

  it('tracks total snapshot count', async () => {
    const page = makeMockPage() as any;
    expect(manager.size()).toBe(0);
    await manager.capture(page, 'session-1');
    await manager.capture(page, 'session-1');
    expect(manager.size()).toBe(2);
  });
});
