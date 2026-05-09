export type NodeType =
  | 'text'
  | 'image_upload'
  | 'image_upscale'
  | 'video_generate';

export type TaskType = 'text_generate' | 'image_generate' | 'image_upscale' | 'video_generate';

export type NodeStatus = 'idle' | 'pending' | 'running' | 'success' | 'failed';

export type AssetType = 'image' | 'video' | 'text' | 'file';

export type ReferenceType = 'prompt' | 'image' | 'video' | 'style' | 'input';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasNode {
  id: string;
  canvasId: string;
  type: NodeType;
  position: { x: number; y: number };
  status: NodeStatus;
  data: Record<string, unknown>;
  output?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasEdge {
  id: string;
  canvasId: string;
  sourceNodeId: string;
  targetNodeId: string;
  referenceType: ReferenceType;
  createdAt: string;
}

export interface Canvas {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  visibility: 'private' | 'shared';
  viewport: { x: number; y: number; zoom: number };
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  userId: string;
  canvasId: string;
  nodeId: string;
  taskType: TaskType;
  provider: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  input: Record<string, unknown>;
  result?: Record<string, unknown>;
  errorMessage?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface Asset {
  id: string;
  ownerId: string;
  type: AssetType;
  title: string;
  fileUrl: string;
  thumbnailUrl?: string;
  metadata: Record<string, unknown>;
  sourceTaskId?: string;
  createdAt: string;
}

export interface CanvasShare {
  id: string;
  canvasId: string;
  shareToken: string;
  createdBy: string;
  createdAt: string;
  expiredAt?: string;
}

export interface DatabaseSchema {
  users: User[];
  canvases: Canvas[];
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  tasks: Task[];
  assets: Asset[];
  shares: CanvasShare[];
}
