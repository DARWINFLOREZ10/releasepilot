import { NextResponse } from 'next/server';
import { authorized } from '@/lib/auth';
import { auditLog, getFlag, updateFlag } from '@/lib/db';
import { validateRollout } from '@/lib/core';

export const runtime = 'nodejs';
type Params = { params: Promise<{ key: string }> };

export async function GET(request: Request, { params }: Params) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { key } = await params;
  const flag = getFlag(key);
  if (!flag) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ flag, audit: auditLog(key) });
}

export async function PATCH(request: Request, { params }: Params) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { key } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid body' }, { status: 422 });
  const { version, enabled, rollout } = body as Record<string, unknown>;
  if (!Number.isInteger(version) || typeof enabled !== 'boolean' || typeof rollout !== 'number' || !validateRollout(rollout)) {
    return NextResponse.json({ error: 'Invalid update' }, { status: 422 });
  }
  if (!getFlag(key)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const updated = updateFlag(key, version as number, enabled, rollout);
  return updated ? NextResponse.json(updated) : NextResponse.json({ error: 'Version conflict; reload and retry' }, { status: 409 });
}
