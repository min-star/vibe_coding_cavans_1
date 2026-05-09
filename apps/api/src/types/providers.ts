import type { TaskType } from './models.js';

export interface ModelRegistryItem {
  id: string;
  label: string;
  provider: 'mock' | 'openai-compatible';
  taskTypes: TaskType[];
  apiKeyEnv?: string;
  baseUrl?: string;
  modelName?: string;
}

