import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import type { DatabaseSchema } from '../types/models.js';

const dbFilePath = path.join(env.dataDir, 'db.json');

const emptyDb: DatabaseSchema = {
  users: [],
  canvases: [],
  nodes: [],
  edges: [],
  tasks: [],
  assets: [],
  shares: []
};

function ensureDb() {
  fs.mkdirSync(env.dataDir, { recursive: true });
  if (!fs.existsSync(dbFilePath)) {
    fs.writeFileSync(dbFilePath, JSON.stringify(emptyDb, null, 2), 'utf-8');
  }
}

export function readDb(): DatabaseSchema {
  ensureDb();
  const raw = fs.readFileSync(dbFilePath, 'utf-8');
  return JSON.parse(raw) as DatabaseSchema;
}

export function writeDb(db: DatabaseSchema) {
  ensureDb();
  fs.writeFileSync(dbFilePath, JSON.stringify(db, null, 2), 'utf-8');
}

export function updateDb(mutator: (db: DatabaseSchema) => DatabaseSchema | void) {
  const db = readDb();
  const result = mutator(db);
  writeDb(result ?? db);
}

