import { redis, checkKey, unauthorized, notConfigured, LOGOS_KEY } from '@/lib/kv';

export const dynamic = 'force-dynamic';

interface Logo { id: string; name: string; src: string }

async function readLogos(): Promise<Logo[]> {
  const v = await redis!.get<Logo[]>(LOGOS_KEY);
  return Array.isArray(v) ? v : [];
}

// GET — bibliothèque de logos enregistrés
export async function GET(req: Request) {
  if (!redis) return notConfigured();
  if (!checkKey(req)) return unauthorized();
  return Response.json(await readLogos());
}

// POST — enregistrer un logo { name, src }
export async function POST(req: Request) {
  if (!redis) return notConfigured();
  if (!checkKey(req)) return unauthorized();
  const body = await req.json();
  if (!body?.src) return new Response('src manquant', { status: 400 });
  const logo: Logo = { id: Math.random().toString(36).slice(2, 10), name: String(body.name || 'Logo'), src: String(body.src) };
  const logos = await readLogos();
  logos.unshift(logo);
  await redis.set(LOGOS_KEY, logos.slice(0, 50));
  return Response.json(logo);
}

// DELETE — retirer un logo ?id=
export async function DELETE(req: Request) {
  if (!redis) return notConfigured();
  if (!checkKey(req)) return unauthorized();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return new Response('id manquant', { status: 400 });
  const logos = (await readLogos()).filter(l => l.id !== id);
  await redis.set(LOGOS_KEY, logos);
  return Response.json({ ok: true });
}
