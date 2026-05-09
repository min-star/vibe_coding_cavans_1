import type { Response } from 'express';

export function badRequest(res: Response, message: string) {
  return res.status(400).json({ message });
}

export function unauthorized(res: Response, message = 'Unauthorized') {
  return res.status(401).json({ message });
}

export function notFound(res: Response, message = 'Not found') {
  return res.status(404).json({ message });
}

