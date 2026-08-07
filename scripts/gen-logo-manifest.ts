// Décide, pour chaque marque, QUEL fichier sert de logo — et l'écrit dans un manifeste.
//
//   npm run logos:manifeste
//
// Pourquoi un manifeste plutôt qu'un nom de fichier convenu : un logo réel garde son extension
// d'origine (avene.png, nuxe.svg, mixa.webp) tandis que la vignette de repli est toujours en
// .vignette.svg. Sans arbitre, le générateur de vignettes écrasait les SVG récupérés — c'est
// arrivé, d'où ce fichier.
//
// Ordre de préférence : SVG (vectoriel, net à l'impression) > PNG/WEBP (transparence) > JPEG
// (fond blanc, à éviter sur une étiquette de couleur) > vignette typographique.
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// On lit le catalogue BRUT et non logos.ts : ce dernier importe le manifeste, qui est
// justement ce qu'on écrit ici. Passer par lui créerait un cycle au premier lancement.
import { CATALOG } from '../src/lib/logos.catalog.ts';
import { EXTRA_CATALOG } from '../src/lib/logos.extra.ts';
const LOGOS = [...CATALOG, ...EXTRA_CATALOG];

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'public', 'logos_jpeg');

const fichiers = new Set(existsSync(DIR) ? readdirSync(DIR) : []);
const ORDRE = ['svg', 'png', 'webp', 'gif', 'jpg', 'jpeg'];

const lignes: string[] = [];
let reels = 0, vignettes = 0;

for (const e of LOGOS) {
  let choisi = `${e.key}.vignette.svg`;
  let reel = false;
  for (const ext of ORDRE) {
    const f = `${e.key}.${ext}`;
    if (fichiers.has(f)) { choisi = f; reel = true; break; }
  }
  if (reel) reels++; else vignettes++;
  if (!fichiers.has(choisi)) continue;              // ni logo ni vignette : on n'inscrit rien
  lignes.push(`  ${JSON.stringify(e.key)}: ${JSON.stringify('logos_jpeg/' + choisi)},`);
}

const out = `// ──────────────────────────────────────────────────────────────────────
//  QUEL FICHIER SERT DE LOGO  ·  GÉNÉRÉ, NE PAS ÉDITER À LA MAIN
//
//  Produit par \`npm run logos:manifeste\`, qui inspecte public/logos_jpeg/.
//  ${reels} logos réels · ${vignettes} vignettes typographiques.
//
//  Un logo réel l'emporte toujours sur la vignette. Déposez « avene.png » dans le dossier,
//  relancez le manifeste : l'étiquette prend le vrai logo, sans toucher au code.
// ──────────────────────────────────────────────────────────────────────

export const LOGO_FILES: Record<string, string> = {
${lignes.join('\n')}
};
`;

writeFileSync(join(ROOT, 'src', 'lib', 'logos.manifest.ts'), out, 'utf8');
console.log(`✓ src/lib/logos.manifest.ts — ${reels} logos réels, ${vignettes} vignettes`);
