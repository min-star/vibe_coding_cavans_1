import { Router } from 'express';
import { getModelRegistry } from '../services/model-registry-service.js';

export const modelRouter = Router();

modelRouter.get('/', (_, res) => {
  res.json({
    models: getModelRegistry()
  });
});
