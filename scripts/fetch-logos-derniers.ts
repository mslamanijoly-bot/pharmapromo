// Deux dernières sources pour les marques encore en vignette.
//
//   npm run logos:derniers
//   npm run logos:derniers -- thea compeed
//
// A · LES ICÔNES DÉCLARÉES PAR LE SITE — /apple-touch-icon.png et site.webmanifest.
//   Ce sont des URL fixes, prévues par le standard : aucune page à analyser, donc aucun
//   risque de ramener une bannière ou une photo d'ambiance. En contrepartie c'est souvent
//   l'emblème carré de la marque plutôt que sa signature complète — pour Thuasne, le
//   personnage ailé sur fond bleu. En rayon, ça reste identifiable.
//
// B · L'ARTICLE WIKIPÉDIA ATTEINT PAR WIKIDATA.
//   On part de l'entité Wikidata, dont on a déjà vérifié qu'elle est une organisation, et on
//   suit son lien vers l'article. Aucune recherche par mots-clés n'intervient : c'est ce qui
//   nous avait valu la mairie de La Roche-Posay. L'image d'infobox est presque toujours le logo.
//
// Brandfetch a été écarté : l'API publique ne répond plus qu'une page HTML.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG } from '../src/lib/logos.catalog.ts';
import { EXTRA_CATALOG } from '../src/lib/logos.extra.ts';
import { OFFICINE_CATALOG } from '../src/lib/logos.officine.ts';
import { LOGO_SOURCES, REJETS } from './logo-sources.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'public', 'logos_jpeg');
mkdirSync(DIR, { recursive: true });

const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36' };
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
function dims(b: Buffer, k: string) {
  if (k === 'png' && b.length > 24) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  return null;
}

const NATURES_OK = new Set(['Q4830453', 'Q783794', 'Q6881511', 'Q891723', 'Q43229', 'Q167037',
  'Q431289', 'Q1002697', 'Q19595382', 'Q507619', 'Q18388277', 'Q1058914', 'Q15911314',
  'Q219577', 'Q210167', 'Q3661311', 'Q2085381', 'Q1416431', 'Q5155040']);

const TOUS = [...CATALOG, ...EXTRA_CATALOG, ...OFFICINE_CATALOG];
const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
const aLogo = (k: string) => ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].some(e => existsSync(join(DIR, `${k}.${e}`)));
const cibles = TOUS.filter(e => only.length ? only.includes(e.key) : (!REJETS.includes(e.key) && !aLogo(e.key)));

console.log(`${cibles.length} marques sans logo réel\n`);
let ok = 0;

// ── A · icônes déclarées par le site ─────────────────────────────────
async function parLeSite(key: string): Promise<{ buf: Buffer; kind: string; via: string } | null> {
  const host = LOGO_SOURCES[key];
  if (!host) return null;
  const base = `https://${host.replace(/^https?:\/\//, '')}`;

  const candidats: string[] = [];
  // Le manifeste web déclare les icônes avec leur taille : on prend la plus grande.
  const man = await get(`${base}/site.webmanifest`) as string | null
    ?? await get(`${base}/manifest.json`) as string | null;
  if (man) {
    try {
      const icons = (JSON.parse(man).icons || []) as { src: string; sizes?: string }[];
      icons.sort((a, b) => (parseInt(b.sizes || '0') || 0) - (parseInt(a.sizes || '0') || 0));
      for (const i of icons.slice(0, 3)) candidats.push(i.src.startsWith('http') ? i.src : base + (i.src.startsWith('/') ? '' : '/') + i.src);
    } catch { /* manifeste illisible */ }
  }
  candidats.push(`${base}/apple-touch-icon.png`, `${base}/apple-touch-icon-precomposed.png`);

  for (const u of candidats) {
    const buf = await get(u, true) as Buffer | null;
    const kind = buf && sniff(buf);
    if (!buf || !kind || buf.length < 800) continue;
    const d = dims(buf, kind);
    if (d && Math.max(d.w, d.h) < 120) continue;      // une icône de 64 px baverait à l'impression
    return { buf, kind, via: u.includes('apple-touch') ? 'apple-touch-icon' : 'webmanifest' };
  }
  return null;
}

