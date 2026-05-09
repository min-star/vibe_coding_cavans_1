import { Router } from 'express';
import {
  cloneCanvas,
  createCanvas,
  createNode,
  deleteNode,
  getCanvasBundle,
  getOwnedCanvasOrThrow,
  saveCanvasContent,
  updateNode
} from '../services/canvas-service.js';
import { nanoid } from 'nanoid';
import { readDb, writeDb } from '../data/store.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import type { CanvasEdge, CanvasNode } from '../types/models.js';
import { badRequest, notFound } from '../utils/http.js';
import { nowIso } from '../utils/time.js';

export const canvasRouter = Router();

canvasRouter.use(requireAuth);

canvasRouter.get('/', (req: AuthedRequest, res) => {
  const db = readDb();
  const canvases = db.canvases
    .filter((item) => item.ownerId === req.user!.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return res.json({ canvases });
});

canvasRouter.post('/', (req: AuthedRequest, res) => {
  const title = String(req.body.title || 'Untitled Canvas');
  const canvas = createCanvas(req.user!.id, title);
  return res.status(201).json({ canvas });
});

canvasRouter.get('/:id', (req: AuthedRequest, res) => {
  const bundle = getCanvasBundle(req.params.id);
  if (!bundle || bundle.canvas.ownerId !== req.user!.id) {
    return notFound(res, 'Canvas not found');
  }
  return res.json(bundle);
});

canvasRouter.put('/:id', (req: AuthedRequest, res) => {
  const { db, canvas } = getOwnedCanvasOrThrow(req.user!, req.params.id);
  if (!canvas) {
    return notFound(res, 'Canvas not found');
  }
  canvas.title = String(req.body.title || canvas.title);
  canvas.description = req.body.description ? String(req.body.description) : canvas.description;
  canvas.updatedAt = nowIso();
  writeDb(db);
  return res.json({ canvas });
});

canvasRouter.put('/:id/content', (req: AuthedRequest, res) => {
  const { nodes = [], edges = [], viewport, title } = req.body as {
    nodes?: CanvasNode[];
    edges?: CanvasEdge[];
    viewport?: { x: number; y: number; zoom: number };
    title?: string;
  };

  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    return badRequest(res, 'nodes and edges must be arrays');
  }

  const bundle = saveCanvasContent(req.params.id, req.user!.id, {
    nodes,
    edges,
    viewport,
    title
  });

  if (!bundle) {
    return notFound(res, 'Canvas not found');
  }
  return res.json(bundle);
});

canvasRouter.post('/:id/clone', (req: AuthedRequest, res) => {
  const result = cloneCanvas(req.params.id, req.user!.id);
  if (!result) {
    return notFound(res, 'Canvas not found');
  }
  return res.status(201).json(result);
});

canvasRouter.post('/:id/share', (req: AuthedRequest, res) => {
  const db = readDb();
  const canvas = db.canvases.find((item) => item.id === req.params.id && item.ownerId === req.user!.id);
  if (!canvas) {
    return notFound(res, 'Canvas not found');
  }

  let share = db.shares.find((item) => item.canvasId === canvas.id);
  if (!share) {
    share = {
      id: nanoid(),
      canvasId: canvas.id,
      shareToken: nanoid(16),
      createdBy: req.user!.id,
      createdAt: nowIso()
    };
    db.shares.push(share);
  }
  canvas.visibility = 'shared';
  canvas.updatedAt = nowIso();
  writeDb(db);

  return res.json({
    share,
    shareUrl: `${req.protocol}://${req.get('host')}/api/shared/${share.shareToken}`,
    webUrl: `${process.env.WEB_APP_URL || 'http://localhost:5173'}/shared/${share.shareToken}`
  });
});

canvasRouter.post('/:id/nodes', (req: AuthedRequest, res) => {
  const type = req.body.type as CanvasNode['type'];
  const position = req.body.position as { x: number; y: number };
  if (!type || !position) {
    return badRequest(res, 'type and position are required');
  }
  const node = createNode(req.params.id, req.user!.id, type, position);
  if (!node) {
    return notFound(res, 'Canvas not found');
  }
  return res.status(201).json({ node });
});

canvasRouter.put('/nodes/:nodeId', (req: AuthedRequest, res) => {
  const node = updateNode(req.params.nodeId, req.user!.id, req.body);
  if (node === undefined) {
    return notFound(res, 'Node not found');
  }
  if (node === null) {
    return notFound(res, 'Canvas not found');
  }
  return res.json({ node });
});

canvasRouter.delete('/nodes/:nodeId', (req: AuthedRequest, res) => {
  const result = deleteNode(req.params.nodeId, req.user!.id);
  if (result === undefined || result === null) {
    return notFound(res, 'Node not found');
  }
  return res.status(204).send();
});

