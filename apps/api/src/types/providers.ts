import type { TaskType } from './models.js';

export interface ModelRegistryItem {
  id: string;
  label: string;
  provider: 'mock' | 'openai-compatible';
  taskTypes: TaskType[];
  apiKeyEnv?: string;
  baseUrl?: string;
  modelName?: string;
  imageSize?: string;
  outputFormat?: string;
  watermark?: boolean;
  videoEndpoint?: string;
}

export interface ModelRegistryBundle {
  textModels: ModelRegistryItem[];
  imageModels: ModelRegistryItem[];
  videoModels: ModelRegistryItem[];
  legacyModels: ModelRegistryItem[];
}
