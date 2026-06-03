import { redis, checkKey, unauthorized, notConfigured, IDS_KEY, plancheKey } from '@/lib/kv';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

// GET — une planche complète
export async function GET(req: Request, { params }: Ctx) {
  if (!redis) return notConfigured();
  if (!checkKey(req)) return unauthorized();
  const { id } = await params;
  const project = await redis.get(plancheKey(id));
  if (!project) return new Response('introuvable', { status: 404 });
  return Response.json(project);
}

// PUT — sauvegarder une planche
export async function PUT(req: Request, { params }: Ctx) {
  if (!redis) return notConfigured();
  if (!checkKey(req)) return unauthorized();
  const { id } = await params;
  const body = await req.json();
  const project = { ...body, updatedAt: Date.now() };
  await redis.set(plancheKey(id), project);
  await redis.sadd(IDS_KEY, id);
  return Response.json({ ok: true, updatedAt: project.updatedAt });
}

// DELETE — supprimer une planche
export async function DELETE(req: Request, { params }: Ctx) {
  if (!redis) return notConfigured();
  if (!checkKey(req)) return unauthorized();
  const { id } = await params;
  await redis.del(plancheKey(id));
  await redis.srem(IDS_KEY, id);
  return Response.json({ ok: true });
}
