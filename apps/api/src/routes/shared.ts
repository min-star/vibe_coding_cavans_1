import { Router } from 'express';
import { readDb } from '../data/store.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { cloneCanvas, getCanvasBundle } from '../services/canvas-service.js';
import { notFound } from '../utils/http.js';

export const sharedRouter = Router();

sharedRouter.get('/:token', (req, res) => {
  const db = readDb();
  const share = db.shares.find((item) => item.shareToken === req.params.token);
  if (!share) {
    return notFound(res, 'Share not found');
  }
  const bundle = getCanvasBundle(share.canvasId);
  if (!bundle) {
    return notFound(res, 'Canvas not found');
  }
  return res.json({
    share,
    ...bundle
  });
});

sharedRouter.post('/:token/clone', requireAuth, (req: AuthedRequest, res) => {
  const db = readDb();
  const share = db.shares.find((item) => item.shareToken === req.params.token);
  if (!share) {
    return notFound(res, 'Share not found');
  }
  const result = cloneCanvas(share.canvasId, req.user!.id, 'Shared Copy');
  if (!result) {
    return notFound(res, 'Canvas not found');
  }
  return res.status(201).json(result);
});

