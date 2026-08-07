// Écrit un visuel par entrée du catalogue dans public/logos_jpeg/.
//
//   npm run gen:logos
//
// Ce sont des MARQUES-MOTS TYPOGRAPHIQUES, pas les logos officiels : le nom du laboratoire,
// bien orthographié et bien accentué, sur une pastille de couleur dérivée de sa catégorie.
// Choix assumé — un visuel neutre mais juste vaut mieux qu'un logo pêché au hasard sur le web,
// où l'erreur est silencieuse et ne se voit qu'une fois la planche imprimée.
//
// Un vrai logo fourni par le laboratoire se dépose sous le même nom de fichier et prend la
// place de la vignette, sans rien changer au code : c'est la clé du catalogue qui fait le lien.
//
// Exécuté par Node en « type stripping » (voir gen-test-xlsx.ts) : imports en .ts / .json.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// Catalogue brut plutôt que logos.ts : celui-ci dépend du manifeste, qui dépend des fichiers
// que ce script écrit. On reste en amont de la chaîne.
import { CATALOG } from '../src/lib/logos.catalog.ts';
import { EXTRA_CATALOG } from '../src/lib/logos.extra.ts';
const LOGOS = [...CATALOG, ...EXTRA_CATALOG];

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'logos_jpeg');
mkdirSync(OUT, { recursive: true });

// Palette par famille de produits : repère visuel en rayon, cohérent avec les univers officine.
const PALETTE: [RegExp, string][] = [
  [/dermocosm|dermato|cosm|hygi[eè]ne|soin/i, '#0A5C3A'],
  [/capillaire/i, '#7C3A0A'],
  [/b[ée]b[ée]|maternit/i, '#0E6E8C'],
  [/compl[ée]ment|vitamin|micronutrition|nutrition|di[ée]t/i, '#B45309'],
  [/phytoth|aromath|hom[ée]opathie|naturelle/i, '#3F6212'],
  [/g[ée]n[ée]riques/i, '#4B5563'],
  [/dispositif|technologies|sciences/i, '#1E3A8A'],
];
const colorFor = (category: string): string => {
  for (const [re, c] of PALETTE) if (re.test(category)) return c;
  return '#334155'; // pharmaceutique / groupes : ardoise neutre
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const W = 400, H = 120, PAD = 22;

// Le nom doit tenir dans la largeur : on estime la largeur du texte (~0,58 em en gras),
// on réduit le corps si besoin, et on passe sur deux lignes pour les raisons sociales longues.
function layout(name: string): { lines: string[]; size: number } {
  const fit = (line: string, size: number) => line.length * size * 0.58 <= W - 2 * PAD;
  for (let size = 44; size >= 20; size -= 2) if (fit(name, size)) return { lines: [name], size };

  const words = name.split(/\s+/);
  let best: string[] = [name];
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    if (Math.abs(a.length - b.length) < Math.abs(best[0].length - (best[1] || '').length) || best.length === 1) best = [a, b];
  }
  for (let size = 34; size >= 14; size -= 2) if (best.every(l => fit(l, size))) return { lines: best, size };
  return { lines: best, size: 14 };
}

let n = 0;
for (const e of LOGOS) {
  const color = colorFor(e.category || '');
  const { lines, size } = layout(e.name);
  const lead = size * 1.12;
  const y0 = H / 2 + size * 0.34 - ((lines.length - 1) * lead) / 2;
  const text = lines
    .map((l, i) => `<text x="${W / 2}" y="${(y0 + i * lead).toFixed(1)}" text-anchor="middle" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="${size}" font-weight="700" letter-spacing="-0.5" fill="#ffffff">${esc(l)}</text>`)
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(e.name)}">`
    + `<title>${esc(e.name)}</title>`
    + `<rect width="${W}" height="${H}" rx="14" fill="${color}"/>`
    + text
    + `</svg>\n`;

  // Suffixe « .vignette.svg » et NON « .svg » : un logo réel récupéré s'appelle « avene.svg »
  // et serait écrasé à chaque exécution. Les deux familles de fichiers doivent pouvoir
  // coexister ; c'est le manifeste (gen-logo-manifest.ts) qui choisit lequel sert.
  writeFileSync(join(OUT, `${e.key}.vignette.svg`), svg, 'utf8');
  n++;
}

console.log(`✓ ${n} vignettes → public/logos_jpeg/*.vignette.svg`);
console.log('  Elles ne servent que faute de logo réel — voir npm run logos:manifeste.');
