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
