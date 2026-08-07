// Récupère les VRAIS logos depuis le site officiel de chaque marque.
//
//   npm run logos:recuperer              → toutes les marques de logo-sources.ts
//   npm run logos:recuperer -- avene nuxe
//
// Pourquoi le site de la marque et pas une recherche d'images : ici, aucune ambiguïté.
// Le logo servi par eau-thermale-avene.fr EST celui d'Avène. Une recherche, elle, avait ramené
// la mairie de La Roche-Posay et une carte de répartition de la belette (Mustela nivalis).
//
// Règle anti-piège, apprise à nos dépens : on n'accepte un <img> que si le NOM DE LA MARQUE
// figure dans le nom du fichier. Sans elle, mustela.fr nous donnait « Logo-B-CORP.png »,
// le logo de certification affiché en pied de page.
//
// Ordre de préférence, dicté par l'impression : le SVG est vectoriel donc net à toute taille,
// une icône de 32 px baverait sur une étiquette.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOGOS } from '../src/lib/logos.ts';
import { LOGO_SOURCES, REJETS } from './logo-sources.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'logos_jpeg');
mkdirSync(OUT, { recursive: true });

const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36', 'Accept-Language': 'fr-FR,fr;q=0.9' };

async function get(url: string, bin = false): Promise<{ ok: boolean; ct?: string; text?: string; buf?: Buffer; status?: number }> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 15000);
  try {
    const r = await fetch(url, { headers: UA, signal: c.signal, redirect: 'follow' });
    if (!r.ok) return { ok: false, status: r.status };
    const ct = r.headers.get('content-type') || '';
    return bin ? { ok: true, ct, buf: Buffer.from(await r.arrayBuffer()) } : { ok: true, ct, text: await r.text() };
  } catch { return { ok: false }; }
  finally { clearTimeout(t); }
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const abs = (u: string, host: string) => u.startsWith('//') ? 'https:' + u : u.startsWith('http') ? u : `https://${host}${u.startsWith('/') ? '' : '/'}${u}`;

