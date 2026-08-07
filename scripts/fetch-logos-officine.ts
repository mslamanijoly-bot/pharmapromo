// Récupère les logos depuis LE SITE DE L'OFFICINE — la meilleure source de toutes.
//
//   npm run logos:officine
//
// Le site de la pharmacie publie une page « Toutes nos marques » et, pour chacune, une fiche
// portant son logo officiel. Trois avantages décisifs sur tout ce qu'on a essayé avant :
//
//   • C'est EXACTEMENT l'assortiment de l'officine — ni marques inutiles, ni oubli.
//   • Les logos sont officiels et en haute définition, déjà détourés sur fond blanc.
//   • L'attribut alt porte le nom de la marque : la correspondance est certaine, là où
//     une recherche d'images ramenait la mairie de La Roche-Posay ou une belette pour Mustela.
//
// Le script écrit aussi src/lib/logos.officine.ts, un catalogue complet de ces marques,
// fusionné au reste par logos.ts. Les marques déjà connues gardent leur clé d'origine ;
// les nouvelles en reçoivent une dérivée de leur nom.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG } from '../src/lib/logos.catalog.ts';
import { EXTRA_CATALOG } from '../src/lib/logos.extra.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'logos_jpeg');
mkdirSync(OUT, { recursive: true });

const SITE = process.env.OFFICINE_URL || 'https://pharmacie.homme-de-fer.com';
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36' };

const dodo = (ms: number) => new Promise(r => setTimeout(r, ms));

// Le site coupe au-delà d'une trentaine de requêtes rapprochées. On s'espace, et on réessaie
// en allongeant l'attente : c'est un serveur d'officine, pas une API — autant être poli.
const get = async (url: string, bin = false, essais = 3): Promise<string | Buffer | null> => {
  for (let i = 0; i < essais; i++) {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 25000);
    try {
      const r = await fetch(url, { headers: UA, signal: c.signal, redirect: 'follow' });
      clearTimeout(t);
      if (r.ok) return bin ? Buffer.from(await r.arrayBuffer()) : await r.text();
      if (r.status === 404) return null;                 // inutile d'insister
      await dodo(1500 * (i + 1) ** 2);                   // 1,5 s · 6 s · 13,5 s
    } catch { clearTimeout(t); await dodo(1500 * (i + 1) ** 2); }
  }
  return null;
};

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/&(amp|#0?39|quot);/g, '_').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#0?39;/g, '’').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').trim();

function sniff(b: Buffer): string | null {
  if (b.length < 16) return null;
  if (b[0] === 0x89 && b[1] === 0x50) return 'png';
  if (b[0] === 0xff && b[1] === 0xd8) return 'jpg';
  if (b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return 'webp';
  if (b.subarray(0, 3).toString() === 'GIF') return 'gif';
  const h = b.subarray(0, 300).toString('utf8').trim().toLowerCase();
  return h.includes('<svg') ? 'svg' : null;
}

// Clés déjà en service : une marque du site qui correspond à une entrée existante doit
// réutiliser SA clé, sinon on se retrouverait avec « avene » et « avene_eau_thermale »
// pointant deux logos du même laboratoire — donc une ambiguïté, donc aucun logo.
const connues = new Map<string, string>();
for (const e of [...CATALOG, ...EXTRA_CATALOG]) {
  for (const a of [e.key, e.name, ...e.aliases]) connues.set(norm(a), e.key);
}

console.log(`Source : ${SITE}\n`);
const liste = await get(`${SITE}/medicaments-parapharmacie/toutes-nos-marques`) as string | null;
if (!liste) { console.error('Page « toutes nos marques » injoignable.'); process.exit(1); }

const marques = new Map<string, { id: string; slug: string; nom: string }>();
for (const m of liste.matchAll(/href="\/marques\/(\d+)-([^"]+)"[^>]*>\s*([^<]{1,80}?)\s*<\/a>/gi)) {
  marques.set(m[2], { id: m[1], slug: m[2], nom: decode(m[3]) });
}
console.log(`${marques.size} marques listées sur le site\n`);

type Entree = { key: string; name: string; group: string; category: string; aliases: string[]; image: string };
const entrees: Entree[] = [];
let ok = 0, sansLogo = 0;

let n = 0;
for (const [, mq] of marques) {
  if (n++) await dodo(450);                              // ~2 fiches par seconde
  if (n % 40 === 0) { console.log(`     … ${n}/${marques.size}, pause`); await dodo(4000); }

  const page = await get(`${SITE}/marques/${mq.id}-${mq.slug}`) as string | null;
  if (!page) { console.log(`  ✗ ${mq.nom.padEnd(34)} fiche injoignable`); sansLogo++; continue; }

  // Le logo de la fiche : <img class="mw-100" src="/uploads/marques/...">. On exige que le
  // chemin soit bien /uploads/marques/ — c'est ce qui distingue le logo des visuels produit.
  let url: string | null = null;
  for (const t of page.match(/<img[^>]+>/gi) || []) {
    const src = /src="([^"]+)"/i.exec(t)?.[1];
    if (src && /\/uploads\/marques\//i.test(src)) { url = src.startsWith('http') ? src : SITE + src; break; }
  }
  if (!url) { console.log(`  · ${mq.nom.padEnd(34)} pas de logo sur la fiche`); sansLogo++; continue; }

  const buf = await get(url, true) as Buffer | null;
  const kind = buf && sniff(buf);
  if (!buf || !kind || buf.length < 500) { console.log(`  ✗ ${mq.nom.padEnd(34)} logo illisible`); sansLogo++; continue; }

  const key = connues.get(norm(mq.nom)) || connues.get(norm(mq.slug)) || norm(mq.slug);
  writeFileSync(join(OUT, `${key}.${kind}`), buf);
  entrees.push({
    key, name: mq.nom, group: mq.nom, category: 'Officine',
    aliases: [...new Set([mq.nom, mq.slug.replace(/-/g, ' ')])],
    image: `logos_jpeg/${key}.${kind}`,
  });
  ok++;
  console.log(`  ✓ ${mq.nom.padEnd(34)} ${key}.${kind}`);
}

// Catalogue des marques de l'officine, en excluant celles déjà décrites ailleurs :
// on ne garde ici que les NOUVELLES, pour ne pas dupliquer une clé existante.
const dejaLa = new Set([...CATALOG, ...EXTRA_CATALOG].map(e => e.key));
const nouvelles = entrees.filter(e => !dejaLa.has(e.key));
const vues = new Set<string>();
const uniques = nouvelles.filter(e => !vues.has(e.key) && vues.add(e.key));

const fichier = `// ──────────────────────────────────────────────────────────────────────
//  MARQUES DE L'OFFICINE  ·  GÉNÉRÉ, NE PAS ÉDITER À LA MAIN
//
//  Produit par \`npm run logos:officine\` depuis la page « Toutes nos marques » du site
//  de la pharmacie. C'est l'assortiment RÉEL : ni marque inutile, ni oubli.
//  ${uniques.length} marques qui ne figuraient pas déjà au catalogue.
// ──────────────────────────────────────────────────────────────────────
import type { CatalogEntry } from './logos.catalog.ts';

export const OFFICINE_CATALOG: CatalogEntry[] = ${JSON.stringify(uniques, null, 2)};
`;
writeFileSync(join(ROOT, 'src', 'lib', 'logos.officine.ts'), fichier, 'utf8');

console.log(`\n${ok} logos récupérés · ${sansLogo} sans logo`);
console.log(`✓ src/lib/logos.officine.ts — ${uniques.length} nouvelles marques`);
