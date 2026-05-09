import fs from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { env } from '../config/env.js';
import { readDb, writeDb } from '../data/store.js';
import { generateTextWithModel } from './llm-service.js';
import { findModelById } from './model-registry-service.js';
import type { Asset, CanvasEdge, CanvasNode, Task, TaskType } from '../types/models.js';
import { nowIso } from '../utils/time.js';

const uploadDir = path.resolve(process.cwd(), 'src/public/uploads');

function ensureUploadDir() {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function writeSvgFile(filename: string, title: string, bodyText: string[]) {
  ensureUploadDir();
  const filepath = path.join(uploadDir, filename);
  const lines = bodyText
    .map(
      (line, index) =>
        `<text x="40" y="${120 + index * 32}" fill="#f8fafc" font-size="22">${escapeXml(line)}</text>`
    )
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)" rx="32"/>
  <text x="40" y="68" fill="#38bdf8" font-size="28">TapNow Mock Output</text>
  <text x="40" y="102" fill="#e2e8f0" font-size="36">${escapeXml(title)}</text>
  ${lines}
</svg>`;

  fs.writeFileSync(filepath, svg, 'utf-8');
  return {
    filePath: filepath,
    fileUrl: `${env.appBaseUrl}/uploads/${filename}`
  };
}

function writeJsonFile(filename: string, payload: Record<string, unknown>) {
  ensureUploadDir();
  const filepath = path.join(uploadDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(payload, null, 2), 'utf-8');
  return {
    filePath: filepath,
    fileUrl: `${env.appBaseUrl}/uploads/${filename}`
  };
}

function escapeXml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function createAssetRecord(
  db: ReturnType<typeof readDb>,
  input: Omit<Asset, 'id' | 'createdAt'>
) {
  const asset: Asset = {
    id: nanoid(),
    createdAt: nowIso(),
    ...input
  };
  db.assets.unshift(asset);
  return asset;
}

function findNodeContext(canvasId: string, nodeId: string) {
  const db = readDb();
  const node = db.nodes.find((item) => item.id === nodeId && item.canvasId === canvasId);
  return { db, node };
}

function getIncomingSourceNodes(
  db: ReturnType<typeof readDb>,
  canvasId: string,
  nodeId: string
): CanvasNode[] {
  const incomingEdges = db.edges.filter(
    (edge: CanvasEdge) => edge.canvasId === canvasId && edge.targetNodeId === nodeId
  );

  return incomingEdges
    .map((edge) => db.nodes.find((node) => node.id === edge.sourceNodeId && node.canvasId === canvasId))
    .filter(Boolean) as CanvasNode[];
}

function getFirstImageSource(nodes: CanvasNode[]) {
  return nodes.find((node) => {
    const fileUrl = String(node.output?.fileUrl || '');
    const thumbnailUrl = String(node.output?.thumbnailUrl || '');
    return Boolean(fileUrl || thumbnailUrl || node.type === 'image_upload');
  });
}

function scheduleTaskExecution(taskId: string) {
  setTimeout(() => {
    const db = readDb();
    const task = db.tasks.find((item) => item.id === taskId);
    if (!task || task.status !== 'pending') {
      return;
    }
    task.status = 'running';
    task.startedAt = nowIso();
    writeDb(db);
  }, 300);

  setTimeout(async () => {
    const db = readDb();
    const task = db.tasks.find((item) => item.id === taskId);
    if (!task || (task.status !== 'pending' && task.status !== 'running')) {
      return;
    }
    const node = db.nodes.find((item) => item.id === task.nodeId);
    if (!node) {
      task.status = 'failed';
      task.errorMessage = 'Node not found';
      task.finishedAt = nowIso();
      writeDb(db);
      return;
    }

    try {
      const prompt = String(task.input.prompt || '');
      const references = Array.isArray(task.input.references)
        ? (task.input.references as string[])
        : [];
      const modelId = String(task.input.model || '');
      const quantity = Number(task.input.quantity || 1);
      const sourceNodes = getIncomingSourceNodes(db, task.canvasId, task.nodeId);
      const sourceImageNode = getFirstImageSource(sourceNodes);
      const sourceImageUrl = String(
        sourceImageNode?.output?.fileUrl || sourceImageNode?.output?.thumbnailUrl || ''
      );

      if (task.taskType === 'text_generate') {
        const text = await generateTextWithModel({
          model: findModelById(modelId),
          prompt,
          references,
          quantity
        });
        task.result = {
          text,
          modelId,
          quantity,
          references,
          sourceNodeIds: sourceNodes.map((item) => item.id)
        };
        node.output = {
          text,
          modelId,
          quantity,
          references,
          sourceNodeIds: sourceNodes.map((item) => item.id)
        };
      }

      if (task.taskType === 'image_upscale') {
        const image = writeSvgFile(`${task.id}.svg`, prompt || 'Image Upscale', [
          'Mode: 2x upscale mock',
          `Prompt: ${prompt || 'No prompt'}`,
          `Source: ${sourceImageUrl || 'No linked image source'}`,
          `Refs: ${references.join(' | ') || 'No references'}`
        ]);
        const asset = createAssetRecord(db, {
          ownerId: task.userId,
          type: 'image',
          title: `Upscaled Image ${task.id.slice(0, 6)}`,
          fileUrl: image.fileUrl,
          thumbnailUrl: image.fileUrl,
          metadata: {
            taskType: task.taskType,
            prompt,
            references,
            sourceImageUrl
          },
          sourceTaskId: task.id
        });
        task.result = asset;
        node.output = {
          ...asset,
          inputImageUrl: sourceImageUrl || undefined,
          sourceNodeIds: sourceNodes.map((item) => item.id)
        };
      }

      if (task.taskType === 'video_generate') {
        const poster = writeSvgFile(`${task.id}-poster.svg`, prompt || 'Video Generation', [
          `Prompt: ${prompt || 'No prompt'}`,
          `Source: ${sourceImageUrl || 'No linked image source'}`,
          `Refs: ${references.join(' | ') || 'No references'}`
        ]);
        const manifest = writeJsonFile(`${task.id}.json`, {
          type: 'mock-video',
          prompt,
          references,
          sourceImageUrl,
          duration: task.input.duration || 5,
          note: 'Replace this manifest with a real MP4/WebM provider in production.'
        });
        const asset = createAssetRecord(db, {
          ownerId: task.userId,
          type: 'video',
          title: `Generated Video ${task.id.slice(0, 6)}`,
          fileUrl: manifest.fileUrl,
          thumbnailUrl: poster.fileUrl,
          metadata: {
            taskType: task.taskType,
            prompt,
            duration: task.input.duration || 5,
            references,
            sourceImageUrl
          },
          sourceTaskId: task.id
        });
        task.result = asset;
        node.output = {
          ...asset,
          inputImageUrl: sourceImageUrl || undefined,
          sourceNodeIds: sourceNodes.map((item) => item.id)
        };
      }

      node.status = 'success';
      task.status = 'success';
      task.finishedAt = nowIso();
      writeDb(db);
    } catch (error) {
      task.status = 'failed';
      task.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      task.finishedAt = nowIso();
      node.status = 'failed';
      writeDb(db);
    }
  }, 2000);
}

export function createTask(params: {
  userId: string;
  canvasId: string;
  nodeId: string;
  taskType: TaskType;
  input: Record<string, unknown>;
}) {
  const { db, node } = findNodeContext(params.canvasId, params.nodeId);
  if (!node) {
    return undefined;
  }
  const modelId = String(params.input.model || '');
  const task: Task = {
    id: nanoid(),
    userId: params.userId,
    canvasId: params.canvasId,
    nodeId: params.nodeId,
    taskType: params.taskType,
    provider: modelId || 'mock-provider',
    status: 'pending',
    input: params.input,
    createdAt: nowIso()
  };
  node.status = 'pending';
  node.updatedAt = nowIso();
  db.tasks.unshift(task);
  writeDb(db);
  scheduleTaskExecution(task.id);
  return task;
}

export function getTask(taskId: string, userId: string) {
  const db = readDb();
  return db.tasks.find((item) => item.id === taskId && item.userId === userId);
}
