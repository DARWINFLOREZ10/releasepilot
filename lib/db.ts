import { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Flag } from './core';

export type FlagRow = Flag & { description: string; updated_at: string };

let instance: DatabaseSync | undefined;

export function database(): DatabaseSync {
  if (instance) return instance;
  const path = process.env.RELEASEPILOT_DB || 'data/releasepilot.db';
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS flags (
      key TEXT PRIMARY KEY, description TEXT NOT NULL,
      enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),
      rollout INTEGER NOT NULL CHECK(rollout BETWEEN 0 AND 100),
      salt TEXT NOT NULL, version INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flag_key TEXT NOT NULL, action TEXT NOT NULL,
      before_state TEXT, after_state TEXT NOT NULL,
      occurred_at TEXT NOT NULL
    );`);
  instance = db;
  return db;
}

function mapFlag(row: Record<string, unknown>): FlagRow {
  return { key: String(row.key), description: String(row.description), enabled: Boolean(row.enabled), rollout: Number(row.rollout), salt: String(row.salt), version: Number(row.version), updated_at: String(row.updated_at) };
}

export function listFlags(): FlagRow[] {
  return database().prepare('SELECT * FROM flags ORDER BY key').all().map(row => mapFlag(row));
}

export function getFlag(key: string): FlagRow | null {
  const row = database().prepare('SELECT * FROM flags WHERE key=?').get(key);
  return row ? mapFlag(row) : null;
}

export function createFlag(key: string, description: string): FlagRow {
  const db = database();
  const timestamp = new Date().toISOString();
  const salt = randomBytes(16).toString('hex');
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT INTO flags VALUES (?,?,?,?,?,?,?)').run(key, description, 0, 0, salt, 1, timestamp);
    const created = getFlag(key)!;
    db.prepare('INSERT INTO audit(flag_key,action,before_state,after_state,occurred_at) VALUES (?,?,?,?,?)').run(key, 'created', null, JSON.stringify(created), timestamp);
    db.exec('COMMIT');
    return created;
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

export function updateFlag(key: string, expectedVersion: number, enabled: boolean, rollout: number): FlagRow | null {
  const db = database();
  db.exec('BEGIN IMMEDIATE');
  try {
    const previous = getFlag(key);
    if (!previous || previous.version !== expectedVersion) { db.exec('ROLLBACK'); return null; }
    const timestamp = new Date().toISOString();
    db.prepare('UPDATE flags SET enabled=?,rollout=?,version=version+1,updated_at=? WHERE key=?').run(enabled ? 1 : 0, rollout, timestamp, key);
    const current = getFlag(key)!;
    db.prepare('INSERT INTO audit(flag_key,action,before_state,after_state,occurred_at) VALUES (?,?,?,?,?)').run(key, 'updated', JSON.stringify(previous), JSON.stringify(current), timestamp);
    db.exec('COMMIT');
    return current;
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

export function auditLog(key: string): Record<string, unknown>[] {
  return database().prepare('SELECT id,action,before_state,after_state,occurred_at FROM audit WHERE flag_key=? ORDER BY id DESC LIMIT 50').all(key);
}
