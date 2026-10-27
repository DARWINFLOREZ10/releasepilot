import { authorized } from './auth';
import { evaluate, validateKey, validateRollout } from './core';
import { auditLog, createFlag, getFlag, listFlags, updateFlag } from './db';

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

export function listFlagsResponse(request: Request): Response {
  if (!authorized(request)) return json({ error: 'Unauthorized' }, 401);
  return json(listFlags());
}

export async function createFlagResponse(request: Request): Promise<Response> {
  if (!authorized(request)) return json({ error: 'Unauthorized' }, 401);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!body || typeof body !== 'object') return json({ error: 'Invalid body' }, 422);
  const { key, description } = body as Record<string, unknown>;
  if (typeof key !== 'string' || !validateKey(key) || typeof description !== 'string' || description.length > 200) {
    return json({ error: 'Invalid flag fields' }, 422);
  }
  try { return json(createFlag(key, description), 201); }
  catch { return json({ error: 'Flag already exists' }, 409); }
}

export function readFlagResponse(request: Request, key: string): Response {
  if (!authorized(request)) return json({ error: 'Unauthorized' }, 401);
  const flag = getFlag(key);
  if (!flag) return json({ error: 'Not found' }, 404);
  return json({ flag, audit: auditLog(key) });
}

export async function updateFlagResponse(request: Request, key: string): Promise<Response> {
  if (!authorized(request)) return json({ error: 'Unauthorized' }, 401);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!body || typeof body !== 'object') return json({ error: 'Invalid body' }, 422);
  const { version, enabled, rollout } = body as Record<string, unknown>;
  if (!Number.isInteger(version) || typeof enabled !== 'boolean' || typeof rollout !== 'number' || !validateRollout(rollout)) {
    return json({ error: 'Invalid update' }, 422);
  }
  if (!getFlag(key)) return json({ error: 'Not found' }, 404);
  const updated = updateFlag(key, version as number, enabled, rollout);
  return updated ? json(updated) : json({ error: 'Version conflict; reload and retry' }, 409);
}

export async function evaluateResponse(request: Request): Promise<Response> {
  if (!authorized(request)) return json({ error: 'Unauthorized' }, 401);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!body || typeof body !== 'object') return json({ error: 'Invalid body' }, 422);
  const { key, subject } = body as Record<string, unknown>;
  if (typeof key !== 'string' || typeof subject !== 'string' || subject.length < 1 || subject.length > 200) {
    return json({ error: 'Invalid evaluation' }, 422);
  }
  const flag = getFlag(key);
  if (!flag) return json({ error: 'Not found' }, 404);
  return json({ key, subject, version: flag.version, ...evaluate(flag, subject) });
}
