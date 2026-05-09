import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { env } from './config/env.js';
import { authRouter } from './routes/auth.js';
import { assetRouter } from './routes/assets.js';
import { canvasRouter } from './routes/canvases.js';
import { modelRouter } from './routes/models.js';
import { sharedRouter } from './routes/shared.js';
import { taskRouter } from './routes/tasks.js';

const app = express();

app.use(
  cors({
    origin: env.webAppUrl,
    credentials: true
  })
);
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'src/public/uploads')));

app.get('/api/health', (_, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api/canvases', canvasRouter);
app.use('/api/models', modelRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/assets', assetRouter);
app.use('/api/shared', sharedRouter);

app.listen(env.port, () => {
  console.log(`API server running at http://localhost:${env.port}`);
});
