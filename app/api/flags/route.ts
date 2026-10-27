import { createFlagResponse, listFlagsResponse } from '@/lib/http';

export const runtime = 'nodejs';

export function GET(request: Request) {
  return listFlagsResponse(request);
}

export function POST(request: Request) {
  return createFlagResponse(request);
}
