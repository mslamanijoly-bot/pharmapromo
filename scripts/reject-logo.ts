// Rejette un logo récupéré à tort et lui rend sa vignette typographique.
//
//   npm run logos:rejeter -- mustela caudalie
//
// À utiliser après un coup d'œil sur la planche de contrôle. Trois effets :
//   • le fichier récupéré est supprimé ;
//   • la clé est inscrite dans REJETS (logo-sources.ts) — plus jamais retentée ;
//   • la vignette typographique est régénérée pour que l'étiquette reste correcte.
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOGOS } from '../src/lib/logos.ts';
import { REJETS } from './logo-sources.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'logos_jpeg');
const SRC = join(ROOT, 'scripts', 'logo-sources.ts');
const RAPPORT = join(ROOT, 'logos-rapport.json');

const keys = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!keys.length) { console.error('Usage : npm run logos:rejeter -- <clé> [<clé>…]'); process.exit(1); }

const known = new Set(LOGOS.map(e => e.key));
const inconnues = keys.filter(k => !known.has(k));
if (inconnues.length) { console.error(`Clés inconnues du catalogue : ${inconnues.join(', ')}`); process.exit(1); }

// 1) supprimer les fichiers récupérés. Le « .svg » nu en fait partie : c'est un logo récupéré,
// et le manifeste le préfère à tout le reste — l'oublier laisserait servir le fichier fautif.
// La vignette, elle, s'appelle « .vignette.svg » et doit survivre : c'est le repli.
for (const k of keys) {
  for (const ext of ['svg', 'png', 'jpg', 'jpeg', 'webp', 'gif']) {
    const f = join(OUT, `${k}.${ext}`);
    if (existsSync(f)) { unlinkSync(f); console.log(`  supprimé ${k}.${ext}`); }
  }
}

// 2) inscrire dans REJETS
const src = readFileSync(SRC, 'utf8');
const ajout = keys.filter(k => !REJETS.includes(k));
if (ajout.length) {
  const lignes = ajout.map(k => `  '${k}',`).join('\n');
  const next = src.replace(/(export const REJETS: string\[\] = \[)/, `$1\n${lignes}`);
  if (next === src) { console.error('Impossible de trouver REJETS dans logo-sources.ts'); process.exit(1); }
  writeFileSync(SRC, next, 'utf8');
  console.log(`  inscrit dans REJETS : ${ajout.join(', ')}`);
}

// 3) marquer l'échec au rapport pour que la planche affiche « vignette »
if (existsSync(RAPPORT)) {
  const r: { key: string; ok: boolean; why?: string }[] = JSON.parse(readFileSync(RAPPORT, 'utf8'));
  for (const k of keys) {
    const i = r.findIndex(x => x.key === k);
    const row = { key: k, ok: false, why: 'rejeté à la vérification visuelle' };
    if (i >= 0) r[i] = row; else r.push(row);
  }
  writeFileSync(RAPPORT, JSON.stringify(r, null, 2));
}

console.log(`\n${keys.length} logo(s) rejeté(s). Lancez « npm run gen:logos » pour rétablir les vignettes.`);
