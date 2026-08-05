// ──────────────────────────────────────────────────────────────────────
//  IMPORT CSV / EXCEL — logique PURE (aucun React, aucun DOM)
//
//  Isolée du composant pour être testable de bout en bout : un vrai .xlsx peut être relu,
//  mappé et transformé en données d'étiquettes dans un test (voir import.test.ts), sans
//  navigateur. Le composant ImportModal ne fait plus que l'habillage.
//
//  Les types viennent de la page en `import type` : effacé à la compilation, donc pas de
//  cycle d'imports à l'exécution (page.tsx importe bien, lui, les valeurs de ce module).
// ──────────────────────────────────────────────────────────────────────
import type { LabelData, PromoType } from '@/app/page';
import { pf, splitSize } from './calc';

export type ImpField = { key: keyof LabelData; label: string; kw: RegExp };
export type ImpType = PromoType | 'auto';

const F_CAT: ImpField = { key: 'category', label: 'Catégorie', kw: /cat|rayon|univers|famille|gamme/i };
const F_PROD: ImpField = { key: 'product', label: 'Produit', kw: /produit|nom|libell|d[eé]sign|article|d[eé]nom/i };
const F_QTY: ImpField = { key: 'qtyLabel', label: 'Descriptif', kw: /descript|quantit|conditionn|contenance|g[eé]lul|capsul|comprim/i };
export const FORMAT_KW = /format|taille|gabarit|dimension|mod[eè]le|support/i;
// Colonne « Type » : un seul Excel « tout-en-un » décrit toutes les promos, le type est
// lu ligne par ligne (valeurs libres : « Prix promo », « Bon », « Lot », « Multi »,
// « 2ᵉ produit »…). Repérée dans l'en-tête, elle est exclue du mappage des champs.
export const TYPE_KW = /\btype\b|nature|op[eé]ration/i;
const PROMO_ALIASES: [RegExp, PromoType][] = [
  [/bon|coupon|✂/i, 'bon-reduction'],
  [/multi|palier|d[eè]s\b/i, 'multi-achat'],
  [/2\s*[eè]|2ᵉ|deuxi|second/i, 'remise-2eme'],
  [/lot|offert|gratuit|\+\s*\d/i, 'remise-lot'],
  [/promo|prix|remise|r[eé]duction|net/i, 'prix-promo'],
];
export const matchPromoType = (s: string): PromoType | null => {
  const t = (s || '').trim(); if (!t) return null;
  for (const [re, ty] of PROMO_ALIASES) if (re.test(t)) return ty;
  return null;
};

export const IMPORT_FIELDS: Record<PromoType, ImpField[]> = {
  'prix-promo': [F_CAT, F_PROD,
    { key: 'normalPrice', label: 'Prix normal €', kw: /normal|barr|public|ancien|avant|initial|vente|courant|fort/i },
    { key: 'promoPrice', label: 'Prix promo €', kw: /promo|nouveau|apr[eè]s|remis|r[eé]duit|net/i }, F_QTY],
  'bon-reduction': [F_CAT, F_PROD,
    { key: 'couponValue', label: 'Valeur bon €', kw: /valeur|bon|montant/i },
    { key: 'couponExpiry', label: 'Validité', kw: /validit|date|jusqu|expir|fin/i }],
  // Le lot par défaut est un pack à prix fixe : sans le prix À L'UNITÉ, l'étiquette n'a ni prix
  // barré ni économie affichée. La colonne est donc au modèle (« unité » ≠ « lot » : pas de conflit).
  'remise-lot': [F_CAT, F_PROD,
    { key: 'lotQty', label: 'Qté totale', kw: /qt|quantit|total|nombre/i },
    { key: 'lotFree', label: 'Offert(s)', kw: /offert|gratuit/i },
    { key: 'normalPrice', label: "Prix à l'unité €", kw: /unit|normal|barr|public|ancien|pi[eè]ce/i },
    { key: 'lotPrice', label: 'Prix du lot €', kw: /lot|tarif|montant/i }, F_QTY],
  'multi-achat': [F_CAT, F_PROD,
    { key: 't1q', label: 'P1 qté', kw: /q.?1|qt[eé]?\s*1/i }, { key: 't1p', label: 'P1 prix', kw: /p.?1|prix\s*1/i },
    { key: 't2q', label: 'P2 qté', kw: /q.?2|qt[eé]?\s*2/i }, { key: 't2p', label: 'P2 prix', kw: /p.?2|prix\s*2/i },
    { key: 't3q', label: 'P3 qté', kw: /q.?3|qt[eé]?\s*3/i }, { key: 't3p', label: 'P3 prix', kw: /p.?3|prix\s*3/i }],
  'remise-2eme': [F_CAT, F_PROD,
    { key: 'normalPrice', label: "Prix à l'unité €", kw: /unit|prix|normal|public|vente|tarif/i },
    { key: 'remiseManual', label: 'Remise 2ᵉ (%)', kw: /remise|%|pourcent|pct|deuxi|2e|second/i }, F_QTY],
};

