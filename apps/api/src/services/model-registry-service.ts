import { env } from '../config/env.js';
import type { ModelRegistryBundle, ModelRegistryItem } from '../types/providers.js';

const fallbackTextModels: ModelRegistryItem[] = [
  {
    id: 'mock-text',
    label: 'Mock Text Model',
    provider: 'mock',
    taskTypes: ['text_generate']
  }
];

const fallbackImageModels: ModelRegistryItem[] = [
  {
    id: 'mock-image',
    label: 'Mock Image Model',
    provider: 'mock',
    taskTypes: ['image_generate', 'image_upscale']
  }
];

const fallbackVideoModels: ModelRegistryItem[] = [
  {
    id: 'mock-video',
    label: 'Mock Video Model',
    provider: 'mock',
    taskTypes: ['video_generate']
  }
];

function safeParseRegistry(raw: string) {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as ModelRegistryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function dedupeModels(models: ModelRegistryItem[]) {
  const registry = new Map<string, ModelRegistryItem>();

  for (const model of models) {
    if (!model?.id) {
      continue;
    }
    registry.set(model.id, model);
  }

  return Array.from(registry.values());
}

function filterByTask(models: ModelRegistryItem[], taskType: 'text_generate' | 'image_generate' | 'image_upscale') {
  return models.filter((model) => model.taskTypes.includes(taskType));
}

function filterVideoModels(models: ModelRegistryItem[]) {
  return models.filter((model) => model.taskTypes.includes('video_generate'));
}

export function getModelRegistryBundle(): ModelRegistryBundle {
  const legacyModels = safeParseRegistry(env.modelRegistryJson);
  const explicitTextModels = safeParseRegistry(env.textModelRegistryJson);
  const explicitImageModels = safeParseRegistry(env.imageModelRegistryJson);
  const explicitVideoModels = safeParseRegistry(env.videoModelRegistryJson);

  const textModels = dedupeModels([
    ...explicitTextModels,
    ...filterByTask(legacyModels, 'text_generate'),
    ...fallbackTextModels
  ]);

  const imageModels = dedupeModels([
    ...explicitImageModels,
    ...filterByTask(legacyModels, 'image_generate'),
    ...filterByTask(legacyModels, 'image_upscale'),
    ...fallbackImageModels
  ]);

  const videoModels = dedupeModels([
    ...explicitVideoModels,
    ...filterVideoModels(legacyModels),
    ...fallbackVideoModels
  ]);

  return {
    textModels,
    imageModels,
    videoModels,
    legacyModels
  };
}

export function getAllModels() {
  const bundle = getModelRegistryBundle();
  return dedupeModels([...bundle.textModels, ...bundle.imageModels, ...bundle.videoModels]);
}

export function findModelById(modelId: string | undefined) {
  if (!modelId) {
    return undefined;
  }

  const allModels = getAllModels();
  const exactMatch = allModels.find((item) => item.id === modelId);
  if (exactMatch) {
    return exactMatch;
  }

  const normalizedModelId = modelId.toLowerCase();
  return allModels.find((item) => {
    const normalizedId = item.id.toLowerCase();
    const normalizedName = item.modelName?.toLowerCase();
    return normalizedId === normalizedModelId || normalizedName === normalizedModelId;
  });
}
