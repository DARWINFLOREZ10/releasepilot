import { readFlagResponse, updateFlagResponse } from '@/lib/http';

export const runtime = 'nodejs';
type Params = { params: Promise<{ key: string }> };

export async function GET(request: Request, { params }: Params) {
  const { key } = await params;
  return readFlagResponse(request, key);
}

export async function PATCH(request: Request, { params }: Params) {
  const { key } = await params;
  return updateFlagResponse(request, key);
}
