// ──────────────────────────────────────────────────────────────────────
//  CATALOGUE DE LOGOS — reconnaissance du laboratoire, logique PURE
//
//  Le classeur d'import n'a PAS de colonne « laboratoire » : le nom de la marque est noyé
//  dans le libellé produit (« Sérum La Roche-Posay Hyalu B5 »). Ce module retrouve la marque
//  dans ce texte libre et rend le chemin de son visuel.
//
//  Deux règles gouvernent tout, parce que se tromper de logo en rayon est pire que ne rien
//  afficher :
//   • LE PLUS LONG GAGNE — « La Roche-Posay » doit l'emporter sur « Roche », qui est pourtant
//     bien présent dans la chaîne. Sans ça, un sérum LRP porterait le logo de Hoffmann-La Roche.
//   • À ÉGALITÉ, ON REND NULL — deux marques distinctes de même longueur = ambigu = pas de logo.
//
//  Aucun appel réseau, aucun DOM : testable de bout en bout (voir logos.test.ts).
// ──────────────────────────────────────────────────────────────────────
// Extension .ts explicite : c'est la seule forme que résolvent À LA FOIS les bundlers
// (Next, vitest) et Node en « type stripping », qui fait tourner les scripts de scripts/.
// Elle suppose `allowImportingTsExtensions` au tsconfig — sans danger, le projet est en noEmit.
import { CATALOG, BASE_PATH as CATALOG_BASE, type CatalogEntry } from './logos.catalog.ts';
import { PRODUCT_BRANDS } from './logos.brands.ts';
import { EXTRA_CATALOG } from './logos.extra.ts';
import { LOGO_FILES } from './logos.manifest.ts';

export type LogoEntry = CatalogEntry;

export type MatchMethod = 'exact' | 'alias' | 'none';
export type LogoStatus = 'found' | 'ambiguous' | 'not_found';

export interface LogoMatch {
  key: string | null;
  name: string | null;
  image: string | null;
  status: LogoStatus;
  method: MatchMethod;
  /** Les clés en lice quand `status === 'ambiguous'` — pour lever le doute à la main. */
  candidates?: string[];
}

/**
 * Catalogue généré + entrées ajoutées à la main, chaque entrée pointant le fichier RÉELLEMENT
 * présent (logo officiel s'il a été récupéré, vignette typographique sinon — cf. le manifeste).
 * Une clé en double serait une erreur : on la refuse.
 */
export const LOGOS: LogoEntry[] = (() => {
  const all = [...CATALOG, ...EXTRA_CATALOG];
  const seen = new Set<string>();
  for (const e of all) {
    if (seen.has(e.key)) throw new Error(`logos.extra.ts : la clé « ${e.key} » existe déjà au catalogue`);
    seen.add(e.key);
  }
  return all.map(e => ({ ...e, image: LOGO_FILES[e.key] ?? e.image }));
})();
export const BASE_PATH = CATALOG_BASE;

/**
 * Forme normalisée servant à TOUTES les comparaisons : minuscules, sans accents,
 * séparateurs et ponctuation réduits à `_`. « L'Oréal Dermatological Beauty » → `l_oreal_dermatological_beauty`.
 */
export function normalise(s: string): string {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // accents (marques combinantes)
    .replace(/[’'`]/g, '_')                      // apostrophes typographiques comprises
    .toLowerCase()
    .replace(/&/g, '_et_')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Index alias normalisé → clés. Un même alias peut désigner plusieurs entrées
// (« Ineldea » est à la fois un laboratoire et le groupe de Pediakid) : on garde TOUTES
// les clés pour pouvoir déclarer l'ambiguïté plutôt que de trancher au hasard.
const aliasIndex = new Map<string, Set<string>>();
for (const e of LOGOS) {
  for (const a of [e.key, ...e.aliases]) {
    const n = normalise(a);
    if (!n) continue;
    if (!aliasIndex.has(n)) aliasIndex.set(n, new Set());
    aliasIndex.get(n)!.add(e.key);
  }
}
const byKey = new Map(LOGOS.map(e => [e.key, e]));

// Marques produit ajoutées à la main : « Eludril » doit mener à Pierre Fabre. Une clé
// inconnue est ignorée ici — c'est le test qui la signale, pour ne pas faire tomber l'app
// en production sur une faute de frappe dans un fichier de données.
for (const [brand, key] of Object.entries(PRODUCT_BRANDS)) {
  if (!byKey.has(key)) continue;
  const n = normalise(brand);
  if (!n) continue;
  if (!aliasIndex.has(n)) aliasIndex.set(n, new Set());
  aliasIndex.get(n)!.add(key);
}

/** Marques produit dont la cible n'existe pas au catalogue — vérifié par les tests. */
export const orphanBrands = (): string[] =>
  Object.entries(PRODUCT_BRANDS).filter(([, k]) => !byKey.has(k)).map(([b]) => b);

// Alias trop courts : « RB », « J&J » apparaîtraient dans trop de libellés par accident.
// 3 caractères suffisent pour ACM, SVR, GSK, UPSA — qui, eux, sont écrits tels quels en rayon.
const MIN_ALIAS = 3;
// Alias triés du plus long au plus court : c'est ce qui fait gagner « la_roche_posay » sur « roche ».
const searchable = [...aliasIndex.keys()]
  .filter(a => a.replace(/_/g, '').length >= MIN_ALIAS)
  .sort((a, b) => b.length - a.length);

const resolve = (keys: Set<string>, method: MatchMethod): LogoMatch => {
  if (keys.size > 1) {
    return { key: null, name: null, image: null, status: 'ambiguous', method, candidates: [...keys].sort() };
  }
  const e = byKey.get([...keys][0])!;
  return { key: e.key, name: e.name, image: e.image, status: 'found', method };
};

const NOT_FOUND: LogoMatch = { key: null, name: null, image: null, status: 'not_found', method: 'none' };

/**
 * Cherche le laboratoire dans un texte libre (libellé produit, descriptif…).
 *
 * Correspondance EXACTE d'abord — la cellule entière est le nom du labo —, puis recherche
 * par alias à l'intérieur du texte, la plus longue l'emportant.
 */
export function findLab(text: string): LogoMatch {
  const n = normalise(text);
  if (!n) return NOT_FOUND;

  // 1) la cellule entière EST un alias
  const exact = aliasIndex.get(n);
  if (exact) return resolve(exact, 'exact');

  // 2) un alias apparaît dans le texte, sur frontière de mot (`_alias_` dans `_texte_`)
  const hay = `_${n}_`;
  let bestLen = 0;
  const winners = new Set<string>();
  for (const a of searchable) {
    if (a.length < bestLen) break;            // trié décroissant : plus rien ne peut faire mieux
    if (!hay.includes(`_${a}_`)) continue;
    if (a.length > bestLen) { bestLen = a.length; winners.clear(); }
    for (const k of aliasIndex.get(a)!) winners.add(k);
  }
  if (winners.size) return resolve(winners, 'alias');

  return NOT_FOUND;
}

/** Chemin servi par Next (`public/`) pour une entrée du catalogue. */
export const logoUrl = (image: string): string => '/' + image.replace(/^\/+/, '');
