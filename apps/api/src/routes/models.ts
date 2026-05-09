import { Router } from 'express';
import { getAllModels, getModelRegistryBundle } from '../services/model-registry-service.js';

export const modelRouter = Router();

modelRouter.get('/', (_, res) => {
  const bundle = getModelRegistryBundle();
  res.json({
    models: getAllModels(),
    textModels: bundle.textModels,
    imageModels: bundle.imageModels
  });
});
