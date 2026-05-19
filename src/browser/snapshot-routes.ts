import { Router, Request, Response } from 'express';
import { snapshotManager, SnapshotOptions } from './snapshot-manager';
import { sessionManager } from './session-manager';

const router = Router();

// POST /sessions/:sessionId/snapshots
router.post('/:sessionId/snapshots', async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const options: SnapshotOptions = req.body ?? {};

  const session = sessionManager.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: `Session '${sessionId}' not found` });
  }

  try {
    const snapshot = await snapshotManager.capture(session.page, sessionId, options);
    return res.status(201).json(snapshot);
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? 'Failed to capture snapshot' });
  }
});

// GET /sessions/:sessionId/snapshots
router.get('/:sessionId/snapshots', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const snapshots = snapshotManager.listBySession(sessionId);
  return res.json(snapshots);
});

// GET /sessions/:sessionId/snapshots/:snapshotId
router.get('/:sessionId/snapshots/:snapshotId', (req: Request, res: Response) => {
  const { snapshotId } = req.params;
  const snapshot = snapshotManager.get(snapshotId);

  if (!snapshot) {
    return res.status(404).json({ error: `Snapshot '${snapshotId}' not found` });
  }

  return res.json(snapshot);
});

// DELETE /sessions/:sessionId/snapshots/:snapshotId
router.delete('/:sessionId/snapshots/:snapshotId', (req: Request, res: Response) => {
  const { snapshotId } = req.params;
  const deleted = snapshotManager.delete(snapshotId);

  if (!deleted) {
    return res.status(404).json({ error: `Snapshot '${snapshotId}' not found` });
  }

  return res.status(204).send();
});

// DELETE /sessions/:sessionId/snapshots
router.delete('/:sessionId/snapshots', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const count = snapshotManager.clearSession(sessionId);
  return res.json({ deleted: count });
});

export { router as snapshotRoutes };
