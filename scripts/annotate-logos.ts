// Ajoute les colonnes de logo à un classeur, sans toucher aux colonnes existantes.
//
//   npm run logos:annoter -- test-import-complet.xlsx
//   npm run logos:annoter -- promo-officine-import.xlsx --sur-place
//
// Écrit par défaut à côté, en « …-logos.xlsx » : le classeur d'origine n'est jamais écrasé
// tant qu'on n'a pas demandé --sur-place. Produit aussi laboratoires_non_trouves.csv, qui
// liste les libellés sans correspondance — c'est la liste de courses pour enrichir le catalogue.
//
// Quatre colonnes ajoutées :
//   logo_path     chemin relatif du visuel (logos_jpeg/…)
//   logo_status   found · ambiguous · not_found
//   matched_name  nom de l'entrée du catalogue retenue
//   match_method  exact · alias · none
import { writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import readXlsxFile from 'read-excel-file/node';
import writeXlsxFile from 'write-excel-file/node';
import { findLab } from '../src/lib/logos.ts';

const args = process.argv.slice(2);
const surPlace = args.includes('--sur-place');
const src = args.find(a => !a.startsWith('--'));
if (!src) {
  console.error('Usage : npm run logos:annoter -- <classeur.xlsx> [--sur-place]');
  process.exit(1);
}

// Selon le classeur, read-excel-file rend soit les lignes, soit [{ sheet, data }].
// Même dénormalisation que readAsApp() dans import.test.ts.
const raw = (await readXlsxFile(src)) as unknown;
let rows: unknown[] = Array.isArray(raw) ? raw : [];
if (rows.length && !Array.isArray(rows[0]) && typeof rows[0] === 'object' && rows[0] !== null && 'data' in (rows[0] as object)) {
  rows = ((rows[0] as { data?: unknown[] }).data) || [];
}
const grid = rows.map(r => (Array.isArray(r) ? r : [])) as unknown[][];
if (!grid.length) { console.error('Classeur vide.'); process.exit(1); }

const header = grid[0].map(c => String(c ?? '').trim());
// La colonne à lire : une vraie colonne « laboratoire / marque » si elle existe, sinon le
// libellé produit — c'est le cas des modèles PharmaPromo, où la marque est dans le nom.
const LAB_KW = /laboratoire|labo\b|marque|fabricant|fournisseur|groupe/i;
const PROD_KW = /produit|nom|libell|d[eé]sign|article|d[eé]nom/i;
let col = header.findIndex(h => LAB_KW.test(h));
const source = col >= 0 ? 'colonne laboratoire' : 'libellé produit';
if (col < 0) col = header.findIndex(h => PROD_KW.test(h));
if (col < 0) { console.error('Aucune colonne « laboratoire » ni « produit » trouvée.'); process.exit(1); }

console.log(`Source de recherche : « ${header[col]} » (${source})`);

const NEW = ['logo_path', 'logo_status', 'matched_name', 'match_method'];
const already = NEW.filter(n => header.includes(n));
if (already.length) console.log(`Colonnes déjà présentes, elles seront réécrites : ${already.join(', ')}`);
const keep = header.map((h, i) => (NEW.includes(h) ? -1 : i)).filter(i => i >= 0);

// Cellule → objet write-excel-file, en conservant le type d'origine (nombre, date, texte).
const cell = (v: unknown) => {
  if (v == null || v === '') return { value: null, type: String };
  if (typeof v === 'number') return { value: v, type: Number };
  if (v instanceof Date) return { value: v, type: Date, format: 'dd/mm/yyyy' };
  return { value: String(v), type: String };
};

const headerRow = [...keep.map(i => header[i]), ...NEW]
  .map(h => ({ value: h, fontWeight: 'bold' as const, type: String }));

const introuvables = new Map<string, number>();
let found = 0, ambiguous = 0;

const body = grid.slice(1).map(r => {
  const texte = String(r[col] ?? '').trim();
  const m = findLab(texte);
  if (m.status === 'found') found++;
  else if (m.status === 'ambiguous') ambiguous++;
  else if (texte) introuvables.set(texte, (introuvables.get(texte) ?? 0) + 1);
  return [
    ...keep.map(i => cell(r[i])),
    cell(m.image), cell(m.status), cell(m.name), cell(m.method),
  ];
});

const out = surPlace ? src : join(dirname(src), basename(src).replace(/\.xlsx$/i, '') + '-logos.xlsx');
const buf = await writeXlsxFile([headerRow, ...body], { stickyRowsCount: 1 }).toBuffer();
writeFileSync(out, buf);

// CSV des libellés sans correspondance — séparateur « ; » pour qu'Excel FR l'ouvre direct.
const csvPath = join(dirname(src), 'laboratoires_non_trouves.csv');
const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
const csv = ['valeur;occurrences', ...[...introuvables.entries()]
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .map(([v, n]) => `${q(v)};${n}`)].join('\r\n');
writeFileSync(csvPath, '﻿' + csv, 'utf8');

console.log(`✓ ${out}`);
console.log(`  ${body.length} lignes · ${found} reconnues · ${ambiguous} ambiguës · ${introuvables.size} libellés sans correspondance`);
console.log(`✓ ${csvPath}`);
