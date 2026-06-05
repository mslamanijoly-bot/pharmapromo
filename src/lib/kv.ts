import { Redis } from '@upstash/redis';

// Supporte les variables de l'intégration Vercel KV (KV_REST_API_*)
// comme celles d'Upstash direct (UPSTASH_REDIS_REST_*).
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;
export const redisConfigured = !!redis;
export const teamKeyRequired = !!process.env.TEAM_KEY;

/** Vérifie le mot de passe d'équipe (header x-team-key). */
export function checkKey(req: Request): boolean {
  if (!process.env.TEAM_KEY) return true; // pas de mot de passe configuré → ouvert
  return req.headers.get('x-team-key') === process.env.TEAM_KEY;
}

export const IDS_KEY = 'pp:ids';
export const plancheKey = (id: string) => `pp:planche:${id}`;
export const LOGOS_KEY = 'pp:logos';

export function unauthorized() {
  return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });
}
export function notConfigured() {
  return new Response(JSON.stringify({ error: 'backend non configuré' }), { status: 503, headers: { 'content-type': 'application/json' } });
}
