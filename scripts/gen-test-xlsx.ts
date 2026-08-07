// Écrit le classeur de test livré avec le dépôt (pharmapromo-import.xlsx).
//
//   npm run gen:xlsx
//
// Le contenu vient de src/lib/templates.ts — la MÊME source que le bouton « Télécharger le
// modèle » de l'application. Le fichier n'est donc jamais une copie qui dérive : import.test.ts
// vérifie qu'il correspond au modèle et qu'il se réimporte en étiquettes complètes.
//
// Exécuté par Node en « type stripping » : les imports relatifs portent donc l'extension .ts,
// ce que le tsconfig de l'app refuse — d'où l'exclusion de scripts/ côté tsconfig.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import writeXlsxFile from 'write-excel-file/node';
import { AUTO_TEMPLATE, TEMPLATE_NUMERIC_HEADERS } from '../src/lib/templates.ts';
import { pf } from '../src/lib/calc.ts';

// Le MÊME classeur est écrit partout où une copie existait déjà. Elles avaient divergé : celles
// de public/ montraient encore des marques de grande surface longtemps après la refonte du
// modèle. Un exemple périmé est pire que pas d'exemple — on le recopie en croyant bien faire.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SORTIES = [
  join(ROOT, 'pharmapromo-import.xlsx'),                    // classeur de référence du dépôt
  join(ROOT, 'test-import-complet.xlsx'),                   // copie de travail à la racine
  join(ROOT, 'public', 'test-import-complet.xlsx'),         // copie servie par l'application
  join(ROOT, 'public', 'modele-import-pharmapromo.xlsx'),   // ancien nom, gardé par prudence
];
const { headers, rows } = AUTO_TEMPLATE;

const headerRow = headers.map(h => ({ value: h, fontWeight: 'bold' as const, align: 'center' as const, backgroundColor: '#E7F2EC', color: '#0A5C3A', type: String }));
const dataRows = rows.map(r => r.map((cell, i) => {
  const h = headers[i] || '';
  const v = (cell || '').trim();
  if (!v) return { value: null, type: String };
  // Montants et quantités en NOMBRES ; la validité et les libellés restent du texte.
  if (TEMPLATE_NUMERIC_HEADERS.has(h)) return { value: pf(v), type: Number, format: /€/.test(h) ? '#,##0.00' : '0' };
  return { value: v, type: String };
}));
const columns = headers.map(h => ({ width: Math.max(14, h.length + 4) }));

// .toBuffer() plutôt que l'option filePath : avec filePath la promesse est tenue avant que le
// flux ne soit vidé, et le fichier peut être encore absent/tronqué juste après.
const buf = await writeXlsxFile([headerRow, ...dataRows], { columns, sheet: 'Tout-en-un', stickyRowsCount: 1 }).toBuffer();
for (const f of SORTIES) writeFileSync(f, buf);
console.log(`✓ ${rows.length} produits · ${new Set(rows.map(r => r[1])).size} catégories · ${headers.length} colonnes`);
for (const f of SORTIES) console.log(`  → ${f.replace(ROOT, '.')}`);
