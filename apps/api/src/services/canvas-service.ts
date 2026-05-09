import { nanoid } from 'nanoid';
import { readDb, writeDb } from '../data/store.js';
import type { Canvas, CanvasEdge, CanvasNode, ReferenceType, User } from '../types/models.js';
import { nowIso } from '../utils/time.js';

export function createCanvas(ownerId: string, title: string): Canvas {
  const db = readDb();
  const now = nowIso();
  const canvas: Canvas = {
    id: nanoid(),
    ownerId,
    title,
    visibility: 'private',
    viewport: { x: 0, y: 0, zoom: 1 },
    createdAt: now,
    updatedAt: now
  };
  db.canvases.unshift(canvas);
  writeDb(db);
  return canvas;
}

export function getOwnedCanvasOrThrow(user: User, canvasId: string) {
  const db = readDb();
  const canvas = db.canvases.find((item) => item.id === canvasId && item.ownerId === user.id);
  return { db, canvas };
}

export function getCanvasBundle(canvasId: string) {
  const db = readDb();
  const canvas = db.canvases.find((item) => item.id === canvasId);
  if (!canvas) {
    return undefined;
  }
  return {
    canvas,
    nodes: db.nodes.filter((item) => item.canvasId === canvasId),
    edges: db.edges.filter((item) => item.canvasId === canvasId)
  };
}

export function saveCanvasContent(
  canvasId: string,
  ownerId: string,
  payload: {
    title?: string;
    viewport?: { x: number; y: number; zoom: number };
    nodes: CanvasNode[];
    edges: CanvasEdge[];
  }
) {
  const db = readDb();
  const canvas = db.canvases.find((item) => item.id === canvasId && item.ownerId === ownerId);
  if (!canvas) {
    return undefined;
  }

  canvas.title = payload.title ?? canvas.title;
  canvas.viewport = payload.viewport ?? canvas.viewport;
  canvas.updatedAt = nowIso();

  db.nodes = db.nodes.filter((item) => item.canvasId !== canvasId);
  db.edges = db.edges.filter((item) => item.canvasId !== canvasId);

  db.nodes.push(
    ...payload.nodes.map((node) => ({
      ...node,
      canvasId,
      updatedAt: nowIso(),
      createdAt: node.createdAt || nowIso()
    }))
  );

  db.edges.push(
    ...payload.edges.map((edge) => ({
      ...edge,
      canvasId,
      createdAt: edge.createdAt || nowIso()
    }))
  );

  writeDb(db);
  return getCanvasBundle(canvasId);
}

export function createNode(
  canvasId: string,
  ownerId: string,
  type: CanvasNode['type'],
  position: { x: number; y: number }
) {
  const db = readDb();
  const canvas = db.canvases.find((item) => item.id === canvasId && item.ownerId === ownerId);
  if (!canvas) {
    return undefined;
  }
  const now = nowIso();
  const node: CanvasNode = {
    id: nanoid(),
    canvasId,
    type,
    position,
    status: 'idle',
    data: { label: `${type} node` },
    createdAt: now,
    updatedAt: now
  };
  db.nodes.push(node);
  canvas.updatedAt = now;
  writeDb(db);
  return node;
}

export function updateNode(
  nodeId: string,
  ownerId: string,
  updates: Partial<Pick<CanvasNode, 'position' | 'data' | 'output' | 'status'>>
) {
  const db = readDb();
  const node = db.nodes.find((item) => item.id === nodeId);
  if (!node) {
    return undefined;
  }
  const canvas = db.canvases.find((item) => item.id === node.canvasId && item.ownerId === ownerId);
  if (!canvas) {
    return null;
  }
  Object.assign(node, updates, { updatedAt: nowIso() });
  canvas.updatedAt = nowIso();
  writeDb(db);
  return node;
}

export function deleteNode(nodeId: string, ownerId: string) {
  const db = readDb();
  const node = db.nodes.find((item) => item.id === nodeId);
  if (!node) {
    return undefined;
  }
  const canvas = db.canvases.find((item) => item.id === node.canvasId && item.ownerId === ownerId);
  if (!canvas) {
    return null;
  }

  db.nodes = db.nodes.filter((item) => item.id !== nodeId);
  db.edges = db.edges.filter(
    (item) => item.sourceNodeId !== nodeId && item.targetNodeId !== nodeId
  );
  canvas.updatedAt = nowIso();
  writeDb(db);
  return true;
}

export function ensureCanvasReferences(
  canvasId: string,
  edges: Array<{ sourceNodeId: string; targetNodeId: string; referenceType?: ReferenceType }>
) {
  const db = readDb();
  const nodes = db.nodes.filter((item) => item.canvasId === canvasId);
  return edges.every((edge) => {
    const source = nodes.find((item) => item.id === edge.sourceNodeId);
    const target = nodes.find((item) => item.id === edge.targetNodeId);
    return Boolean(source && target);
  });
}

export function cloneCanvas(canvasId: string, newOwnerId: string, titlePrefix = 'Cloned') {
  const db = readDb();
  const sourceCanvas = db.canvases.find((item) => item.id === canvasId);
  if (!sourceCanvas) {
    return undefined;
  }

  const now = nowIso();
  const newCanvasId = nanoid();
  const clonedCanvas: Canvas = {
    ...sourceCanvas,
    id: newCanvasId,
    ownerId: newOwnerId,
    title: `${titlePrefix} - ${sourceCanvas.title}`,
    visibility: 'private',
    createdAt: now,
    updatedAt: now
  };

  const sourceNodes = db.nodes.filter((item) => item.canvasId === canvasId);
  const sourceEdges = db.edges.filter((item) => item.canvasId === canvasId);
  const nodeIdMap = new Map<string, string>();

  const clonedNodes = sourceNodes.map((node) => {
    const id = nanoid();
    nodeIdMap.set(node.id, id);
    return {
      ...node,
      id,
      canvasId: newCanvasId,
      createdAt: now,
      updatedAt: now
    };
  });

  const clonedEdges = sourceEdges.map((edge) => ({
    ...edge,
    id: nanoid(),
    canvasId: newCanvasId,
    sourceNodeId: nodeIdMap.get(edge.sourceNodeId) || edge.sourceNodeId,
    targetNodeId: nodeIdMap.get(edge.targetNodeId) || edge.targetNodeId,
    createdAt: now
  }));

  db.canvases.unshift(clonedCanvas);
  db.nodes.push(...clonedNodes);
  db.edges.push(...clonedEdges);
  writeDb(db);
  return {
    canvas: clonedCanvas,
    nodes: clonedNodes,
    edges: clonedEdges
  };
}

