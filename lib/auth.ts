import { timingSafeEqual } from 'node:crypto';

export function authorized(request: Request): boolean {
  const expected = process.env.ADMIN_KEY;
  const actual = request.headers.get('x-admin-key') || '';
  if (!expected || expected.length < 24 || !actual) return false;
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
