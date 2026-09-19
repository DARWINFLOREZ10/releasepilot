import { NextResponse } from 'next/server';
import { authorized } from '@/lib/auth';
import { createFlag, listFlags } from '@/lib/db';
import { validateKey } from '@/lib/core';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(listFlags());
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid body' }, { status: 422 });
  const { key, description } = body as Record<string, unknown>;
  if (typeof key !== 'string' || !validateKey(key) || typeof description !== 'string' || description.length > 200) {
    return NextResponse.json({ error: 'Invalid flag fields' }, { status: 422 });
  }
  try { return NextResponse.json(createFlag(key, description), { status: 201 }); }
  catch { return NextResponse.json({ error: 'Flag already exists' }, { status: 409 }); }
}
