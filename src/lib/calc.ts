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

/** Décompose un prix promo en partie entière / centimes + remise immédiate. */
export function priceParts(normalStr: string, promoStr: string) {
  const promo = pf(promoStr), normal = pf(normalStr);
  const intp = Math.floor(promo).toString();
  const cents = Math.round((promo - Math.floor(promo)) * 100).toString().padStart(2, '0');
  const remise = normal > promo ? Math.round(normal - promo).toString() : '';
  return { promo, normal, intp, cents, remise };
}

/** Nb de colonnes / lignes / étiquettes par feuille pour un tuilage. */
export function paginate(lwMm: number, lhMm: number, paperWmm: number, paperHmm: number, marginMm: number, gapMm: number) {
  const usableW = paperWmm - 2 * marginMm;
  const usableH = paperHmm - 2 * marginMm;
  const cols = Math.max(1, Math.floor((usableW + gapMm) / (lwMm + gapMm)));
  const rows = Math.max(1, Math.floor((usableH + gapMm) / (lhMm + gapMm)));
  return { cols, rows, perPage: cols * rows };
}

/** Découpe un texte CSV/Excel collé en lignes/colonnes (séparateur auto). */
export function parseTable(text: string): string[][] {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim().length);
  const sample = lines[0] || '';
  const sep = sample.includes('\t') ? '\t' : (sample.includes(';') ? ';' : ',');
  return lines.map(l => l.split(sep).map(c => c.trim().replace(/^"|"$/g, '')));
}

/** Découpe un tableau en sous-tableaux de taille n. */
export function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += Math.max(1, n)) out.push(arr.slice(i, i + n));
  return out;
}