// Mode « tout-en-un » : union NON AMBIGUË de toutes les colonnes possibles. Chaque ligne ne
// remplit que celles utiles à son Type ; les autres restent vides (mots-clés d'en-tête pensés
// pour qu'aucune colonne n'en capte une autre — ex. « lot » ≠ « prix », « unité » → prix normal).
export const AUTO_FIELDS: ImpField[] = [F_CAT, F_PROD,
  { key: 'normalPrice', label: "Prix normal / à l'unité €", kw: /normal|barr|public|ancien|avant|initial|unit|fort/i },
  { key: 'promoPrice', label: 'Prix promo €', kw: /promo|nouveau|apr[eè]s|r[eé]duit|net/i },
  { key: 'couponValue', label: 'Valeur bon €', kw: /valeur|bon|montant/i },
  { key: 'couponExpiry', label: 'Validité', kw: /validit|jusqu|expir/i },
  { key: 'lotQty', label: 'Qté totale', kw: /total|nombre/i },
  { key: 'lotFree', label: 'Offert(s)', kw: /offert|gratuit/i },
  { key: 'lotPrice', label: 'Prix du lot €', kw: /lot/i },
  { key: 't1q', label: 'Qté 1', kw: /q.?1|qt[eé]?\s*1/i }, { key: 't1p', label: 'Prix 1', kw: /p.?1|prix\s*1/i },
  { key: 't2q', label: 'Qté 2', kw: /q.?2|qt[eé]?\s*2/i }, { key: 't2p', label: 'Prix 2', kw: /p.?2|prix\s*2/i },
  { key: 't3q', label: 'Qté 3', kw: /q.?3|qt[eé]?\s*3/i }, { key: 't3p', label: 'Prix 3', kw: /p.?3|prix\s*3/i },
  { key: 'remiseManual', label: 'Remise 2ᵉ (%)', kw: /remise|pourcent|pct|deuxi|second|%/i },
  F_QTY];

export const getFields = (t: ImpType): ImpField[] => (t === 'auto' ? AUTO_FIELDS : IMPORT_FIELDS[t]);

// Colonnes « prix » par type : une ligne ne devient une étiquette que si l'une d'elles
// contient un montant > 0 (→ les lignes « Bateau », titres et vides disparaissent).
export const PRICE_COLS: Record<PromoType, (keyof LabelData)[]> = {
  'prix-promo': ['promoPrice', 'normalPrice'],
  'bon-reduction': ['couponValue'],
  'remise-lot': ['lotPrice'],
  'multi-achat': ['t1p', 't2p', 't3p'],
  'remise-2eme': ['normalPrice'],
};

// Cellule de tableur → texte. Les nombres reviennent en notation FR (virgule) pour que
// pf() les relise à l'identique, et les dates au format fr-FR (la « Validité » est du texte).
export function cellToStr(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'number') return String(v).replace('.', ',');
  if (v instanceof Date) return v.toLocaleDateString('fr-FR');
  return String(v).trim();
}
// Lignes brutes d'un classeur → tableau de chaînes, lignes vides retirées.
export function normalizeRows(rows: unknown[]): string[][] {
  return rows.map(r => (Array.isArray(r) ? r : []).map(cellToStr)).filter(r => r.some(c => c.length));
}

export function detectHeader(rows: string[][]): boolean {
  const r = rows[0] || [];
  return r.some(c => /produit|cat[eé]gorie|nom|prix|valeur|qt|descript|marque|libell|rayon/i.test(c));
}