// Type réel du fichier d'après ses octets : un serveur qui renvoie une page d'erreur en 200
// avec content-type image/png ne doit pas finir en logo.
function sniff(b: Buffer): string | null {
  if (b.length < 16) return null;
  if (b[0] === 0x89 && b[1] === 0x50) return 'png';
  if (b[0] === 0xff && b[1] === 0xd8) return 'jpg';
  if (b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return 'webp';
  if (b.subarray(0, 3).toString() === 'GIF') return 'gif';
  const head = b.subarray(0, 400).toString('utf8').trim().toLowerCase();
  if (head.startsWith('<?xml') || head.startsWith('<svg')) return head.includes('<svg') ? 'svg' : null;
  return null;
}

// Dimensions d'un PNG/JPEG : sert à écarter les favicons 16×16, illisibles à l'impression.
function dims(b: Buffer, kind: string): { w: number; h: number } | null {
  if (kind === 'png' && b.length > 24) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (kind === 'jpg') {
    let i = 2;
    while (i < b.length - 9) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}

type Cand = { url: string; rank: number; why: string; sure: boolean };

// Logos qui traînent sur tous les sites de cosmétique sans être celui de la marque :
// certifications, réseaux sociaux, moyens de paiement. mustela.fr nous a servi le B-Corp.
const NOT_A_BRAND = /b-?corp|cruelty|vegan|ecocert|cosmebio|leaping|iso-?\d|fsc|facebook|instagram|twitter|linkedin|youtube|tiktok|pinterest|whatsapp|visa|mastercard|paypal|cookie|payment|award|prix-|made-in/i;

// Le nom de la MARQUE doit être dans le NOM DE FICHIER, pas dans l'URL entière :
// sur mustela.fr, l'hôte contient « mustela », donc tout fichier passait le test.
const basename = (u: string) => { try { return decodeURIComponent(u.split(/[?#]/)[0].split('/').pop() || ''); } catch { return u; } };

function candidates(html: string, host: string, brand: string): Cand[] {
  const out: Cand[] = [];
  const b = norm(brand);
  const short = b.replace(/^(laboratoires?|groupe|le|la|les)/, '');
  const named = (u: string) => { const n = norm(basename(u)); return n.includes(b) || (short.length > 3 && n.includes(short)); };

  // 1) <img> qui parle de logo. Le nom de la marque dans le fichier = certitude ;
  //    sinon on garde quand même (beaucoup de sites nomment « logo_du_x1.png »), mais
  //    seulement dans l'en-tête du document et signalé « à vérifier ».
  const imgs = [...html.matchAll(/<img[^>]+>/gi)];
  for (const m of imgs) {
    const tag = m[0];
    const src = /(?:data-)?src=["']([^"']+)["']/i.exec(tag)?.[1];
    if (!src || /^data:/.test(src)) continue;
    if (!/logo/i.test(tag)) continue;
    if (NOT_A_BRAND.test(basename(src)) || NOT_A_BRAND.test(tag)) continue;
    const svg = /\.svg(\?|$)/i.test(src);
    if (named(src)) out.push({ url: abs(src, host), rank: svg ? 100 : 80, why: svg ? 'img logo+marque (svg)' : 'img logo+marque', sure: true });
    else if (m.index! < html.length * 0.5) out.push({ url: abs(src, host), rank: svg ? 55 : 50, why: 'img logo en-tête — À VÉRIFIER', sure: false });
  }

  // 2) fichier .svg dont le nom contient « logo » et la marque
  for (const m of html.matchAll(/["']([^"']*\.svg(?:\?[^"']*)?)["']/gi)) {
    const u = m[1];
    if (NOT_A_BRAND.test(basename(u))) continue;
    if (/logo/i.test(basename(u)) && named(u)) out.push({ url: abs(u, host), rank: 95, why: 'fichier svg logo+marque', sure: true });
  }

  // 3) apple-touch-icon : icône carrée de marque, en général 180 px — correct en dernier recours
  for (const tag of html.match(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]*>/gi) || []) {
    const href = /href=["']([^"']+)["']/i.exec(tag)?.[1];
    if (href) out.push({ url: abs(href, host), rank: 30, why: 'apple-touch-icon — À VÉRIFIER', sure: false });
  }

  // 4) icône déclarée en SVG : souvent le pictogramme de marque, vectoriel
  for (const tag of html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/gi) || []) {
    const href = /href=["']([^"']+)["']/i.exec(tag)?.[1];
    if (href && /\.svg/i.test(href)) out.push({ url: abs(href, host), rank: 35, why: 'icône svg — À VÉRIFIER', sure: false });
  }

  const seen = new Set<string>();
  return out.filter(c => !seen.has(c.url) && seen.add(c.url)).sort((a, b2) => b2.rank - a.rank);
}

const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
const targets = LOGOS.filter(e => LOGO_SOURCES[e.key] && !REJETS.includes(e.key) && (!only.length || only.includes(e.key)));

console.log(`${targets.length} marques à traiter\n`);
const report: { key: string; ok: boolean; why?: string; file?: string; px?: string; sure?: boolean; url?: string }[] = [];

for (const e of targets) {
  const host = LOGO_SOURCES[e.key];
  const home = await get(`https://${host}/`);
  if (!home.ok || !home.text) {
    console.log(`  ✗ ${e.key.padEnd(30)} accueil injoignable (${home.status ?? 'timeout'})`);
    report.push({ key: e.key, ok: false, why: `accueil ${home.status ?? 'timeout'}` });
    continue;
  }

  let done = false;
  for (const c of candidates(home.text, host, e.name).slice(0, 6)) {
    const img = await get(c.url, true);
    if (!img.ok || !img.buf) continue;
    const kind = sniff(img.buf);
    if (!kind) continue;
    if (img.buf.length < 400) continue;                       // trop petit pour être un logo
    const d = dims(img.buf, kind);
    if (d && Math.max(d.w, d.h) < 64) continue;               // favicon minuscule → inutilisable
    // On n'écrase une vignette QUE par un vrai fichier validé.
    // Les vignettes s'appellent désormais « <clé>.vignette.svg » : plus aucun risque de
    // collision, et c'est le manifeste qui donne la priorité au logo réel.
    const file = `${e.key}.${kind}`;
    writeFileSync(join(OUT, file), img.buf);
    const px = d ? `${d.w}×${d.h}` : 'vectoriel';
    console.log(`  ${c.sure ? '✓' : '?'} ${e.key.padEnd(30)} ${file.padEnd(26)} ${px.padEnd(12)} ${c.why}`);
    report.push({ key: e.key, ok: true, file, px, why: c.why, sure: c.sure, url: c.url });
    done = true;
    break;
  }
  if (!done) {
    console.log(`  ✗ ${e.key.padEnd(30)} aucun logo exploitable`);
    report.push({ key: e.key, ok: false, why: 'aucun candidat validé' });
  }
}

const ok = report.filter(r => r.ok).length;
console.log(`\n${ok}/${targets.length} logos récupérés`);
writeFileSync(join(ROOT, 'logos-rapport.json'), JSON.stringify(report, null, 2));
console.log('✓ logos-rapport.json');
