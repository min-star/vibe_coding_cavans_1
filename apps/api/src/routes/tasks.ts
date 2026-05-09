import { Router } from 'express';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { createTask, getTask } from '../services/task-service.js';
import type { TaskType } from '../types/models.js';
import { badRequest, notFound } from '../utils/http.js';

export const taskRouter = Router();

taskRouter.use(requireAuth);

function registerTaskRoute(path: string, taskType: TaskType) {
  taskRouter.post(path, (req: AuthedRequest, res) => {
    const { canvasId, nodeId, input } = req.body as {
      canvasId?: string;
      nodeId?: string;
      input?: Record<string, unknown>;
    };

    if (!canvasId || !nodeId || !input) {
      return badRequest(res, 'canvasId, nodeId and input are required');
    }

    const task = createTask({
      userId: req.user!.id,
      canvasId,
      nodeId,
      taskType,
      input
    });

    if (!task) {
      return notFound(res, 'Node not found');
    }

    return res.status(201).json({ taskId: task.id, status: task.status });
  });
}

registerTaskRoute('/text-generate', 'text_generate');
registerTaskRoute('/image-generate', 'image_generate');
registerTaskRoute('/image-upscale', 'image_upscale');
registerTaskRoute('/video-generate', 'video_generate');

taskRouter.get('/:id', (req: AuthedRequest, res) => {
  const task = getTask(req.params.id, req.user!.id);
  if (!task) {
    return notFound(res, 'Task not found');
  }
  return res.json(task);
});
