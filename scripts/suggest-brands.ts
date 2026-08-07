// Extrait des classeurs les marques NON reconnues, pour enrichir logos.brands.ts.
//
//   npm run logos:suggerer                          → tous les .xlsx du projet
//   npm run logos:suggerer -- promo-officine.xlsx   → un classeur précis
//
// Le script ne devine JAMAIS le laboratoire : il ne sait pas qu'Eludril est un Pierre Fabre.
// Il fait le travail ingrat — repérer les mots qui ressemblent à des marques, les compter,
// écarter ce que le catalogue reconnaît déjà — et rend un bloc prêt à coller où il ne reste
// qu'à remplir la cible. C'est le tri qui prend du temps, pas la frappe.
import { readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import readXlsxFile from 'read-excel-file/node';
import { findLab } from '../src/lib/logos.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Mots qui ne sont jamais une marque : formes galéniques, contenants, unités, mots outils.
// Sans ce filtre la liste sort noyée sous « FLACON », « BOITE », « SPF » et « BIO ».
const STOP = new Set(`
le la les un une des du de d au aux et ou a à en sur pour par avec sans plus
gel creme crème lait spray stick baume serum sérum huile eau lotion mousse pate pâte
shampooing apres-shampooing masque savon solution sirop poudre granule granulé
comprime comprimé comprimes comprimés gelule gélule gelules gélules capsule capsules
sachet sachets ampoule ampoules dosette dosettes patch patchs pansement pansements
flacon tube pot boite boîte etui étui lot pack recharge duo trio coffret
ml cl l g kg mg ug mcg ui bt bte fl pce x
spf bio nat naturel visage corps mains pieds cheveux yeux levres lèvres peau
solaire hydratant hydratante nettoyant nettoyante apaisant apaisante reparateur réparateur
protecteur anti antiage age âge rides jour nuit soin soins fort forte extra
enfant enfants bebe bébé adulte homme femme senior junior
vitamine vitamines magnesium magnésium calcium fer zinc omega oméga
promo offre remise reduction réduction gratuit offert nouveau new
`.trim().split(/\s+/));

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Un candidat plausible : ≥ 3 lettres, pas un nombre, pas un mot outil.
// Les libellés d'officine écrivent la marque en CAPITALES (« Bain de bouche ELUDRIL ») :
// on garde la casse d'origine pour pondérer ensuite.
function candidates(label: string): { word: string; caps: boolean }[] {
  return label
    .split(/[^\p{L}\p{N}'’-]+/u)
    .filter(w => w.replace(/[^\p{L}]/gu, '').length >= 3)
    .filter(w => !/^\d/.test(w))
    .filter(w => !STOP.has(norm(w).replace(/[^a-z-]/g, '')))
    .map(w => ({ word: w, caps: w === w.toUpperCase() }));
}

const files = process.argv.slice(2).filter(a => !a.startsWith('--'));
const targets = files.length ? files : readdirSync(ROOT).filter(f => /\.xlsx$/i.test(f) && !/-logos\.xlsx$/i.test(f));
if (!targets.length) { console.error('Aucun classeur .xlsx trouvé.'); process.exit(1); }

const PROD_KW = /produit|nom|libell|d[eé]sign|article|d[eé]nom/i;
const LAB_KW = /laboratoire|labo\b|marque|fabricant|fournisseur|groupe/i;

type Hit = { count: number; caps: number; examples: Set<string> };
const hits = new Map<string, Hit>();
let scanned = 0, already = 0;

for (const f of targets) {
  const raw = (await readXlsxFile(join(ROOT, f))) as unknown;
  let rows: unknown[] = Array.isArray(raw) ? raw : [];
  if (rows.length && !Array.isArray(rows[0]) && typeof rows[0] === 'object' && rows[0] !== null && 'data' in (rows[0] as object)) {
    rows = ((rows[0] as { data?: unknown[] }).data) || [];
  }
  const grid = rows.map(r => (Array.isArray(r) ? r : [])) as unknown[][];
  if (grid.length < 2) continue;

  const header = grid[0].map(c => String(c ?? '').trim());
  const col = header.findIndex(h => LAB_KW.test(h)) >= 0
    ? header.findIndex(h => LAB_KW.test(h))
    : header.findIndex(h => PROD_KW.test(h));
  if (col < 0) continue;

  for (const r of grid.slice(1)) {
    const label = String(r[col] ?? '').trim();
    if (!label) continue;
    scanned++;
    if (findLab(label).status === 'found') { already++; continue; }
    // On ne propose que des mots qui ne mènent nulle part SEULS : si « Avène » traînait
    // dans un libellé par ailleurs non reconnu, inutile de le resuggérer.
    for (const { word, caps } of candidates(label)) {
      if (findLab(word).status === 'found') continue;
      const k = word.toLowerCase();
      const h = hits.get(k) ?? { count: 0, caps: 0, examples: new Set<string>() };
      h.count++; if (caps) h.caps++;
      if (h.examples.size < 3) h.examples.add(label);
      hits.set(k, h);
    }
  }
}

// Tri : les mots écrits en capitales d'abord (signal de marque le plus fiable en officine),
// puis les plus fréquents.
const ranked = [...hits.entries()]
  .map(([w, h]) => ({ w, ...h, score: h.caps * 10 + h.count }))
  .sort((a, b) => b.score - a.score || a.w.localeCompare(b.w));

const pretty = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
const lines = ranked.map(r =>
  `  '${pretty(r.w)}': '', // ${r.count}×${r.caps ? ' CAPS' : ''} — ex. ${[...r.examples][0]}`);

const out = join(ROOT, 'marques-a-completer.txt');
writeFileSync(out, `// Coller dans src/lib/logos.brands.ts, puis remplir chaque '' par une clé du catalogue.
// Laisser vide ou supprimer la ligne pour ignorer une marque.
${lines.join('\n')}
`, 'utf8');

console.log(`Classeurs : ${targets.join(', ')}`);
console.log(`${scanned} libellés · ${already} déjà reconnus · ${ranked.length} candidats`);
console.log(`\nTop 25 :`);
for (const r of ranked.slice(0, 25)) console.log(`  ${r.w.padEnd(24)} ${String(r.count).padStart(3)}×${r.caps ? '  CAPS' : ''}`);
console.log(`\n✓ ${out}`);
