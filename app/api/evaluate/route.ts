import { evaluateResponse } from '@/lib/http';

export const runtime = 'nodejs';

export function POST(request: Request) {
  return evaluateResponse(request);
}
