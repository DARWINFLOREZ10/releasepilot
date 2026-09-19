import { NextResponse } from 'next/server';
import { authorized } from '@/lib/auth';
import { evaluate } from '@/lib/core';
import { getFlag } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid body' }, { status: 422 });
  const { key, subject } = body as Record<string, unknown>;
  if (typeof key !== 'string' || typeof subject !== 'string' || subject.length < 1 || subject.length > 200) {
    return NextResponse.json({ error: 'Invalid evaluation' }, { status: 422 });
  }
  const flag = getFlag(key);
  if (!flag) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ key, subject, version: flag.version, ...evaluate(flag, subject) });
}
