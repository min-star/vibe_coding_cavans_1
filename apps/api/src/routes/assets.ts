import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { env } from '../config/env.js';
import { readDb, writeDb } from '../data/store.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import type { Asset } from '../types/models.js';
import { badRequest, notFound } from '../utils/http.js';
import { nowIso } from '../utils/time.js';

const uploadDir = path.resolve(process.cwd(), 'src/public/uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${nanoid(6)}${ext}`);
  }
});

const upload = multer({ storage });

export const assetRouter = Router();

assetRouter.use(requireAuth);

assetRouter.get('/', (req: AuthedRequest, res) => {
  const db = readDb();
  const assets = db.assets
    .filter((item) => item.ownerId === req.user!.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return res.json({ assets });
});

assetRouter.post('/upload', upload.single('file'), (req: AuthedRequest, res) => {
  if (!req.file) {
    return badRequest(res, 'file is required');
  }

  const db = readDb();
  const fileUrl = `${env.appBaseUrl}/uploads/${req.file.filename}`;
  const asset: Asset = {
    id: nanoid(),
    ownerId: req.user!.id,
    type: req.file.mimetype.startsWith('image/')
      ? 'image'
      : req.file.mimetype.startsWith('video/')
        ? 'video'
        : 'file',
    title: req.file.originalname,
    fileUrl,
    thumbnailUrl: req.file.mimetype.startsWith('image/') ? fileUrl : undefined,
    metadata: {
      size: req.file.size,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname
    },
    createdAt: nowIso()
  };
  db.assets.unshift(asset);
  writeDb(db);
  return res.status(201).json({ asset });
});

assetRouter.post('/save-from-node', (req: AuthedRequest, res) => {
  const { canvasId, nodeId } = req.body as { canvasId?: string; nodeId?: string };
  if (!canvasId || !nodeId) {
    return badRequest(res, 'canvasId and nodeId are required');
  }

  const db = readDb();
  const canvas = db.canvases.find((item) => item.id === canvasId && item.ownerId === req.user!.id);
  const node = db.nodes.find((item) => item.id === nodeId && item.canvasId === canvasId);

  if (!canvas || !node || !node.output) {
    return notFound(res, 'Node output not found');
  }

  const fileUrl = String(node.output.fileUrl || '');
  if (!fileUrl) {
    return badRequest(res, 'Node does not contain savable file output');
  }

  const asset: Asset = {
    id: nanoid(),
    ownerId: req.user!.id,
    type: (node.output.type as Asset['type']) || 'file',
    title: String(node.data.label || 'Saved asset'),
    fileUrl,
    thumbnailUrl: node.output.thumbnailUrl ? String(node.output.thumbnailUrl) : undefined,
    metadata: {
      sourceNodeId: node.id,
      sourceCanvasId: canvas.id
    },
    createdAt: nowIso()
  };

  db.assets.unshift(asset);
  writeDb(db);
  return res.status(201).json({ asset });
});
