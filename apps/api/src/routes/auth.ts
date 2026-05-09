import { Router } from 'express';
import { nanoid } from 'nanoid';
import { readDb, writeDb } from '../data/store.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import type { User } from '../types/models.js';
import { comparePassword, hashPassword, signToken } from '../utils/auth.js';
import { badRequest, unauthorized } from '../utils/http.js';
import { nowIso } from '../utils/time.js';

export const authRouter = Router();

authRouter.post('/register', (req, res) => {
  const { email, password, name } = req.body as {
    email?: string;
    password?: string;
    name?: string;
  };

  if (!email || !password || !name) {
    return badRequest(res, 'email, password and name are required');
  }

  const db = readDb();
  if (db.users.some((item) => item.email === email)) {
    return badRequest(res, 'email already exists');
  }

  const now = nowIso();
  const user: User = {
    id: nanoid(),
    email,
    passwordHash: hashPassword(password),
    name,
    createdAt: now,
    updatedAt: now
  };

  db.users.push(user);
  writeDb(db);

  return res.status(201).json({
    token: signToken(user.id),
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  });
});

authRouter.post('/login', (req, res) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return badRequest(res, 'email and password are required');
  }

  const db = readDb();
  const user = db.users.find((item) => item.email === email);
  if (!user || !comparePassword(password, user.passwordHash)) {
    return unauthorized(res, 'invalid credentials');
  }

  return res.json({
    token: signToken(user.id),
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  });
});

authRouter.get('/me', requireAuth, (req: AuthedRequest, res) => {
  return res.json({
    user: {
      id: req.user!.id,
      email: req.user!.email,
      name: req.user!.name
    }
  });
});