// ── B · Wikidata élargi, puis article Wikipédia ──────────────────────
// Deux corrections par rapport au premier essai, qui ne rendait jamais rien :
//   • on ratissait 4 résultats, et « Teva Pharmaceutical Industries » n'y était pas — la
//     recherche française rendait d'abord la chaîne de télé Téva et le Tevatron. On monte à 15,
//     et on interroge aussi en anglais, où les marques internationales sont mieux décrites.
//   • on s'arrêtait au premier NOM qui correspondait, alors qu'il faut le premier qui soit
//     une ORGANISATION. Un homonyme bien placé bloquait la recherche.
async function parWikipedia(nom: string): Promise<{ buf: Buffer; kind: string; via: string } | null> {
  const vus = new Set<string>();
  for (const langue of ['fr', 'en']) {
    const rech = await get(`https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=${langue}&uselang=${langue}&limit=15&search=${encodeURIComponent(nom)}`) as string | null;
    if (!rech) continue;

    for (const h of (JSON.parse(rech).search || []) as { id: string; label: string }[]) {
      if (vus.has(h.id)) continue;
      vus.add(h.id);
      if (!norm(h.label).includes(norm(nom)) && !norm(nom).includes(norm(h.label))) continue;

      const ent = await get(`https://www.wikidata.org/wiki/Special:EntityData/${h.id}.json`) as string | null;
      if (!ent) continue;
      const data = JSON.parse(ent).entities?.[h.id];
      const natures = (data?.claims?.P31 || []).map((c: { mainsnak?: { datavalue?: { value?: { id?: string } } } }) => c.mainsnak?.datavalue?.value?.id).filter(Boolean) as string[];
      if (!natures.some(n => NATURES_OK.has(n))) continue;   // il FAUT une organisation

      // B1 · la propriété « image du logo » si elle est renseignée
      const p154 = data?.claims?.P154?.[0]?.mainsnak?.datavalue?.value as string | undefined;
      if (p154) {
        const buf = await get(`https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p154)}?width=1000`, true) as Buffer | null;
        const kind = buf && sniff(buf);
        if (buf && kind && buf.length > 800) return { buf, kind, via: `${h.id} P154 ${p154.slice(0, 34)}` };
      }

      // B2 · à défaut, l'image d'infobox de son article — atteinte par le lien, pas par une recherche
      for (const [wiki, host] of [['frwiki', 'fr.wikipedia.org'], ['enwiki', 'en.wikipedia.org'], ['dewiki', 'de.wikipedia.org']] as [string, string][]) {
        const titre = data?.sitelinks?.[wiki]?.title as string | undefined;
        if (!titre) continue;
        const pi = await get(`https://${host}/w/api.php?action=query&format=json&formatversion=2&prop=pageimages&piprop=original&titles=${encodeURIComponent(titre)}`) as string | null;
        const src = pi && JSON.parse(pi).query?.pages?.[0]?.original?.source as string | undefined;
        if (!src) continue;
        // Une photo n'est pas un logo : on écarte ce qui ressemble à une illustration.
        if (/\.(jpe?g)$/i.test(src.split('?')[0]) && !/logo/i.test(src)) continue;
        const buf = await get(src, true) as Buffer | null;
        const kind = buf && sniff(buf);
        if (!buf || !kind || buf.length < 800) continue;
        return { buf, kind, via: `${wiki} « ${titre} »` };
      }
    }
  }
  return null;
}

for (const e of cibles) {
  await dodo(300);
  let r = await parLeSite(e.key);
  if (!r) r = await parWikipedia(e.name);
  if (!r) { console.log(`  · ${e.key.padEnd(28)} rien sur les deux sources`); continue; }
  writeFileSync(join(DIR, `${e.key}.${r.kind}`), r.buf);
  console.log(`  ✓ ${e.key.padEnd(28)} ${(e.key + '.' + r.kind).padEnd(24)} ${r.via}`);
  ok++;
}

console.log(`\n${ok}/${cibles.length} logos récupérés`);
console.log('À VÉRIFIER À L’ŒIL : ces sources donnent souvent l’emblème carré, parfois autre chose.');