const isNumericish = (s: string) => { const t = (s || '').trim(); return !!t && /^[\d\s.,€%+/-]+$/.test(t); };
// Champs attendus NUMÉRIQUES (prix, quantités, %) — servent à valider le mappage par le contenu.
const PRICE_KEYS = new Set(['normalPrice', 'promoPrice', 'couponValue', 'lotPrice', 'unitPrice', 'remiseManual', 'lotQty', 'lotFree', 't1p', 't2p', 't3p', 't1q', 't2q', 't3q']);

// Statistiques par colonne : part de cellules numériques, longueur moyenne du texte, moyenne des nombres.
function colStats(body: string[][], ncols: number) {
  const st: { numRatio: number; avgLen: number; mean: number; nonEmpty: number }[] = [];
  for (let c = 0; c < ncols; c++) {
    let num = 0, lenSum = 0, valSum = 0, ne = 0, txt = 0;
    for (const r of body) { const v = (r[c] || '').trim(); if (!v) continue; ne++; if (isNumericish(v)) { num++; valSum += pf(v); } else { txt++; lenSum += v.length; } }
    st.push({ numRatio: ne ? num / ne : 0, avgLen: txt ? lenSum / txt : 0, mean: num ? valSum / num : 0, nonEmpty: ne });
  }
  return st;
}

// Mappage colonnes → champs, ROBUSTE : l'en-tête donne une 1ʳᵉ piste, puis on VALIDE par le
// contenu (un prix doit être une colonne numérique, le produit une colonne texte) et on corrige
// automatiquement les en-têtes trompeurs / décalés d'une colonne.
export function autoMap(fields: ImpField[], header: string[], hasHeader: boolean, body: string[][], mixed = false): Record<string, number> {
  const ncols = Math.max(header.length, body.reduce((m, r) => Math.max(m, r.length), 0));
  const used = new Set<number>(); const map: Record<string, number> = {};
  fields.forEach(f => { map[f.key] = -1; });
  // Colonnes réservées (Format, Type) : jamais mappées à un champ.
  const reserved = new Set<number>(); if (hasHeader) header.forEach((h, i) => { if (FORMAT_KW.test(h) || TYPE_KW.test(h)) reserved.add(i); });
  // 1) correspondance par mot-clé sur les en-têtes (1ʳᵉ piste)
  if (hasHeader) fields.forEach(f => {
    const col = header.findIndex((h, i) => !used.has(i) && !reserved.has(i) && f.kw.test(h));
    if (col >= 0) { map[f.key] = col; used.add(col); }
  });

  const st = colStats(body, ncols);
  const hasData = body.length >= 2 && st.some(s => s.nonEmpty > 0);
  const isNum = (c: number) => c >= 0 && !!st[c] && st[c].numRatio >= 0.5 && !reserved.has(c);
  const isTxt = (c: number) => c >= 0 && !!st[c] && st[c].numRatio < 0.4 && !reserved.has(c);
  const release = (c: number) => { for (const k in map) if (map[k] === c) { used.delete(c); map[k] = -1; } };

  if (hasData) {
    // 2) PRODUIT = colonne la plus « texte ». Si l'en-tête l'a posé sur une colonne de nombres → on corrige.
    if (fields.some(f => f.key === 'product')) {
      const cur = map.product;
      if (cur < 0 || st[cur].numRatio >= 0.4) {
        let best = -1, bestLen = 2;
        for (let c = 0; c < ncols; c++) { if (!isTxt(c)) continue; if (st[c].avgLen > bestLen) { bestLen = st[c].avgLen; best = c; } }
        if (best >= 0) { release(best); if (cur >= 0) used.delete(cur); map.product = best; used.add(best); }
      }
    }
    // 3) Champs PRIX = colonnes numériques. Si l'un d'eux pointe une colonne de texte → on réaffecte
    //    les colonnes numériques disponibles, dans l'ordre (préserve l'ordre des paliers multi-achat).
    //    Ignoré en mode « tout-en-un » : les colonnes y sont volontairement creuses (un prix par
    //    type de promo) et un réajustement/permutation par moyennes globales serait faux.
    const priceFields = fields.filter(f => PRICE_KEYS.has(f.key)).map(f => f.key);
    if (!mixed && priceFields.some(k => !isNum(map[k]))) {
      const numCols: number[] = []; for (let c = 0; c < ncols; c++) if (isNum(c)) numCols.push(c);
      priceFields.forEach(k => { if (map[k] >= 0) { used.delete(map[k]); map[k] = -1; } });
      const avail = numCols.filter(c => !used.has(c));
      priceFields.forEach((k, i) => { if (i < avail.length) { map[k] = avail[i]; used.add(avail[i]); } });
    }
    // 3b) Cohérence prix : le prix normal doit être ≥ au promo. Si les moyennes sont inversées
    //     (en-têtes « normal/promo » échangés), on permute automatiquement.
    if (!mixed && map.normalPrice >= 0 && map.promoPrice >= 0 && map.normalPrice !== map.promoPrice && st[map.normalPrice].mean < st[map.promoPrice].mean) {
      const t = map.normalPrice; map.normalPrice = map.promoPrice; map.promoPrice = t;
    }
    // 4) Champs texte secondaires non trouvés (ex. descriptif) → 1ʳᵉ colonne texte libre.
    fields.filter(f => !PRICE_KEYS.has(f.key) && f.key !== 'product' && f.key !== 'category').forEach(f => {
      if (map[f.key] >= 0) return;
      for (let c = 0; c < ncols; c++) { if (used.has(c) || !isTxt(c)) continue; map[f.key] = c; used.add(c); break; }
    });
  }

  // 5) repli positionnel seulement si l'en-tête + le contenu n'ont quasi rien donné (fichiers bruts)
  if (Object.values(map).filter(v => v >= 0).length >= 2) return map;
  fields.forEach((f, idx) => { if (map[f.key] < 0 && idx < ncols && !used.has(idx)) { map[f.key] = idx; used.add(idx); } });
  return map;
}

