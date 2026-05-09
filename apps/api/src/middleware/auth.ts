import type { NextFunction, Request, Response } from 'express';
import { readDb } from '../data/store.js';
import { unauthorized } from '../utils/http.js';
import { verifyToken } from '../utils/auth.js';
import type { User } from '../types/models.js';

export interface AuthedRequest extends Request {
  user?: User;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    return unauthorized(res);
  }

  try {
    const payload = verifyToken(token);
    const db = readDb();
    const user = db.users.find((item) => item.id === payload.userId);
    if (!user) {
      return unauthorized(res);
    }
    req.user = user;
    return next();
  } catch {
    return unauthorized(res);
  }
}

