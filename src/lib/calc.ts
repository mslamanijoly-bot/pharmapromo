// ════════════════════════════════════════════════════════════════
//  Logique pure (testable) : prix, auto-fit, pagination, import CSV
// ════════════════════════════════════════════════════════════════

export const MM = 96 / 25.4; // px par mm @96dpi

/** "12,50" → 12.5 ; "" → 0 ; "abc" → 0 */
export const pf = (s: string) => parseFloat((s || '').replace(',', '.')) || 0;

/** 8.7 → "8,70" */
export const ff = (n: number) => n.toFixed(2).replace('.', ',');

/**
 * Taille de police (fraction de hauteur) auto-ajustée pour qu'un texte
 * tienne sur ~maxLines lignes dans sa largeur, quelle que soit sa longueur.
 */
export function fitSize(text: string, wFrac: number, aspect: number, base: number, maxLines = 2, floor = 0.03) {
  const len = Math.max(1, (text || '').trim().length);
  const cap = (wFrac * aspect * maxLines) / (0.55 * len);
  return Math.round(Math.max(floor, Math.min(base, cap)) * 1000) / 1000;
}

/** Formate une remise en euros : 5 → "5", 0.5 → "0,50", 2.9 → "2,90". */
export const fr = (n: number) => (Number.isInteger(n) ? String(n) : ff(n));

/** Détache un litrage / grammage en fin de désignation produit (exports pharmacie).
 *  "Bain de bouche Listerine F/500ML" → { product: "Bain de bouche Listerine", size: "500 ml" }
 *  Reconnaît ml/cl/l/g/mg/kg, gélules/comprimés/caps/sachets/unidoses/doses/pièces,
 *  avec un code de conditionnement optionnel (F/, B/, T/, BT, FL, BO, x). */
export function splitSize(name: string): { product: string; size: string } {
  const s = (name || '').trim();
  if (!s) return { product: s, size: '' };
  const re = /\s*[-–,/]?\s*(?:(?:fl|bo|bt|fco?|flacon|bte?|tube|t|b|f|x)\s*[/.]?\s*)?(\d+(?:[.,]\d+)?)\s*(ml|cl|l|mg|kg|g[ée]lules?|gel|g|comprim[ée]s?|cps?|caps?|sachets?|unidoses?|doses?|pi[èe]ces?|pces?)\b\.?$/i;
  const m = s.match(re);
  if (m == null || m.index == null) return { product: s, size: '' };
  const num = m[1].replace('.', ',');
  const u = m[2].toLowerCase();
  const unit = u === 'l' ? 'L' : (/^g[ée]l/.test(u) ? 'gélules' : (/^comp/.test(u) ? 'comprimés' : (/^cap|^cps?$/.test(u) ? 'caps' : (/^sach/.test(u) ? 'sachets' : u))));
  const product = s.slice(0, m.index).replace(/[-–,/\s]+$/, '').trim();
  return product ? { product, size: `${num} ${unit}` } : { product: s, size: '' };
}

/** Décompose un prix promo en partie entière / centimes + remise immédiate (€ et %). */
export function priceParts(normalStr: string, promoStr: string) {
  const promo = pf(promoStr), normal = pf(normalStr);
  const intp = Math.floor(promo).toString();
  const cents = Math.round((promo - Math.floor(promo)) * 100).toString().padStart(2, '0');
  const diff = normal > promo ? Math.round((normal - promo) * 100) / 100 : 0;
  const remise = diff > 0 ? fr(diff) : '';
  const pct = normal > 0 && diff > 0 ? Math.round((diff / normal) * 100).toString() : '';
  return { promo, normal, intp, cents, remise, pct };
}

/** Nb de colonnes / lignes / étiquettes par feuille pour un tuilage. */
export function paginate(lwMm: number, lhMm: number, paperWmm: number, paperHmm: number, marginMm: number, gapMm: number) {
  const usableW = paperWmm - 2 * marginMm;
  const usableH = paperHmm - 2 * marginMm;
  const cols = Math.max(1, Math.floor((usableW + gapMm) / (lwMm + gapMm)));
  const rows = Math.max(1, Math.floor((usableH + gapMm) / (lhMm + gapMm)));
  return { cols, rows, perPage: cols * rows };
}

/**
 * Parseur CSV/TSV robuste : détecte le séparateur (tab / ; / ,),
 * respecte les guillemets (séparateurs et retours-ligne échappés, "" → ").
 */
export function parseTable(text: string): string[][] {
  const t = (text || '').replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!t.trim()) return [];
  const first = t.split('\n')[0] || '';
  const sep = first.includes('\t') ? '\t'
    : (first.split(';').length > first.split(',').length ? ';' : ',');
  const rows: string[][] = [];
  let row: string[] = [], field = '', inQ = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQ) {
      if (c === '"') { if (t[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === sep) { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  row.push(field); rows.push(row);
  return rows.map(r => r.map(c => c.trim())).filter(r => r.some(c => c.length));
}

/** Découpe un tableau en sous-tableaux de taille n. */
export function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += Math.max(1, n)) out.push(arr.slice(i, i + n));
  return out;
}

/**
 * Empile les tableaux disposés côte à côte (séparés par des colonnes vides) en
 * un seul tableau vertical, pour gérer les feuilles « 2 listes l'une à côté de
 * l'autre ». Si un seul bloc est détecté, renvoie les lignes inchangées.
 */
export function stackColumnBlocks(rows: string[][]): string[][] {
  if (rows.length < 2) return rows;
  const ncols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  if (ncols < 4) return rows;
  const norm = rows.map(r => { const c = r.slice(); while (c.length < ncols) c.push(''); return c; });
  const colEmpty = (c: number) => norm.every(r => !(r[c] || '').trim());
  const blocks: [number, number][] = [];
  let start = -1;
  for (let c = 0; c < ncols; c++) {
    if (!colEmpty(c)) { if (start < 0) start = c; }
    else if (start >= 0) { blocks.push([start, c]); start = -1; }
  }
  if (start >= 0) blocks.push([start, ncols]);
  const maxW = Math.max(...blocks.map(([a, b]) => b - a), 0);
  const keep = blocks.filter(([a, b]) => b - a >= maxW - 1 && b - a >= 3);
  if (keep.length < 2) return rows;
  const out: string[][] = [];
  for (const [a, b] of keep) for (const r of norm) {
    const sub = r.slice(a, b);
    if (sub.some(c => (c || '').trim())) out.push(sub);
  }
  return out;
}
