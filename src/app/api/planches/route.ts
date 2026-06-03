import { redis, checkKey, unauthorized, notConfigured, IDS_KEY, plancheKey } from '@/lib/kv';

export const dynamic = 'force-dynamic';

interface Meta { id: string; pharmacy: string; plan: string; updatedAt: number; }

function uid() { return Math.random().toString(36).slice(2, 10); }

// GET — liste des planches (métadonnées)
export async function GET(req: Request) {
  if (!redis) return notConfigured();
  if (!checkKey(req)) return unauthorized();
  const ids = (await redis.smembers(IDS_KEY)) as string[];
  if (!ids.length) return Response.json([]);
  const raw = await redis.mget<(Record<string, unknown> | null)[]>(...ids.map(plancheKey));
  const metas: Meta[] = [];
  ids.forEach((id, i) => {
    const p = raw[i] as { pharmacy?: string; plan?: string; updatedAt?: number } | null;
    if (p) metas.push({ id, pharmacy: p.pharmacy || 'Sans nom', plan: p.plan || '', updatedAt: p.updatedAt || 0 });
  });
  metas.sort((a, b) => b.updatedAt - a.updatedAt);
  return Response.json(metas);
}

// POST — créer une planche
export async function POST(req: Request) {
  if (!redis) return notConfigured();
  if (!checkKey(req)) return unauthorized();
  const body = await req.json();
  const id = uid();
  const project = { ...body, updatedAt: Date.now() };
  await redis.set(plancheKey(id), project);
  await redis.sadd(IDS_KEY, id);
  return Response.json({ id });
}
