import { redisConfigured, teamKeyRequired } from '@/lib/kv';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({ configured: redisConfigured, keyRequired: teamKeyRequired });
}