export type PreparedRow = { d: Partial<LabelData>; r: string[]; rt: PromoType };

// Lignes du fichier → données d'étiquettes. Ne retient que les lignes exploitables :
// un produit nommé ET au moins un prix valide pour SON type de promo.
export function prepareRows(body: string[][], opts: { type: ImpType; mapping: Record<string, number>; typeCol: number }): PreparedRow[] {
  const { type, mapping, typeCol } = opts;
  const fields = getFields(type);
  // Type de promo d'une ligne : lu dans la colonne « Type » (mode tout-en-un), sinon type global.
  const rowTypeOf = (r: string[]): PromoType => type === 'auto' ? (matchPromoType(typeCol >= 0 ? (r[typeCol] || '') : '') || 'prix-promo') : type;
  return body.map(r => {
    const rt = rowTypeOf(r);
    const d: Partial<LabelData> = {};
    fields.forEach(f => { const c = mapping[f.key]; if (c >= 0 && r[c] != null && r[c] !== '') (d as Record<string, string>)[f.key] = r[c]; });
    if (!d.product) d.product = (mapping.product >= 0 ? r[mapping.product] : r[0]) || '';
    // Désignation pharmacie « Nom marque F/500ML » : si pas de descriptif fourni,
    // on détache le litrage/grammage pour l'afficher sur la petite ligne.
    if (!d.qtyLabel && d.product) { const sp = splitSize(d.product); if (sp.size) { d.product = sp.product; d.qtyLabel = sp.size; } }
    return { d, r, rt };
  }).filter(({ d, rt }) => (d.product || '').trim() && PRICE_COLS[rt].some(k => pf((d as Record<string, string>)[k] || '') > 0));
}

// Chaîne complète « fichier lu → lignes prêtes », telle que la vit l'utilisateur qui se
// contente de déposer le modèle sans rien régler. C'est CE chemin que teste import.test.ts.
export function importRows(rows: string[][], type: ImpType = 'auto') {
  const hasHeader = detectHeader(rows);
  const header = hasHeader ? (rows[0] || []) : [];
  const body = hasHeader ? rows.slice(1) : rows;
  const mapping = autoMap(getFields(type), header, hasHeader, body, type === 'auto');
  const typeCol = hasHeader ? header.findIndex(h => TYPE_KW.test(h)) : -1;
  const formatCol = hasHeader ? header.findIndex(h => FORMAT_KW.test(h)) : -1;
  return { hasHeader, header, mapping, typeCol, formatCol, prepared: prepareRows(body, { type, mapping, typeCol }) };
}
