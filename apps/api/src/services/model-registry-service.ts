import { env } from '../config/env.js';
import type { ModelRegistryItem } from '../types/providers.js';

const fallbackModels: ModelRegistryItem[] = [
  {
    id: 'mock-text',
    label: 'Mock Text Model',
    provider: 'mock',
    taskTypes: ['text_generate']
  }
];

export function getModelRegistry() {
  if (!env.modelRegistryJson) {
    return fallbackModels;
  }

  try {
    const parsed = JSON.parse(env.modelRegistryJson) as ModelRegistryItem[];
    return parsed.length > 0 ? parsed : fallbackModels;
  } catch {
    return fallbackModels;
  }
}

export function findModelById(modelId: string | undefined) {
  if (!modelId) {
    return undefined;
  }
  return getModelRegistry().find((item) => item.id === modelId);
}

