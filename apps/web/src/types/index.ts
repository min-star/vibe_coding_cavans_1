export type NodeStatus = 'idle' | 'pending' | 'running' | 'success' | 'failed';
export type NodeType = 'text' | 'image_upload' | 'image_upscale' | 'video_generate';
export type ReferenceType = 'prompt' | 'image' | 'video' | 'style' | 'input';

export interface User {
  id: string;
  email: string;
  name: string;
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

export interface CanvasNodeData {
  label?: string;
  prompt?: string;
  notes?: string;
  assetId?: string;
  duration?: number;
  model?: string;
  quantity?: number;
  previewUrl?: string;
  videoPreviewUrl?: string;
  videoAssetId?: string;
  referenceImageUrl?: string;
  referenceImageAssetId?: string;
  aspectRatio?: '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '3:2' | '2:3' | '21:9' | 'adaptive';
  resolution?: '480p' | '720p' | '1080p';
  generationMode?: '文生视频' | '首帧' | '首尾帧';
  audioEnabled?: boolean;
  textColor?: string;
  textSize?: number;
  bold?: boolean;
  italic?: boolean;
}

export interface CanvasNode {
  id: string;
  canvasId: string;
  type: NodeType;
  position: { x: number; y: number };
  status: NodeStatus;
  data: CanvasNodeData & Record<string, unknown>;
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

export interface Asset {
  id: string;
  ownerId: string;
  type: 'image' | 'video' | 'text' | 'file';
  title: string;
  fileUrl: string;
  thumbnailUrl?: string;
  metadata: Record<string, unknown>;
  sourceTaskId?: string;
  createdAt: string;
}

export interface ShareResponse {
  share: {
    id: string;
    canvasId: string;
    shareToken: string;
    createdBy: string;
    createdAt: string;
  };
  shareUrl: string;
  webUrl: string;
}

export interface ModelOption {
  id: string;
  label: string;
  provider: 'mock' | 'openai-compatible';
  taskTypes: string[];
}

export interface ModelRegistryResponse {
  models: ModelOption[];
  textModels: ModelOption[];
  imageModels: ModelOption[];
  videoModels: ModelOption[];
}
