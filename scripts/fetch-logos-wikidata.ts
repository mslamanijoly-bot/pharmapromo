// Dernier recours pour les marques encore en vignette : Wikidata.
//
//   npm run logos:wikidata            → uniquement celles qui n'ont pas de logo réel
//   npm run logos:wikidata -- pfizer teva
//
// Pourquoi Wikidata plutôt qu'une recherche : chaque entreprise y porte une propriété
// « image du logo » (P154) qui pointe un fichier Commons. C'est une DONNÉE, pas une devinette
// — là où fouiller une page d'article nous avait ramené la mairie de La Roche-Posay.
//
// Deux garde-fous, parce qu'une homonymie sur Wikidata coûterait aussi cher qu'ailleurs :
//   • on n'accepte que les entités qui SONT une entreprise, un laboratoire ou une marque
//     (P31 « nature de l'élément »), ce qui écarte les communes et les personnes ;
//   • le nom de la marque doit se retrouver dans le libellé de l'entité.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG } from '../src/lib/logos.catalog.ts';
import { EXTRA_CATALOG } from '../src/lib/logos.extra.ts';
import { OFFICINE_CATALOG } from '../src/lib/logos.officine.ts';
import { REJETS } from './logo-sources.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'public', 'logos_jpeg');
mkdirSync(DIR, { recursive: true });

// STRICTEMENT ASCII : Node rejette les en-têtes HTTP contenant des caractères accentués,
// et l'erreur remonte comme un échec réseau — toutes les requêtes échouaient sans raison visible.
const UA = { 'User-Agent': 'pharmapromo-logos/1.0 (pharmacy shelf labels; mslamanijoly@gmail.com)' };
const dodo = (ms: number) => new Promise(r => setTimeout(r, ms));

const get = async (url: string, bin = false): Promise<string | Buffer | null> => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 20000);
  try {
    const r = await fetch(url, { headers: UA, signal: c.signal, redirect: 'follow' });
    if (!r.ok) return null;
    return bin ? Buffer.from(await r.arrayBuffer()) : await r.text();
  } catch { return null; }
  finally { clearTimeout(t); }
};

const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

function sniff(b: Buffer): string | null {
  if (b.length < 16) return null;
  if (b[0] === 0x89 && b[1] === 0x50) return 'png';
  if (b[0] === 0xff && b[1] === 0xd8) return 'jpg';
  if (b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return 'webp';
  const h = b.subarray(0, 300).toString('utf8').trim().toLowerCase();
  return h.includes('<svg') ? 'svg' : null;
}

// « Nature de l'élément » acceptées : entreprise, société, laboratoire, marque, groupe…
const NATURES_OK = new Set([
  'Q4830453', 'Q783794', 'Q6881511', 'Q891723', 'Q43229', 'Q167037', 'Q4830453',
  'Q431289', 'Q1002697', 'Q19595382', 'Q507619', 'Q18388277', 'Q1058914', 'Q15911314',
  'Q219577', 'Q210167', 'Q3661311', 'Q2085381', 'Q1416431', 'Q5155040',
]);

const TOUS = [...CATALOG, ...EXTRA_CATALOG, ...OFFICINE_CATALOG];
const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
const aLogo = (k: string) => ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].some(e => existsSync(join(DIR, `${k}.${e}`)));

const cibles = TOUS.filter(e => {
  // Une clé demandée explicitement PRIME sur la liste de rejet : celle-ci dit « le site de
  // cette marque ne donne rien de bon », pas « cette marque n'a pas de logo ». Wikidata est
  // une autre source, elle mérite sa chance.
  if (only.length) return only.includes(e.key);
  if (REJETS.includes(e.key)) return false;
  return !aLogo(e.key);
});

console.log(`${cibles.length} marques sans logo réel\n`);
let ok = 0;

for (const e of cibles) {
  await dodo(350);
  // 1) chercher l'entité
  const rech = await get(`https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=fr&uselang=fr&limit=5&search=${encodeURIComponent(e.name)}`) as string | null;
  if (!rech) { console.log(`  ✗ ${e.key.padEnd(30)} recherche injoignable`); continue; }
  const hits = (JSON.parse(rech).search || []) as { id: string; label: string; description?: string }[];
  if (!hits.length) { console.log(`  · ${e.key.padEnd(30)} inconnue de Wikidata`); continue; }

  let trouve = false;
  for (const h of hits.slice(0, 3)) {
    // Le nom de la marque doit se retrouver dans le libellé : écarte les homonymes lointains.
    if (!norm(h.label).includes(norm(e.name)) && !norm(e.name).includes(norm(h.label))) continue;

    const ent = await get(`https://www.wikidata.org/wiki/Special:EntityData/${h.id}.json`) as string | null;
    if (!ent) continue;
    const claims = JSON.parse(ent).entities?.[h.id]?.claims || {};

    // 2) la nature de l'élément doit être une organisation, pas une commune ni une personne
    const natures = (claims.P31 || []).map((c: { mainsnak?: { datavalue?: { value?: { id?: string } } } }) => c.mainsnak?.datavalue?.value?.id).filter(Boolean) as string[];
    if (natures.length && !natures.some(n => NATURES_OK.has(n))) {
      console.log(`  · ${e.key.padEnd(30)} ${h.id} n'est pas une organisation (${h.description || '?'})`);
      continue;
    }

    // 3) P154 = image du logo
    const fichier = claims.P154?.[0]?.mainsnak?.datavalue?.value as string | undefined;
    if (!fichier) continue;

    const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fichier)}?width=1000`;
    const buf = await get(url, true) as Buffer | null;
    const kind = buf && sniff(buf);
    if (!buf || !kind || buf.length < 500) continue;

    writeFileSync(join(DIR, `${e.key}.${kind}`), buf);
    console.log(`  ✓ ${e.key.padEnd(30)} ${h.id}  ${fichier.slice(0, 44)}`);
    ok++; trouve = true;
    break;
  }
  if (!trouve) console.log(`  · ${e.key.padEnd(30)} pas de logo déclaré`);
}

console.log(`\n${ok}/${cibles.length} logos récupérés depuis Wikidata`);
console.log('Enchaînez : npm run logos:normer && npm run logos:manifeste');
