'use client';
import { useState, useEffect, useRef, useCallback, CSSProperties } from 'react';
import { MM, pf, ff, fitSize, priceParts, parseTable, paginate, chunk, stackColumnBlocks, splitSize } from '@/lib/calc';

/* ════════════════════════════════════════════════════════════════════
   PHARMAPROMO STUDIO
   DA premium « Homme de Fer affiné » · disposition orientée (portrait / réglette)
   Formats en mm · remise immédiate auto · période de dates · mentions + logo
   Bibliothèque d'équipe (backend Vercel KV) + repli local
   ════════════════════════════════════════════════════════════════════ */

// ──────────────────────────────────────────────────────────────────────
//  MODÈLE
// ──────────────────────────────────────────────────────────────────────

export type PromoType = 'prix-promo' | 'bon-reduction' | 'remise-lot' | 'multi-achat' | 'remise-2eme';
type Align = 'left' | 'center' | 'right';
type ElKind = 'text' | 'pill' | 'box' | 'image';

interface El {
  id: string; kind: ElKind; text?: string; src?: string;
  x: number; y: number; w?: number; h?: number;
  size: number; font: string; color: string; bg?: string;
  weight: number; align: Align; rot: number;
  strike?: boolean; strikeW?: number; radius?: number; shape?: 'circle'; shadow?: boolean; border?: string;
  track?: number; italic?: boolean;
  hidden?: boolean; removable?: boolean;
}

interface LabelData {
  category: string; product: string; qtyLabel: string;
  normalPrice: string; promoPrice: string;
  remiseType: string; remiseManual: string;
  couponValue: string; couponExpiry: string;
  lotQty: string; lotFree: string; lotPrice: string; unitPrice: string;
  t1q: string; t1p: string; t2q: string; t2p: string; t3q: string; t3p: string;
  dateStart: string; dateEnd: string;
}

export interface Label { id: string; type: PromoType; accent: string; bg: string; data: LabelData; overrides: Record<string, Partial<El>>; extra: El[]; wMm?: number; hMm?: number; }

export interface Project {
  pharmacy: string; plan: string; logo: string | null; disclaimer: string;
  pageFormat: string; labelWmm: number; labelHmm: number;
  printPaper?: string; printMarginMm?: number; theme?: string;
  dateStart?: string; dateEnd?: string;
  labels: Label[]; updatedAt?: number;
}

const PAPERS: Record<string, { name: string; w: number; h: number }> = {
  A4: { name: 'A4', w: 210, h: 297 },
  A5: { name: 'A5', w: 148, h: 210 },
  A3: { name: 'A3', w: 297, h: 420 },
};

interface Meta { id: string; pharmacy: string; plan: string; updatedAt: number; }
interface SeedOpts { landscape: boolean; logo?: string | null; disclaimer?: string; editing?: boolean; small?: boolean; aspect?: number; theme?: string; dateStart?: string; dateEnd?: string; }

// ──────────────────────────────────────────────────────────────────────
//  DIRECTION ARTISTIQUE
// ──────────────────────────────────────────────────────────────────────

const DA = {
  bg: '#FFD400',        // jaune signature, chaud
  band: '#2E4A3D',      // vert sapin profond
  red: '#D81E27', red2: '#9E0F18',
  priceY: '#FFD400',    // prix jaune dans le cercle
  green: '#33503F',     // nom produit
  ink: '#4A4632',       // mentions
  promo: '#C2410C',     // titre PROMOTION (réglette)
};

// Filigrane premium : croix de pharmacie + zigzags, très subtil
const WATERMARK = (() => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>
<g fill='#000000' fill-opacity='0.045'><rect x='14' y='6' width='10' height='28' rx='2.5'/><rect x='5' y='15' width='28' height='10' rx='2.5'/></g>
<g fill='none' stroke='#000000' stroke-opacity='0.045' stroke-width='3'><path d='M62 104 l16 -18 l16 18 l16 -18'/><path d='M70 40 h26 v-26'/></g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
})();

// Style « Officine » : 100 % vert (identité pharmacie) + un seul accent « promo »
// (rouge = déclencheur d'achat) réservé au prix et au −%. Logique merchandising :
// le vert installe la confiance, le rouge attire l'œil sur la bonne affaire.
const OFFI = { bg: '#FFFFFF', green: '#0E7A4D', greenDark: '#0A5C3A', greenSoft: '#E7F2EC', ink: '#1C2B23', old: '#9AA7A0', muted: '#6B7B72', white: '#FFFFFF', promo: '#D62828' };

const TYPES: { id: PromoType; label: string; icon: string; color: string }[] = [
  { id: 'prix-promo',    label: 'Prix Promo',       icon: '🏷️', color: '#D81E27' },
  { id: 'bon-reduction', label: 'Bon de Réduction', icon: '✂️', color: '#15803d' },
  { id: 'remise-lot',    label: 'Remise Lot',       icon: '📦', color: '#c2410c' },
  { id: 'multi-achat',   label: 'Multi-Achat',      icon: '📊', color: '#6d28d9' },
  { id: 'remise-2eme',   label: '2ᵉ à -X%',         icon: '➕', color: '#be123c' },
];

const FONTS = [
  { name: 'Poppins',   css: 'var(--font-poppins),system-ui,sans-serif' },
  { name: 'Montserrat', css: 'var(--font-montserrat),system-ui,sans-serif' },
  { name: 'Playfair (serif)', css: 'var(--font-playfair),Georgia,serif' },
  { name: 'Cormorant (serif)', css: 'var(--font-cormorant),Georgia,serif' },
  { name: 'Système',   css: 'system-ui,-apple-system,Segoe UI,sans-serif' },
  { name: 'Arial',     css: 'Arial,Helvetica,sans-serif' },
  { name: 'Impact',    css: 'Impact,Haettenschweiler,Arial Narrow,sans-serif' },
  { name: 'Georgia',   css: 'Georgia,Cambria,serif' },
  { name: 'Trebuchet', css: '"Trebuchet MS",Tahoma,sans-serif' },
  { name: 'Verdana',   css: 'Verdana,Geneva,sans-serif' },
];

const BADGES = [
  { t: 'NOUVEAU', bg: '#dc2626' }, { t: 'BIO', bg: '#15803d' },
  { t: '★ COUP DE CŒUR', bg: '#d97706' }, { t: '-50%', bg: '#dc2626' },
  { t: '2+1', bg: '#c2410c' }, { t: 'PROMO', bg: '#dc2626' },
  { t: 'VEGAN', bg: '#16a34a' }, { t: 'SANS ORDONNANCE', bg: '#0891b2' },
  { t: 'FABRIQUÉ EN FRANCE', bg: '#1d4ed8' }, { t: 'DÉSTOCKAGE', bg: '#7c3aed' },
  { t: 'DERNIERS JOURS', bg: '#b91c1c' },
];

// Couleurs rapides pour les textes (charte + classiques)
const TEXT_COLORS = ['#21392B', '#2E4A3D', '#000000', '#FFFFFF', '#D81E27', '#C2410C', '#FFD400', '#15803d', '#1d4ed8', '#7c3aed'];

const PAGE_FORMATS = [
  { id: 'fit', name: '1 / page', w: 0, h: 0 },
  { id: 'A4', name: 'A4', w: 210, h: 297 },
  { id: 'A5', name: 'A5', w: 148, h: 210 },
  { id: 'A3', name: 'A3', w: 297, h: 420 },
  { id: 'roll', name: 'Rouleau', w: 0, h: 0 },
];

// Formats d'étiquette disponibles (taille au niveau de la planche).
export const FORMATS = [
  { id: 'a4', name: 'A4', w: 210, h: 297, page: 'A4', kw: /a4|210|297|affiche/i },
  { id: 'reglette', name: 'Réglette', w: 200, h: 80, page: 'fit', kw: /r[eé]glette|reglette|200.?80|bandeau|lin[eé]aire/i },
  { id: 'vitrine', name: 'Vitrine', w: 105, h: 150, page: 'fit', kw: /vitrine|105.?150|a6/i },
  { id: 'rayon', name: 'Rayon', w: 63, h: 72, page: 'fit', kw: /rayon|63.?72|[eé]tag[eè]re|lin[eé]aire/i },
  { id: 'petite', name: 'Petite', w: 48, h: 45, page: 'fit', kw: /petite|48.?45|mini/i },
];
const matchFormat = (s: string) => { const t = (s || '').trim(); return t ? FORMATS.find(f => f.kw.test(t)) || null : null; };
const LABEL_PRESETS = FORMATS.map(f => ({ name: `${f.name} — ${f.w}×${f.h}`, w: f.w, h: f.h }));

const MARGIN_MM = 0, HEADER_MM = 0, GAP_MM = 3;

const SYS = FONTS[0].css;
const DISCLAIMER = '*Non cumulable avec d’autres promotions en cours et dans la limite des stocks disponibles.';
const uid = () => Math.random().toString(36).slice(2, 9);

// Affichage UNIFORME d'un prix : quelle que soit la saisie (Excel « 5.9 », « 5,90 », « 5.90 € »),
// le rendu est toujours « 5,90 € ». Garantit que les chiffres sont chartés de la même façon sur
// toutes les étiquettes d'un import en masse. (Une valeur non numérique est laissée telle quelle.)
const eur = (s: string) => { const n = pf(s); return n > 0 ? `${ff(n)} €` : (s || '').trim(); };

const newData = (): LabelData => ({
  category: 'COMPLÉMENT ALIMENTAIRE', product: 'Nom du produit', qtyLabel: '',
  normalPrice: '31,90', promoPrice: '26,90',
  remiseType: 'euro', remiseManual: '',
  couponValue: '2,00', couponExpiry: '31/12/2026',
  lotQty: '3', lotFree: '1', lotPrice: '19,98', unitPrice: '9,99',
  t1q: '1', t1p: '9,90', t2q: '2', t2p: '8,50', t3q: '3', t3p: '7,90',
  dateStart: '', dateEnd: '',
});

export function newLabel(type: PromoType = 'prix-promo', data?: Partial<LabelData>, size?: { w: number; h: number }): Label {
  return { id: uid(), type, accent: DA.red, bg: DA.bg, data: { ...newData(), ...data }, overrides: {}, extra: [], ...(size ? { wMm: size.w, hMm: size.h } : {}) };
}

function defaultProject(): Project {
  return {
    pharmacy: 'Pharmacie Homme de Fer', plan: 'Plan promotionnel', logo: null, disclaimer: DISCLAIMER,
    pageFormat: 'A4', labelWmm: 210, labelHmm: 297, printPaper: 'A4', printMarginMm: 0, theme: 'promo',
    labels: [newLabel('prix-promo', { category: 'COMPLÉMENT ALIMENTAIRE', product: 'Chondro-haid Fort ARKOPHARMA', qtyLabel: 'Lot de 3 x 60 gélules*', normalPrice: '31,90', promoPrice: '26,90' })],
  };
}

function migrate(p: Project): Project {
  const q = p as Project & { cols?: number; rows?: number };
  if (!q.pageFormat) q.pageFormat = 'A4';
  if (!q.labelWmm || !q.labelHmm) { q.labelWmm = 210; q.labelHmm = 297; }
  if (q.disclaimer == null) q.disclaimer = DISCLAIMER;
  if (!q.printPaper) q.printPaper = 'A4';
  if (q.printMarginMm == null) q.printMarginMm = 0;
  // styles disponibles : « promo » (jaune) et « officine » (blanc + vert). Legacy → promo.
  if (q.theme === 'choc') q.theme = 'officine';
  if (!q.theme || q.theme === 'luxe' || q.theme === 'editorial' || q.theme === 'premium') q.theme = 'promo';
  q.labels = (q.labels || []).map(l => ({ ...l, data: { ...newData(), ...l.data } }));
  return q;
}

// ──────────────────────────────────────────────────────────────────────
//  ÉLÉMENTS PAR TYPE (DA premium, orientée)
// ──────────────────────────────────────────────────────────────────────

const B = { font: SYS, rot: 0 };

function dateText(d: LabelData, o?: SeedOpts): string | null {
  // Dates de l'étiquette, sinon période globale de la planche.
  const s = d.dateStart || o?.dateStart || '';
  const e = d.dateEnd || o?.dateEnd || '';
  if (s && e) return `Offre valable du ${s} au ${e}`;
  if (s) return `Offre valable dès le ${s}`;
  if (e) return `Offre valable jusqu'au ${e}`;
  return null;
}

// pieds (date, mentions, logo) — positions portrait / réglette
function footEls(l: Label, o: SeedOpts): El[] {
  const out: El[] = [];
  const dt = dateText(l.data, o);
  // coordonnées de la zone logo + pied selon orientation
  const lx = o.landscape ? 88 : 6, ly = o.landscape ? 80 : 84, lw = o.landscape ? 10 : 17;
  if (!o.small) {
    if (o.landscape) {
      if (dt) out.push({ ...B, id: 'date', kind: 'text', text: dt, x: 3, y: 82, w: 55, size: 0.06, color: DA.band, weight: 700, align: 'left' });
      if (o.disclaimer) out.push({ ...B, id: 'disc', kind: 'text', text: o.disclaimer, x: 3, y: 91, w: 60, size: 0.048, color: DA.ink, weight: 500, align: 'left' });
    } else {
      if (dt) out.push({ ...B, id: 'date', kind: 'text', text: dt, x: 26, y: 87.5, w: 58, size: 0.019, color: DA.band, weight: 700, align: 'left' });
      if (o.disclaimer) out.push({ ...B, id: 'disc', kind: 'text', text: o.disclaimer, x: 26, y: 92, w: 60, size: 0.016, color: DA.ink, weight: 500, align: 'left' });
    }
  }
  // LOGO : affiché uniquement si un logo a été téléversé — aucun emplacement vide.
  if (o.logo) out.push({ ...B, id: 'plogo', kind: 'image', src: o.logo, x: lx, y: ly, w: lw, size: 0, color: '#000', weight: 400, align: 'left' });
  return out;
}

// ── Style « Officine » : blanc + vert pharmacie, lisible de loin ──
// Cadre commun (en-tête vert + croix, pied validité/mentions/logo) réutilisé par
// tous les types. Hiérarchie merchandising : 1 héros (le deal), accroche −% géante,
// zéro texte superflu. Vert = identité, rouge = la promo.
function offiHeader(d: LabelData, asp: number): El[] {
  return [
    { ...B, id: 'bgcover', kind: 'box', x: 0, y: 0, w: 100, h: 100, bg: OFFI.bg, size: 0, color: OFFI.bg, weight: 400, align: 'left' },
    { ...B, id: 'band', kind: 'box', x: 0, y: 0, w: 100, h: 9, bg: OFFI.green, size: 0, color: OFFI.green, weight: 400, align: 'left' },
    { ...B, id: 'cross', kind: 'text', text: '✚', x: 4, y: 2.3, size: 0.042, color: OFFI.white, weight: 900, align: 'left' },
    { ...B, id: 'cat', kind: 'text', text: d.category, x: 0, y: 3, w: 100, size: fitSize(d.category, 0.9, asp, 0.03, 1, 0.016), color: OFFI.white, weight: 800, align: 'center', track: 0.16 },
  ];
}
function offiFooter(l: Label, o: SeedOpts): El[] {
  const out: El[] = [];
  const dt = dateText(l.data, o);
  // Petits formats (rayon / petite) : on retire validité + mentions pour rester lisible.
  if (!o.small) out.push({ ...B, id: 'urgency', kind: 'text', text: dt || 'Offre dans la limite des stocks disponibles', x: 12, y: 90, w: 76, size: 0.02, color: OFFI.green, weight: 700, align: 'center', track: 0.02 });
  if (!o.small && o.disclaimer) out.push({ ...B, id: 'disc', kind: 'text', text: o.disclaimer, x: 8, y: 95.5, w: 84, size: 0.013, color: OFFI.muted, weight: 400, align: 'center' });
  if (o.logo) out.push({ ...B, id: 'plogo', kind: 'image', src: o.logo, x: 86, y: 85, w: 10, size: 0, color: '#000', weight: 400, align: 'left' });
  return out;
}
// Offre « 2ᵉ produit à -X% » : à partir du prix unitaire et du pourcentage,
// on calcule le prix des 2 (1 plein + 1 remisé). Textes prêts à afficher.
function deux2(d: LabelData) {
  const unit = pf(d.normalPrice);
  const pct = Math.max(1, Math.min(99, parseInt((d.remiseManual || '').replace(/[^\d]/g, '')) || 50));
  const lot2 = Math.round(unit * (2 - pct / 100) * 100) / 100; // plein + (-pct%)
  return { unit, pct, lot2, unitTxt: `À L'UNITÉ ${ff(unit)} €`, lotTxt: `soit ${ff(lot2)} € le lot de 2` };
}

// Disque rouge « accroche » (le −%, le OFFERT…), centré, avec texte ajusté.
function offiBurst(big: string, small: string | null, asp: number, y = 30, w = 48): El[] {
  const cx = 50 - w / 2, h = w * asp;
  const out: El[] = [{ ...B, id: 'burst', kind: 'box', shape: 'circle', x: cx, y, w, bg: OFFI.promo, size: 0, color: OFFI.promo, weight: 400, align: 'left', shadow: true }];
  const cy = y + h / 2;
  if (small) {
    out.push({ ...B, id: 'burstTxt', kind: 'text', text: big, x: cx, y: cy - h * 0.42, w, size: fitSize(big, w / 100 * 0.7, asp, 0.16, 1, 0.07), color: OFFI.white, weight: 900, align: 'center' });
    out.push({ ...B, id: 'burstSub', kind: 'text', text: small, x: cx, y: cy + h * 0.1, w, size: fitSize(small, w / 100 * 0.82, asp, 0.04, 1, 0.022), color: OFFI.white, weight: 800, align: 'center', track: 0.08 });
  } else {
    out.push({ ...B, id: 'burstTxt', kind: 'text', text: big, x: cx, y: cy - h * 0.26, w, size: fitSize(big, w / 100 * 0.74, asp, 0.16, 1, 0.07), color: OFFI.white, weight: 900, align: 'center' });
  }
  return out;
}

// Pastille « remise » Officine : pilule rouge horizontale, texte blanc maximisé.
// Une pilule large laisse bien plus de place au chiffre qu'un disque (qui gaspille les coins)
// → la remise « -5€ / -30% » est nettement plus lisible de loin, à surface égale.
function offiSave(txt: string, asp: number, x: number, y: number, w: number, h: number, bg = OFFI.promo, fg = OFFI.white): El[] {
  const fs = fitSize(txt, (w / 100) * 0.8, asp, (h / 100) * 0.66, 1, 0.04);
  return [
    { ...B, id: 'saveBox', kind: 'box', x, y, w, h, bg, radius: 999, size: 0, color: bg, weight: 400, align: 'left', shadow: true },
    { ...B, id: 'saveTxt', kind: 'text', text: txt, x, y: y + (h - fs * 100) / 2, w, size: fs, color: fg, weight: 900, align: 'center', track: 0.01 },
  ];
}

// Prix « charme » Officine : euros GROS + centimes/€ plus petits (réduit la « douleur du prix »).
// Astuce merchandising : on aligne la VIRGULE au centre de la zone → le prix reste optiquement
// centré quel que soit le nombre de chiffres, et les centimes montent en exposant.
function offiPrice(raw: string, asp: number, y: number, bigCap: number, floor: number, x0 = 0, w = 99, color = OFFI.promo, centsRatio = 0.48): El[] {
  const promo = pf(raw);
  const intp = Math.floor(promo).toString();
  const cents = Math.round((promo - Math.floor(promo)) * 100).toString().padStart(2, '0');
  const cx = x0 + w * 0.45; // virgule un peu avant le centre : plus de place à droite pour centimes + euro
  const big = fitSize(intp, (cx - x0) / 100, asp, bigCap, 1, floor);
  const small = Math.round(big * centsRatio * 1000) / 1000; // centimes ajustables, lus avec les euros
  return [
    { ...B, id: 'priceInt', kind: 'text', text: intp, x: x0, y, w: cx - x0, size: big, color, weight: 900, align: 'right' },
    { ...B, id: 'priceDec', kind: 'text', text: `,${cents} €`, x: cx, y, w: x0 + w - cx, size: small, color, weight: 900, align: 'left' },
  ];
}

function officinePrixPromo(l: Label, o: SeedOpts): El[] {
  const d = l.data, asp = o.aspect || 0.7;
  const { normal, pct, remise } = priceParts(d.normalPrice, d.promoPrice);
  const manual = (d.remiseManual || '').trim();
  // Remise toujours présente s'il y a une réduction : % si dispo, sinon € (et vice-versa).
  const discTxt = d.remiseType === 'pct'
    ? ((manual || pct) ? `-${manual || pct}%` : (remise ? `-${remise}€` : ''))
    : (manual ? `-${manual}€` : (remise ? `-${remise}€` : (pct ? `-${pct}%` : '')));
  const hasOld = normal > pf(d.promoPrice);
  // Ordre merchandising imposé (s'adapte aux noms longs, produit sur 2 lignes max) :
  // 1) catégorie (bandeau) · 2) PRIX PROMO (héros) · 3) AU LIEU DE · 4) nom produit ·
  // 5) remise (disque) · 6) mentions légales (pied).
  const out: El[] = [...offiHeader(d, asp)];
  // 2) Prix de vente en ROUGE (héros), juste sous la catégorie — centimes en exposant.
  out.push(...offiPrice(d.promoPrice, asp, 11, 0.18, 0.11));
  // 3) Au lieu de — ancien prix barré.
  if (hasOld) out.push(
    { ...B, id: 'oldLabel', kind: 'text', text: 'AU LIEU DE', x: 0, y: 31, w: 100, size: 0.018, color: OFFI.muted, weight: 700, align: 'center', track: 0.14 },
    { ...B, id: 'old', kind: 'text', text: eur(d.normalPrice), x: 0, y: 33.5, w: 100, size: 0.034, color: OFFI.old, weight: 800, align: 'center', strike: true, strikeW: 0.045 },
  );
  // 4) Nom du produit (+ descriptif éventuel).
  out.push({ ...B, id: 'product', kind: 'text', text: d.product, x: 5, y: 42, w: 90, size: fitSize(d.product, 0.92, asp, 0.05, 2, 0.03), color: OFFI.greenDark, weight: 900, align: 'center' });
  if (d.qtyLabel) out.push({ ...B, id: 'qty', kind: 'text', text: d.qtyLabel, x: 6, y: 53.5, w: 88, size: fitSize(d.qtyLabel, 0.92, asp, 0.022, 1, 0.016), color: OFFI.muted, weight: 600, align: 'center', italic: true });
  // 5) Remise (ex. −4 €) — pastille rouge large, texte blanc XXL (plus lisible qu'un disque).
  if (discTxt) out.push(...offiSave(discTxt, asp, 23, 61, 54, 17));
  // 6) Mentions légales / validité.
  out.push(...offiFooter(l, o));
  return out;
}

function officineBon(l: Label, o: SeedOpts): El[] {
  const d = l.data, asp = o.aspect || 0.7;
  const out: El[] = [...offiHeader(d, asp),
    { ...B, id: 'btag', kind: 'text', text: 'BON DE RÉDUCTION', x: 0, y: 13, w: 100, size: 0.032, color: OFFI.green, weight: 800, align: 'center', track: 0.12 },
    { ...B, id: 'product', kind: 'text', text: d.product, x: 5, y: 20, w: 90, size: fitSize(d.product, 0.9, asp, 0.05, 2, 0.032), color: OFFI.greenDark, weight: 900, align: 'center' },
  ];
  // Valeur du bon = héros géant rouge
  out.push(...offiBurst(eur(d.couponValue), 'DE RÉDUCTION', asp, 33, 50));
  out.push({ ...B, id: 'exp', kind: 'text', text: `Valable jusqu'au ${d.couponExpiry}`, x: 6, y: 80, w: 88, size: 0.026, color: OFFI.green, weight: 700, align: 'center' });
  out.push(...offiFooter(l, o));
  return out;
}

function officineLot(l: Label, o: SeedOpts): El[] {
  const d = l.data, asp = o.aspect || 0.7;
  const qty = Math.max(2, parseInt(d.lotQty) || 3), free = Math.max(1, parseInt(d.lotFree) || 1), paid = Math.max(1, qty - free);
  const out: El[] = [...offiHeader(d, asp),
    { ...B, id: 'ltag', kind: 'text', text: 'OFFRE LOT', x: 0, y: 13, w: 100, size: 0.032, color: OFFI.green, weight: 800, align: 'center', track: 0.12 },
    { ...B, id: 'product', kind: 'text', text: d.product, x: 5, y: 20, w: 90, size: fitSize(d.product, 0.9, asp, 0.05, 2, 0.032), color: OFFI.greenDark, weight: 900, align: 'center' },
  ];
  // « +N OFFERT(S) » = héros géant rouge
  out.push(...offiBurst(`+${free}`, `OFFERT${free > 1 ? 'S' : ''}`, asp, 32, 48));
  out.push({ ...B, id: 'mech', kind: 'text', text: `${paid} acheté${paid > 1 ? 's' : ''} + ${free} offert${free > 1 ? 's' : ''}`, x: 6, y: 75, w: 88, size: 0.03, color: OFFI.greenDark, weight: 800, align: 'center' });
  out.push({ ...B, id: 'lotPrice', kind: 'text', text: `LE LOT : ${eur(d.lotPrice)}`, x: 2, y: 80.5, w: 96, size: fitSize(`LE LOT : ${eur(d.lotPrice)}`, 0.9, asp, 0.05, 1, 0.03), color: OFFI.promo, weight: 900, align: 'center' });
  out.push(...offiFooter(l, o));
  return out;
}

function officineMulti(l: Label, o: SeedOpts): El[] {
  const d = l.data, asp = o.aspect || 0.7;
  const cols = [{ q: d.t1q, p: d.t1p }, { q: d.t2q, p: d.t2p }, { q: d.t3q, p: d.t3p }];
  const out: El[] = [...offiHeader(d, asp),
    { ...B, id: 'mtitle', kind: 'text', text: 'OFFRE MULTI-ACHAT', x: 0, y: 13, w: 100, size: 0.032, color: OFFI.green, weight: 800, align: 'center', track: 0.1 },
    { ...B, id: 'product', kind: 'text', text: d.product, x: 5, y: 20, w: 90, size: fitSize(d.product, 0.9, asp, 0.05, 2, 0.032), color: OFFI.greenDark, weight: 900, align: 'center' },
  ];
  cols.forEach((c, i) => {
    const cx = 7 + i * 29, best = i === 2;
    out.push({ ...B, id: `col${i}`, kind: 'box', x: cx, y: 36, w: 26, h: 26, bg: best ? OFFI.promo : OFFI.greenSoft, radius: 10, size: 0, color: best ? OFFI.promo : OFFI.greenSoft, weight: 400, align: 'left', shadow: best });
    out.push({ ...B, id: `q${i}`, kind: 'text', text: `${c.q} pce${parseInt(c.q) > 1 ? 's' : ''}`, x: cx, y: 39, w: 26, size: 0.028, color: best ? OFFI.white : OFFI.greenDark, weight: 800, align: 'center' });
    out.push({ ...B, id: `p${i}`, kind: 'text', text: eur(c.p), x: cx, y: 49, w: 26, size: 0.05, color: best ? OFFI.white : OFFI.promo, weight: 900, align: 'center' });
  });
  out.push({ ...B, id: 'mfoot', kind: 'text', text: 'Plus vous achetez, plus vous économisez', x: 6, y: 70, w: 88, size: 0.028, color: OFFI.green, weight: 700, align: 'center' });
  out.push(...offiFooter(l, o));
  return out;
}

function officine2eme(l: Label, o: SeedOpts): El[] {
  const d = l.data, asp = o.aspect || 0.7;
  const { pct, unitTxt, lotTxt } = deux2(d);
  const out: El[] = [...offiHeader(d, asp),
    { ...B, id: 'tag', kind: 'text', text: 'OFFRE 2ᵉ PRODUIT', x: 0, y: 13, w: 100, size: 0.032, color: OFFI.green, weight: 800, align: 'center', track: 0.1 },
    { ...B, id: 'product', kind: 'text', text: d.product, x: 5, y: 20, w: 90, size: fitSize(d.product, 0.9, asp, 0.05, 2, 0.032), color: OFFI.greenDark, weight: 900, align: 'center' },
    { ...B, id: 'unitp', kind: 'text', text: unitTxt, x: 5, y: 31, w: 90, size: 0.026, color: OFFI.muted, weight: 700, align: 'center', track: 0.02 },
  ];
  // -X% = héros géant rouge (disque), sous-titre « SUR LE 2ᵉ ».
  out.push(...offiBurst(`-${pct}%`, 'SUR LE 2ᵉ', asp, 36, 50));
  out.push({ ...B, id: 'lot2', kind: 'text', text: lotTxt, x: 6, y: 80, w: 88, size: 0.028, color: OFFI.green, weight: 700, align: 'center' });
  out.push(...offiFooter(l, o));
  return out;
}

function officineSeed(l: Label, o: SeedOpts): El[] {
  if (l.type === 'bon-reduction') return officineBon(l, o);
  if (l.type === 'remise-lot') return officineLot(l, o);
  if (l.type === 'multi-achat') return officineMulti(l, o);
  if (l.type === 'remise-2eme') return officine2eme(l, o);
  return officinePrixPromo(l, o);
}

// ── Officine COMPACT (petits formats : rayon, petite) : épuré, l'essentiel en gros ──
function officineCompact(l: Label, o: SeedOpts): El[] {
  const d = l.data, asp = o.aspect || 0.8;
  const { normal, pct, remise } = priceParts(d.normalPrice, d.promoPrice);
  const manual = (d.remiseManual || '').trim();
  const disc = d.remiseType === 'pct' ? ((manual || pct) ? `-${manual || pct}%` : (remise ? `-${remise}€` : '')) : (manual ? `-${manual}€` : (remise ? `-${remise}€` : (pct ? `-${pct}%` : '')));
  const hasOld = normal > pf(d.promoPrice);
  // Même ordre que le grand format, condensé : catégorie · PRIX · au lieu de · produit · remise.
  const out: El[] = [...offiHeader(d, asp)];
  out.push(...offiPrice(d.promoPrice, asp, 13, 0.24, 0.14));
  if (hasOld) out.push({ ...B, id: 'old', kind: 'text', text: eur(d.normalPrice), x: 0, y: 40, w: 100, size: 0.05, color: OFFI.old, weight: 700, align: 'center', strike: true, strikeW: 0.05 });
  out.push({ ...B, id: 'product', kind: 'text', text: d.product, x: 4, y: 50, w: 92, size: fitSize(d.product, 0.92, asp, 0.072, 2, 0.044), color: OFFI.greenDark, weight: 900, align: 'center' });
  if (disc) out.push(...offiSave(disc, asp, 22, 73, 56, 16));
  return out;
}

// ── Officine RÉGLETTE (paysage) : bande verte identité à gauche, prix à droite ──
function officineReglette(l: Label, o: SeedOpts): El[] {
  const d = l.data, asp = o.aspect || 2.5;
  const { normal, pct, remise } = priceParts(d.normalPrice, d.promoPrice);
  const manual = (d.remiseManual || '').trim();
  let priceVal = d.promoPrice, oldTxt = normal > pf(d.promoPrice) ? eur(d.normalPrice) : '', tag = '';
  let disc = d.remiseType === 'pct' ? ((manual || pct) ? `-${manual || pct}%` : (remise ? `-${remise}€` : '')) : (manual ? `-${manual}€` : (remise ? `-${remise}€` : (pct ? `-${pct}%` : '')));
  if (l.type === 'bon-reduction') { priceVal = d.couponValue; oldTxt = ''; disc = ''; tag = 'BON DE RÉDUCTION'; }
  else if (l.type === 'remise-lot') { priceVal = d.lotPrice; oldTxt = ''; disc = `+${Math.max(1, parseInt(d.lotFree) || 1)} OFFERT`; tag = 'LOT'; }
  else if (l.type === 'multi-achat') { priceVal = d.t3p || d.t1p; oldTxt = ''; disc = ''; tag = 'MULTI-ACHAT'; }
  const out: El[] = [
    { ...B, id: 'bgcover', kind: 'box', x: 0, y: 0, w: 100, h: 100, bg: OFFI.bg, size: 0, color: OFFI.bg, weight: 400, align: 'left' },
    { ...B, id: 'band', kind: 'box', x: 0, y: 0, w: 54, h: 100, bg: OFFI.green, size: 0, color: OFFI.green, weight: 400, align: 'left' },
    { ...B, id: 'cross', kind: 'text', text: '✚', x: 3, y: 7, size: 0.14, color: OFFI.white, weight: 900, align: 'left' },
    { ...B, id: 'cat', kind: 'text', text: d.category, x: 14, y: 10, w: 38, size: fitSize(d.category, 0.36, asp, 0.1, 1, 0.05), color: OFFI.white, weight: 800, align: 'left', track: 0.06 },
    { ...B, id: 'product', kind: 'text', text: d.product, x: 4, y: 33, w: 48, size: fitSize(d.product, 0.46, asp, 0.16, 3, 0.075), color: OFFI.white, weight: 900, align: 'left' },
  ];
  // 2ᵉ produit à -X% : pourcentage en héros à droite (rouge), prix unité + lot.
  if (l.type === 'remise-2eme') {
    const { pct: p2, unitTxt, lotTxt } = deux2(d);
    out.push({ ...B, id: 'tag', kind: 'text', text: '2ᵉ PRODUIT', x: 56, y: 9, w: 42, size: 0.07, color: OFFI.green, weight: 800, align: 'center', track: 0.06 });
    out.push({ ...B, id: 'unitp', kind: 'text', text: unitTxt, x: 56, y: 26, w: 42, size: fitSize(unitTxt, 0.4, asp, 0.06, 1, 0.04), color: OFFI.muted, weight: 700, align: 'center' });
    out.push({ ...B, id: 'pct', kind: 'text', text: `-${p2}%`, x: 55, y: 33, w: 44, size: fitSize(`-${p2}%`, 0.42, asp, 0.34, 1, 0.2), color: OFFI.promo, weight: 900, align: 'center' });
    out.push({ ...B, id: 'lot2', kind: 'text', text: lotTxt, x: 55, y: 82, w: 44, size: fitSize(lotTxt, 0.42, asp, 0.05, 1, 0.03), color: OFFI.green, weight: 600, align: 'center' });
    return out;
  }
  // Colonne droite, même ordre que les autres formats : tag · PRIX (héros) · au lieu de · remise.
  if (tag) out.push({ ...B, id: 'tag', kind: 'text', text: tag, x: 56, y: 7, w: 42, size: 0.07, color: OFFI.green, weight: 800, align: 'center', track: 0.1 });
  out.push(...offiPrice(priceVal, asp, 18, 0.31, 0.18, 54, 45));
  if (oldTxt) out.push({ ...B, id: 'old', kind: 'text', text: oldTxt, x: 55, y: 53, w: 44, size: 0.085, color: OFFI.old, weight: 700, align: 'center', strike: true, strikeW: 0.04 });
  if (disc) out.push(...offiSave(disc, asp, 60, 64, 36, 15));
  if (d.qtyLabel) out.push({ ...B, id: 'qty', kind: 'text', text: d.qtyLabel, x: 54, y: 82, w: 30, size: fitSize(d.qtyLabel, 0.28, asp, 0.06, 1, 0.04), color: OFFI.muted, weight: 600, align: 'center', italic: true });
  if (o.logo) out.push({ ...B, id: 'plogo', kind: 'image', src: o.logo, x: 4, y: 82, w: 13, size: 0, color: '#000', weight: 400, align: 'left' });
  return out;
}

// ── Promo COMPACT (petits formats : rayon, petite) : le thème jaune n'avait pas de
// gabarit petit format → la grosse mise en page portrait débordait. Version épurée et
// lisible : bandeau catégorie, prix charme rouge, ancien prix barré, pastille remise. ──
function daCompact(l: Label, o: SeedOpts): El[] {
  const d = l.data, asp = o.aspect || 0.8;
  const GOLD = '#A89A6E';
  // En-tête commun : bandeau vert + catégorie.
  const out: El[] = [
    { ...B, id: 'band', kind: 'box', x: 0, y: 0, w: 100, h: 10, bg: DA.band, size: 0, color: '#fff', weight: 400, align: 'left' },
    { ...B, id: 'cat', kind: 'text', text: d.category, x: 2, y: 2.6, w: 96, size: fitSize(d.category, 0.94, asp, 0.045, 1, 0.028), color: '#fff', weight: 800, align: 'center' },
  ];
  const product = (y: number) => ({ ...B, id: 'product', kind: 'text' as ElKind, text: d.product, x: 4, y, w: 92, size: fitSize(d.product, 0.92, asp, 0.066, 2, 0.03), color: '#16231A', weight: 900, align: 'center' as Align });

  if (l.type === 'bon-reduction') {
    out.push({ ...B, id: 'btag', kind: 'text', text: 'BON DE RÉDUCTION', x: 2, y: 12, w: 96, size: fitSize('BON DE RÉDUCTION', 0.9, asp, 0.04, 1, 0.024), color: DA.green, weight: 800, align: 'center', track: 0.06 });
    out.push(product(22));
    out.push(...offiPrice(d.couponValue, asp, 40, 0.22, 0.12, 0, 99, DA.red));
    out.push({ ...B, id: 'exp', kind: 'text', text: `Valable jusqu'au ${d.couponExpiry}`, x: 4, y: 82, w: 92, size: fitSize(`Valable jusqu'au ${d.couponExpiry}`, 0.9, asp, 0.035, 1, 0.022), color: DA.green, weight: 700, align: 'center' });
    return out;
  }
  if (l.type === 'remise-lot') {
    const free = Math.max(1, parseInt(d.lotFree) || 1);
    out.push(product(13));
    out.push(...offiSave(`+${free} OFFERT${free > 1 ? 'S' : ''}`, asp, 12, 34, 76, 22, DA.red, '#fff'));
    out.push({ ...B, id: 'lotPrice', kind: 'text', text: `LE LOT : ${eur(d.lotPrice)}`, x: 2, y: 66, w: 96, size: fitSize(`LE LOT : ${eur(d.lotPrice)}`, 0.94, asp, 0.07, 1, 0.04), color: DA.red, weight: 900, align: 'center' });
    return out;
  }
  if (l.type === 'multi-achat') {
    // Petit format : on met en avant le meilleur palier (le plus avantageux).
    const q = d.t3q || d.t1q, p = d.t3p || d.t1p;
    out.push(product(13));
    out.push({ ...B, id: 'mtitle', kind: 'text', text: `DÈS ${q} ACHETÉS`, x: 2, y: 33, w: 96, size: fitSize(`DÈS ${q} ACHETÉS`, 0.9, asp, 0.045, 1, 0.028), color: DA.green, weight: 800, align: 'center', track: 0.04 });
    out.push(...offiPrice(p, asp, 44, 0.22, 0.12, 0, 99, DA.red));
    return out;
  }
  if (l.type === 'remise-2eme') {
    const { pct: p2, lotTxt } = deux2(d);
    out.push(product(13));
    out.push({ ...B, id: 'pct', kind: 'text', text: `-${p2}%`, x: 0, y: 30, w: 100, size: fitSize(`-${p2}%`, 0.96, asp, 0.26, 1, 0.16), color: DA.red, weight: 900, align: 'center' });
    out.push({ ...B, id: 'on2nd', kind: 'text', text: 'SUR LE 2ᵉ PRODUIT', x: 2, y: 66, w: 96, size: fitSize('SUR LE 2ᵉ PRODUIT', 0.9, asp, 0.045, 1, 0.028), color: DA.green, weight: 800, align: 'center', track: 0.03 });
    out.push({ ...B, id: 'lot2', kind: 'text', text: lotTxt, x: 2, y: 78, w: 96, size: fitSize(lotTxt, 0.9, asp, 0.034, 1, 0.022), color: DA.ink, weight: 600, align: 'center' });
    return out;
  }
  // ── PRIX PROMO (défaut) ──
  const { normal, pct, remise } = priceParts(d.normalPrice, d.promoPrice);
  const manual = (d.remiseManual || '').trim();
  const disc = d.remiseType === 'pct' ? ((manual || pct) ? `-${manual || pct}%` : (remise ? `-${remise}€` : '')) : (manual ? `-${manual}€` : (remise ? `-${remise}€` : (pct ? `-${pct}%` : '')));
  out.push(...offiPrice(d.promoPrice, asp, 14, 0.24, 0.14, 0, 99, DA.red));
  if (normal > pf(d.promoPrice)) out.push({ ...B, id: 'old', kind: 'text', text: eur(d.normalPrice), x: 0, y: 41, w: 100, size: 0.045, color: GOLD, weight: 700, align: 'center', strike: true, strikeW: 0.05 });
  out.push(product(51));
  if (disc) out.push(...offiSave(disc, asp, 22, 74, 56, 16, DA.red, '#fff'));
  return out;
}

// ── Promo RÉGLETTE (paysage) : identité verte à gauche, prix à droite — tous types.
// Clone de la géométrie Officine (déjà validée) avec la palette jaune/vert/rouge. ──
function daReglette(l: Label, o: SeedOpts): El[] {
  const d = l.data, asp = o.aspect || 2.5;
  const { normal, pct, remise } = priceParts(d.normalPrice, d.promoPrice);
  const manual = (d.remiseManual || '').trim();
  let priceVal = d.promoPrice, oldTxt = normal > pf(d.promoPrice) ? eur(d.normalPrice) : '', tag = '';
  let disc = d.remiseType === 'pct' ? ((manual || pct) ? `-${manual || pct}%` : (remise ? `-${remise}€` : '')) : (manual ? `-${manual}€` : (remise ? `-${remise}€` : (pct ? `-${pct}%` : '')));
  if (l.type === 'bon-reduction') { priceVal = d.couponValue; oldTxt = ''; disc = ''; tag = 'BON DE RÉDUCTION'; }
  else if (l.type === 'remise-lot') { priceVal = d.lotPrice; oldTxt = ''; disc = `+${Math.max(1, parseInt(d.lotFree) || 1)} OFFERT`; tag = 'LOT'; }
  else if (l.type === 'multi-achat') { priceVal = d.t3p || d.t1p; oldTxt = ''; disc = ''; tag = 'MULTI-ACHAT'; }
  const out: El[] = [
    { ...B, id: 'bgcover', kind: 'box', x: 0, y: 0, w: 100, h: 100, bg: DA.bg, size: 0, color: DA.bg, weight: 400, align: 'left' },
    { ...B, id: 'band', kind: 'box', x: 0, y: 0, w: 54, h: 100, bg: DA.band, size: 0, color: DA.band, weight: 400, align: 'left' },
    { ...B, id: 'cross', kind: 'text', text: '✚', x: 3, y: 7, size: 0.14, color: '#fff', weight: 900, align: 'left' },
    { ...B, id: 'cat', kind: 'text', text: d.category, x: 14, y: 10, w: 38, size: fitSize(d.category, 0.36, asp, 0.1, 1, 0.05), color: '#fff', weight: 800, align: 'left', track: 0.06 },
    { ...B, id: 'product', kind: 'text', text: d.product, x: 4, y: 33, w: 48, size: fitSize(d.product, 0.46, asp, 0.16, 3, 0.05), color: '#fff', weight: 900, align: 'left' },
  ];
  // 2ᵉ produit à -X% : cercle rouge à droite, pourcentage en héros (palette DA).
  if (l.type === 'remise-2eme') {
    const { pct: p2, unitTxt, lotTxt } = deux2(d);
    const cbg = `radial-gradient(circle at 50% 50%, ${l.accent} 58%, ${DA.red2})`;
    out.push({ ...B, id: 'circle', kind: 'box', shape: 'circle', x: 59, y: 4, w: 37, bg: cbg, size: 0, color: l.accent, weight: 400, align: 'left', shadow: true });
    out.push({ ...B, id: 'unitp', kind: 'text', text: unitTxt, x: 59, y: 18, w: 37, size: fitSize(unitTxt, 0.3, asp, 0.05, 1, 0.03), color: '#fff', weight: 700, align: 'center', track: 0.02 });
    out.push({ ...B, id: 'pct', kind: 'text', text: `-${p2}%`, x: 59, y: 26, w: 37, size: fitSize(`-${p2}%`, 0.32, asp, 0.28, 1, 0.18), color: DA.priceY, weight: 900, align: 'center' });
    out.push({ ...B, id: 'on2nd', kind: 'text', text: 'SUR LE 2ᵉ PRODUIT', x: 58, y: 61, w: 39, size: fitSize('SUR LE 2ᵉ PRODUIT', 0.34, asp, 0.043, 1, 0.026), color: '#fff', weight: 800, align: 'center', track: 0.01 });
    out.push({ ...B, id: 'lot2', kind: 'text', text: lotTxt, x: 58, y: 72, w: 39, size: fitSize(lotTxt, 0.34, asp, 0.04, 1, 0.024), color: '#fff', weight: 600, align: 'center' });
    if (o.logo) out.push({ ...B, id: 'plogo', kind: 'image', src: o.logo, x: 4, y: 82, w: 13, size: 0, color: '#000', weight: 400, align: 'left' });
    return out;
  }
  if (tag) out.push({ ...B, id: 'tag', kind: 'text', text: tag, x: 56, y: 7, w: 42, size: 0.07, color: DA.green, weight: 800, align: 'center', track: 0.1 });
  out.push(...offiPrice(priceVal, asp, 18, 0.31, 0.18, 54, 45, DA.red));
  if (oldTxt) out.push({ ...B, id: 'old', kind: 'text', text: oldTxt, x: 55, y: 53, w: 44, size: 0.085, color: '#9A8F6A', weight: 700, align: 'center', strike: true, strikeW: 0.04 });
  if (disc) out.push(...offiSave(disc, asp, 60, 64, 36, 15, DA.red, '#fff'));
  if (d.qtyLabel) out.push({ ...B, id: 'qty', kind: 'text', text: d.qtyLabel, x: 54, y: 82, w: 30, size: fitSize(d.qtyLabel, 0.28, asp, 0.06, 1, 0.04), color: DA.ink, weight: 600, align: 'center', italic: true });
  if (o.logo) out.push({ ...B, id: 'plogo', kind: 'image', src: o.logo, x: 4, y: 82, w: 13, size: 0, color: '#000', weight: 400, align: 'left' });
  return out;
}

function seedEls(l: Label, o: SeedOpts): El[] {
  if (o.theme === 'officine') {
    // Gabarit choisi selon la forme : paysage → réglette, petit → compact, sinon portrait.
    if (o.landscape) return officineReglette(l, o);
    if (o.small && l.type === 'prix-promo') return officineCompact(l, o);
    return officineSeed(l, o);
  }
  // Thème Promo (jaune) : rendu responsive pour les cas que la mise en page portrait gère mal.
  if (o.small && !o.landscape) return daCompact(l, o);                       // petits formats, tous types
  if (o.landscape && l.type !== 'prix-promo') return daReglette(l, o);        // réglette bon/lot/multi
  const a = l.accent, d = l.data;
  const asp = o.aspect || 0.7;
  // Aplat mat, centré : pas de point lumineux blanc, léger fondu vers le bord.
  const circleBg = `radial-gradient(circle at 50% 50%, ${a} 58%, ${DA.red2})`;
  const { normal, intp, cents, remise, pct } = priceParts(d.normalPrice, d.promoPrice);
  // Remise affichée : € ou %, automatique ou saisie manuelle par l'utilisateur.
  const manual = (d.remiseManual || '').trim();
  const remiseTxt = d.remiseType === 'pct'
    ? ((manual || pct) ? `-${manual || pct}%` : '')
    : (manual ? `-${manual}€` : (remise ? `-${remise}€` : ''));

  // ===== PRIX PROMO =====
  if (l.type === 'prix-promo') {
    if (o.landscape) {
      // RÉGLETTE (paysage) — PROMOTION à gauche, cercle prix à droite
      return [
        { ...B, id: 'promo', kind: 'text', text: 'PROMOTION', x: 3, y: 6, size: 0.17, color: DA.promo, weight: 900, align: 'left' },
        { ...B, id: 'band', kind: 'box', x: 3, y: 30, w: 54, h: 17, bg: DA.band, size: 0, color: '#fff', weight: 400, align: 'left', radius: 4 },
        { ...B, id: 'cat', kind: 'text', text: d.category, x: 3, y: 34, w: 54, size: fitSize(d.category, 0.5, asp, 0.072, 2, 0.04), color: '#fff', weight: 800, align: 'center' },
        { ...B, id: 'product', kind: 'text', text: d.product, x: 3, y: 51, w: 55, size: fitSize(d.product, 0.55, asp, 0.082, 2, 0.045), color: '#16231A', weight: 900, align: 'left' },
        ...(d.qtyLabel ? [{ ...B, id: 'qty', kind: 'text' as ElKind, text: d.qtyLabel, x: 3, y: 71, w: 55, size: 0.058, color: DA.green, weight: 600, align: 'left' as Align }] : []),
        { ...B, id: 'circle', kind: 'box', shape: 'circle', x: 60, y: 4, w: 38, bg: circleBg, size: 0, color: a, weight: 400, align: 'left', shadow: true },
        ...(normal > 0 ? [{ ...B, id: 'old', kind: 'text' as ElKind, text: eur(d.normalPrice), x: 60, y: 12, w: 38, size: 0.075, color: '#fff', weight: 700, align: 'center' as Align, strike: true }] : []),
        // Prix « charme » en bloc, maximisé dans le cercle.
        ...offiPrice(d.promoPrice, asp, 30, 0.36, 0.22, 60, 38, DA.priceY, 0.46),
        // Remise en blanc dans le bas du cercle (jamais confondue avec le prix jaune).
        ...(remiseTxt ? [{ ...B, id: 'rem', kind: 'text' as ElKind, text: remiseTxt, x: 60, y: 77, w: 38, size: fitSize(remiseTxt, 0.34, asp, 0.075, 1, 0.045), color: '#fff', weight: 900, align: 'center' as Align }] : []),
        ...footEls(l, o),
      ];
    }
    // PORTRAIT — cercle prix (charme jaune, adaptatif), remise en pastille DISTINCTE, produit.
    return [
      { ...B, id: 'band', kind: 'box', x: 0, y: 0, w: 100, h: 7, bg: DA.band, size: 0, color: '#fff', weight: 400, align: 'left' },
      { ...B, id: 'cat', kind: 'text', text: d.category, x: 0, y: 1.7, w: 100, size: fitSize(d.category, 0.96, asp, 0.027, 1, 0.016), color: '#fff', weight: 800, align: 'center' },
      { ...B, id: 'circle', kind: 'box', shape: 'circle', x: 21, y: 9, w: 58, bg: circleBg, size: 0, color: a, weight: 400, align: 'left', shadow: true },
      ...(normal > 0 ? [{ ...B, id: 'old', kind: 'text' as ElKind, text: eur(d.normalPrice), x: 21, y: 14, w: 58, size: 0.028, color: '#fff', weight: 700, align: 'center' as Align, strike: true }] : []),
      // Prix de vente charme (euros gros + centimes/€), centré et agrandi pour remplir le cercle.
      // Prix maximisé dans le cercle (centimes un peu plus compacts pour gagner en taille d'euros).
      ...offiPrice(d.promoPrice, asp, 19, 0.21, 0.11, 22, 56, DA.priceY, 0.44),
      // Remise = pastille rouge sous le cercle, jamais confondue avec le prix.
      ...(remiseTxt ? offiSave(remiseTxt, asp, 27, 52, 46, 12, DA.red, '#fff') : []),
      { ...B, id: 'product', kind: 'text', text: d.product, x: 6, y: 66, w: 88, size: fitSize(d.product, 0.88, asp, 0.05, 2, 0.026), color: '#16231A', weight: 900, align: 'center' },
      ...(d.qtyLabel ? [{ ...B, id: 'qty', kind: 'text' as ElKind, text: d.qtyLabel, x: 6, y: 80, w: 88, size: fitSize(d.qtyLabel, 0.88, asp, 0.03, 1, 0.02), color: DA.green, weight: 600, align: 'center' as Align }] : []),
      ...footEls(l, o),
    ];
  }

  // ===== Cadre commun (bandeau + pied) pour les autres types (portrait) =====
  const frame: El[] = [
    { ...B, id: 'band', kind: 'box', x: 0, y: 0, w: 100, h: 7, bg: DA.band, size: 0, color: '#fff', weight: 400, align: 'left' },
    { ...B, id: 'cat', kind: 'text', text: d.category, x: 0, y: 1.7, w: 100, size: 0.027, color: '#fff', weight: 800, align: 'center' },
    ...footEls(l, { ...o, landscape: false }),
  ];

  // ===== BON DE RÉDUCTION =====
  if (l.type === 'bon-reduction') {
    return [
      ...frame,
      { ...B, id: 'circle', kind: 'box', shape: 'circle', x: 19, y: 10, w: 62, bg: circleBg, size: 0, color: a, weight: 400, align: 'left', shadow: true },
      { ...B, id: 'btag', kind: 'text', text: 'BON DE RÉDUCTION', x: 19, y: 16, w: 62, size: 0.03, color: '#fff', weight: 800, align: 'center', track: 0.04 },
      // Valeur du bon = héros (prix charme jaune, adaptatif) centré dans le cercle.
      ...offiPrice(d.couponValue, asp, 23, 0.17, 0.09, 19, 62, DA.priceY),
      { ...B, id: 'bsub', kind: 'text', text: 'DE RÉDUCTION', x: 19, y: 45, w: 62, size: 0.03, color: '#fff', weight: 800, align: 'center', track: 0.08 },
      { ...B, id: 'product', kind: 'text', text: d.product, x: 6, y: 60, w: 88, size: fitSize(d.product, 0.88, asp, 0.052, 2, 0.028), color: '#16231A', weight: 900, align: 'center' },
      { ...B, id: 'exp', kind: 'text', text: `Valable jusqu'au ${d.couponExpiry}`, x: 6, y: 74, w: 88, size: fitSize(`Valable jusqu'au ${d.couponExpiry}`, 0.88, asp, 0.035, 1, 0.022), color: DA.green, weight: 600, align: 'center' },
    ];
  }

  // ===== REMISE LOT =====
  if (l.type === 'remise-lot') {
    const qty = Math.max(2, parseInt(d.lotQty) || 3);
    const free = Math.max(1, parseInt(d.lotFree) || 1);
    const paid = Math.max(1, qty - free);
    const lp = pf(d.lotPrice);
    return [
      ...frame,
      { ...B, id: 'circle', kind: 'box', shape: 'circle', x: 22, y: 10, w: 56, bg: circleBg, size: 0, color: a, weight: 400, align: 'left', shadow: true },
      { ...B, id: 'lotn', kind: 'text', text: `LOT ×${qty}`, x: 24, y: 15, w: 52, size: 0.03, color: '#fff', weight: 800, align: 'center' },
      { ...B, id: 'priceInt', kind: 'text', text: Math.floor(lp).toString(), x: 28, y: 20, size: 0.15, color: DA.priceY, weight: 900, align: 'left' },
      { ...B, id: 'euro', kind: 'text', text: '€', x: 58, y: 21, size: 0.055, color: DA.priceY, weight: 900, align: 'left' },
      { ...B, id: 'cents', kind: 'text', text: Math.round((lp - Math.floor(lp)) * 100).toString().padStart(2, '0'), x: 58, y: 29, size: 0.06, color: DA.priceY, weight: 900, align: 'left' },
      { ...B, id: 'subl', kind: 'text', text: `${paid} acheté${paid > 1 ? 's' : ''} + ${free} offert${free > 1 ? 's' : ''}`, x: 22, y: 44, w: 56, size: 0.03, color: '#fff', weight: 700, align: 'center' },
      { ...B, id: 'product', kind: 'text', text: d.product, x: 6, y: 58, w: 88, size: fitSize(d.product, 0.88, asp, 0.052, 2, 0.03), color: '#16231A', weight: 900, align: 'center' },
      ...(d.qtyLabel ? [{ ...B, id: 'qty', kind: 'text' as ElKind, text: d.qtyLabel, x: 6, y: 72, w: 88, size: 0.037, color: DA.green, weight: 600, align: 'center' as Align }] : []),
    ];
  }

  // ===== 2ᵉ PRODUIT À -X% (DA « Homme de Fer ») =====
  if (l.type === 'remise-2eme') {
    const { pct, unitTxt, lotTxt } = deux2(d);
    return [
      ...frame,
      { ...B, id: 'circle', kind: 'box', shape: 'circle', x: 15, y: 8.5, w: 70, bg: circleBg, size: 0, color: a, weight: 400, align: 'left', shadow: true },
      { ...B, id: 'unitp', kind: 'text', text: unitTxt, x: 15, y: 15, w: 70, size: fitSize(unitTxt, 0.5, asp, 0.03, 1, 0.02), color: '#fff', weight: 700, align: 'center', track: 0.03 },
      { ...B, id: 'pct', kind: 'text', text: `-${pct}%`, x: 17, y: 19.5, w: 66, size: fitSize(`-${pct}%`, 0.58, asp, 0.17, 1, 0.11), color: DA.priceY, weight: 900, align: 'center' },
      { ...B, id: 'divline', kind: 'box', x: 33, y: 41.5, w: 34, h: 0.5, bg: 'rgba(255,255,255,0.65)', size: 0, color: '#fff', weight: 400, align: 'left' },
      { ...B, id: 'on2nd', kind: 'text', text: 'SUR LE DEUXIÈME PRODUIT', x: 18, y: 43.5, w: 64, size: fitSize('SUR LE DEUXIÈME PRODUIT', 0.58, asp, 0.026, 2, 0.018), color: '#fff', weight: 800, align: 'center', track: 0.02 },
      { ...B, id: 'lot2', kind: 'text', text: lotTxt, x: 18, y: 52, w: 64, size: fitSize(lotTxt, 0.58, asp, 0.022, 1, 0.016), color: '#fff', weight: 600, align: 'center' },
      { ...B, id: 'product', kind: 'text', text: d.product, x: 6, y: 64, w: 88, size: fitSize(d.product, 0.88, asp, 0.05, 2, 0.026), color: '#16231A', weight: 900, align: 'center' },
      ...(d.qtyLabel ? [{ ...B, id: 'qty', kind: 'text' as ElKind, text: d.qtyLabel, x: 6, y: 78, w: 88, size: fitSize(d.qtyLabel, 0.88, asp, 0.03, 1, 0.02), color: DA.green, weight: 600, align: 'center' as Align }] : []),
    ];
  }

  // ===== MULTI-ACHAT =====
  const cols = [{ q: d.t1q, p: d.t1p }, { q: d.t2q, p: d.t2p }, { q: d.t3q, p: d.t3p }];
  const els: El[] = [
    ...frame,
    { ...B, id: 'mtitle', kind: 'text', text: 'OFFRE MULTI-ACHAT', x: 6, y: 11, w: 88, size: 0.048, color: DA.red, weight: 900, align: 'center' },
    { ...B, id: 'product', kind: 'text', text: d.product, x: 6, y: 18, w: 88, size: fitSize(d.product, 0.88, asp, 0.055, 2, 0.032), color: DA.green, weight: 800, align: 'center' },
  ];
  // 3 cartes (qté + prix empilés) ; meilleur palier mis en avant (rouge + prix jaune).
  cols.forEach((c, i) => {
    const cx = 6 + i * 30, best = i === 2;
    els.push({ ...B, id: `q${i}`, kind: 'box', x: cx, y: 34, w: 27, h: 30, bg: best ? DA.red : DA.band, size: 0, color: '#fff', weight: 400, align: 'center', radius: 12, shadow: best });
    els.push({ ...B, id: `qt${i}`, kind: 'text', text: `${c.q} pce${parseInt(c.q) > 1 ? 's' : ''}`, x: cx, y: 38.5, w: 27, size: 0.032, color: '#fff', weight: 800, align: 'center' });
    els.push({ ...B, id: `p${i}`, kind: 'text', text: eur(c.p), x: cx, y: 48, w: 27, size: fitSize(eur(c.p), 0.27, asp, 0.062, 1, 0.035), color: best ? DA.priceY : '#fff', weight: 900, align: 'center' });
  });
  els.push({ ...B, id: 'mfoot', kind: 'text', text: 'Plus vous achetez, plus vous économisez', x: 6, y: 70, w: 88, size: fitSize('Plus vous achetez, plus vous économisez', 0.88, asp, 0.034, 1, 0.022), color: DA.green, weight: 600, align: 'center' });
  return els;
}

const FULL: SeedOpts = { landscape: false, logo: 'x', disclaimer: 'x' };
function resolveEls(l: Label, o: SeedOpts): El[] {
  const bound = seedEls(l, o).map(e => ({ ...e, ...l.overrides[e.id] }));
  return [...bound, ...l.extra];
}
function isBound(l: Label, id: string): boolean {
  for (const theme of ['promo', 'officine']) for (const landscape of [false, true]) {
    if (seedEls(l, { ...FULL, landscape, theme }).some(e => e.id === id)) return true;
  }
  return false;
}

function renderEl(e: El, H: number): CSSProperties {
  const fs = e.size * H;
  const st: CSSProperties = {
    position: 'absolute', left: `${e.x}%`, top: `${e.y}%`,
    transform: e.rot ? `rotate(${e.rot}deg)` : undefined, transformOrigin: 'top left',
    fontFamily: e.font, fontWeight: e.weight, color: e.color, textAlign: e.align, lineHeight: 1.02,
    width: e.w != null ? `${e.w}%` : undefined,
    whiteSpace: e.w != null ? 'normal' : 'nowrap',
    textDecoration: e.strike ? 'line-through' : undefined,
    // Trait du prix barré : épaisseur maîtrisée (sinon il hérite de la graisse et masque le prix).
    textDecorationThickness: e.strike ? `${Math.max(1, fs * (e.strikeW ?? 0.05))}px` : undefined,
    textDecorationColor: e.strike ? e.color : undefined,
    letterSpacing: e.track != null ? `${e.track}em` : (e.weight >= 800 ? '0.01em' : undefined),
    fontStyle: e.italic ? 'italic' : undefined,
  };
  if (e.kind === 'box') {
    if (e.shape === 'circle') { st.width = `${e.w}%`; st.aspectRatio = '1 / 1'; st.height = 'auto'; st.borderRadius = '50%'; st.background = e.bg; }
    else { st.height = `${e.h ?? 10}%`; st.background = e.bg; st.borderRadius = e.radius ? `${e.radius}px` : undefined; }
    if (e.border) st.border = e.border;
    // Rendu MAT (DA « Homme de Fer ») : pas de liseré blanc ni de reflet sur le cercle.
    // Seulement une ombre portée très douce pour le détacher à l'écran (ignorée à l'impression).
    if (e.shadow) st.boxShadow = e.shape === 'circle'
      ? '0 4px 14px rgba(0,0,0,0.14)'
      : '0 4px 14px rgba(0,0,0,0.14)';
    st.fontSize = 0;
  } else st.fontSize = fs;
  if (e.kind === 'pill') {
    st.background = e.bg; st.padding = `${fs * 0.3}px ${fs * 0.6}px`;
    st.borderRadius = e.radius != null ? (e.radius >= 50 ? '999px' : `${e.radius}px`) : '6px';
    st.display = 'inline-block'; st.width = 'auto';
  }
  return st;
}

// ──────────────────────────────────────────────────────────────────────
//  VUE ÉTIQUETTE
// ──────────────────────────────────────────────────────────────────────

// Saisie de texte directement dans le bloc, sur l'étiquette (non contrôlé : pas de saut de curseur).
function EditableText({ initial, onCommit, onCancel }: { initial: string; onCommit: (t: string) => void; onCancel: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  // Garde : Entrée/Échap valident PUIS démontent le champ, ce qui déclenche onBlur.
  // Sans ce verrou, le onBlur re-commit (avec ref.current déjà nul) une valeur VIDE → le texte s'effaçait.
  const done = useRef(false);
  useEffect(() => {
    const n = ref.current; if (!n) return;
    n.focus({ preventScroll: true }); // ne pas faire sauter la page/le canvas au focus
    const r = document.createRange(); r.selectNodeContents(n);
    const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(r);
  }, []);
  const commit = () => { if (done.current) return; done.current = true; onCommit(ref.current?.innerText ?? initial); };
  const cancel = () => { if (done.current) return; done.current = true; onCancel(); };
  return (
    <div ref={ref} contentEditable suppressContentEditableWarning
      onPointerDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      onKeyDown={e => {
        e.stopPropagation();
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
        else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
      }}
      onBlur={commit}
      style={{ outline: '2px solid #16a34a', outlineOffset: 2, cursor: 'text', whiteSpace: 'pre-wrap', minWidth: 8 }}
    >{initial}</div>
  );
}

interface DragState { labelId: string; elId: string; offX: number; offY: number; box: HTMLElement; elW: number; elH: number; startX: number; startY: number; active: boolean; }
type Snap = { x: boolean; y: boolean };

export function LabelView({ label, W, H, editing, opts, selectedLabel, selectedEl, snap, onSelectLabel, onSelectEl, onDragStart, onDelEl, onAddText, editId, onStartEdit, onCommitText, onEndEdit, onDeleteLabel }: {
  label: Label; W: number; H: number; editing: boolean; opts: SeedOpts;
  selectedLabel: boolean; selectedEl: string | null; snap?: Snap | null;
  onSelectLabel: () => void; onSelectEl: (id: string) => void;
  onDragStart: (e: React.PointerEvent, labelId: string, elId: string, el: El) => void;
  onDelEl: (id: string) => void;
  onAddText?: (x: number, y: number) => void;
  editId?: string | null;
  onStartEdit?: (id: string) => void; onCommitText?: (id: string, t: string) => void; onEndEdit?: () => void;
  onDeleteLabel?: () => void;
}) {
  const els = resolveEls(label, opts).filter(e => !e.hidden);
  const bg = label.bg;
  const selColor = label.accent;
  return (
    <div data-labelbox onClick={(ev) => { ev.stopPropagation(); onSelectLabel(); }}
      onDoubleClick={editing && onAddText ? (ev) => { ev.stopPropagation(); const r = (ev.currentTarget as HTMLElement).getBoundingClientRect(); onAddText(Math.max(0, ((ev.clientX - r.left) / r.width) * 100 - 32), Math.max(0, ((ev.clientY - r.top) / r.height) * 100 - 2)); } : undefined}
      style={{ position: 'relative', width: W, height: H, background: bg, border: editing ? `1px solid ${selectedLabel ? selColor : 'rgba(0,0,0,0.08)'}` : 'none', borderRadius: editing ? 6 : 0, overflow: 'hidden', cursor: editing ? 'pointer' : 'default', boxShadow: selectedLabel && editing ? `0 0 0 3px ${selColor}44` : 'none', flexShrink: 0, boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: WATERMARK, backgroundSize: `${Math.max(46, W * 0.1)}px ${Math.max(46, W * 0.1)}px`, opacity: 0.4, pointerEvents: 'none' }} />
      {/* Repères d'alignement : axes central vertical + horizontal (aide au centrage).
          Affichés sur l'étiquette sélectionnée ; mis en évidence (couleur) quand le bloc s'aimante au centre. */}
      {editing && selectedLabel && <>
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 0, transform: 'translateX(-0.5px)', borderLeft: `1px dashed ${snap?.x ? selColor : 'rgba(0,0,0,0.28)'}`, opacity: snap?.x ? 1 : 0.55, pointerEvents: 'none', zIndex: 5 }} />
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 0, transform: 'translateY(-0.5px)', borderTop: `1px dashed ${snap?.y ? selColor : 'rgba(0,0,0,0.28)'}`, opacity: snap?.y ? 1 : 0.55, pointerEvents: 'none', zIndex: 5 }} />
      </>}
      {els.map(e => {
        const sel = editing && selectedEl === e.id;
        const editable = e.kind === 'text' || e.kind === 'pill';
        const isEd = editing && editId === e.id && editable;
        return (
          <div key={e.id}
            title={editing && editable && !isEd ? 'Double-cliquez pour modifier le texte' : undefined}
            onClick={editing && !isEd ? (ev) => ev.stopPropagation() : undefined}
            onPointerDown={(ev) => { if (editing && !isEd) { ev.stopPropagation(); onSelectEl(e.id); onDragStart(ev, label.id, e.id, e); } }}
            onDoubleClick={editing && editable ? (ev) => { ev.stopPropagation(); onStartEdit?.(e.id); } : undefined}
            style={{ ...renderEl(e, H), outline: sel && !isEd ? `1.5px solid ${selColor}` : 'none', outlineOffset: 2, cursor: editing ? (isEd ? 'text' : 'move') : 'default', userSelect: isEd ? 'text' : 'none', touchAction: 'none', pointerEvents: e.id === 'bgcover' ? 'none' : undefined }}>
            {isEd
              ? <EditableText initial={e.text || ''} onCommit={(t) => { onCommitText?.(e.id, t); onEndEdit?.(); }} onCancel={() => onEndEdit?.()} />
              : (e.kind === 'image' ? <img src={e.src} alt="" style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none' }} /> : (e.kind === 'box' ? null : e.text))}
            {sel && !isEd && editable && onStartEdit && <button title="Modifier le texte" onPointerDown={(ev) => { ev.stopPropagation(); ev.preventDefault(); onStartEdit(e.id); }} style={{ position: 'absolute', top: -10, left: -10, width: 18, height: 18, borderRadius: '50%', background: '#16a34a', color: '#fff', border: '2px solid #fff', fontSize: 10, cursor: 'pointer', lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 6 }}>✎</button>}
            {sel && !isEd && <button title="Supprimer ce bloc" onPointerDown={(ev) => { ev.stopPropagation(); ev.preventDefault(); onDelEl(e.id); }} style={{ position: 'absolute', top: -10, right: -10, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', color: '#fff', border: '2px solid #fff', fontSize: 11, cursor: 'pointer', lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>}
          </div>
        );
      })}
      {editing && selectedLabel && onDeleteLabel && <button title="Supprimer l'étiquette (ou touche Suppr)" onPointerDown={(ev) => { ev.stopPropagation(); ev.preventDefault(); onDeleteLabel(); }} style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: '50%', background: '#ef4444', color: '#fff', border: '2px solid #fff', fontSize: 13, cursor: 'pointer', lineHeight: 1, padding: 0, zIndex: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 5px rgba(0,0,0,0.35)' }}>🗑</button>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
//  LAYOUT + PLANCHE
// ──────────────────────────────────────────────────────────────────────

// Taille (mm) propre à une étiquette : override par étiquette, sinon taille de la planche.
export const sizeOf = (l: Label, p: Project) => ({ w: l.wMm ?? p.labelWmm, h: l.hMm ?? p.labelHmm });
// Options de composition (orientation, format…) calculées pour CETTE étiquette.
export const optsFor = (l: Label, p: Project, editing: boolean): SeedOpts => {
  const { w, h } = sizeOf(l, p);
  return { landscape: w > h * 1.5, logo: p.logo, disclaimer: p.disclaimer, editing, small: Math.min(w, h) < 80, aspect: w / h, theme: p.theme || 'promo', dateStart: p.dateStart, dateEnd: p.dateEnd };
};

function layout(p: Project) {
  const fmt = PAGE_FORMATS.find(f => f.id === p.pageFormat) || PAGE_FORMATS[0];
  const sizes = (p.labels || []).map(l => sizeOf(l, p));
  const first = sizes[0] || { w: p.labelWmm, h: p.labelHmm };
  const mixed = sizes.length > 0 && !sizes.every(s => s.w === first.w && s.h === first.h);
  const baseW = mixed ? Math.max(...sizes.map(s => s.w)) : first.w;
  const baseH = mixed ? Math.max(...sizes.map(s => s.h)) : first.h;
  const lw = baseW * MM, lh = baseH * MM;
  const m = MARGIN_MM * MM, gap = GAP_MM * MM, header = HEADER_MM * MM;
  let pageWmm: number, pageHmm: number, perRow: number, capacity: number;
  if (fmt.id === 'roll' || fmt.id === 'fit') {
    pageWmm = mixed ? Math.max(210, baseW) : baseW; perRow = 1;
    const n = Math.max(1, p.labels.length);
    pageHmm = mixed ? Math.max(297, sizes.reduce((a, s) => a + s.h + GAP_MM, 0)) : n * baseH + (n - 1) * GAP_MM;
    capacity = n;
  } else {
    pageWmm = fmt.w; pageHmm = fmt.h;
    perRow = Math.max(1, Math.floor((pageWmm * MM - m * 2 + gap) / (lw + gap)));
    const usableH0 = pageHmm * MM - m * 2 - header;
    const rowsFit = Math.max(1, Math.floor((usableH0 + gap) / (lh + gap)));
    capacity = perRow * rowsFit;
  }
  const PW = pageWmm * MM, PH = pageHmm * MM;
  const usableW = PW - m * 2;
  const landscape = lw > lh * 1.5;
  const small = Math.min(baseW, baseH) < 80;
  return { fmt, lw, lh, m, gap, header, PW, PH, pageWmm, pageHmm, usableW, perRow, capacity, landscape, small, mixed };
}

function Planche({ project, scale, editing, selLabel, selEl, snap, setSelLabel, setSelEl, onAdd, dragStart, delEl, addTextAt, editId, startEdit, commitText, endEdit, deleteLabelId, forPrint }: {
  project: Project; scale: number; editing: boolean;
  selLabel: string | null; selEl: string | null; snap?: Snap | null;
  setSelLabel: (id: string | null) => void; setSelEl: (id: string | null) => void;
  onAdd: () => void; dragStart: (e: React.PointerEvent, labelId: string, elId: string, el: El) => void;
  delEl: (id: string) => void; addTextAt: (labelId: string, x: number, y: number) => void;
  editId?: string | null; startEdit?: (id: string) => void; commitText?: (id: string, t: string) => void; endEdit?: () => void; deleteLabelId?: (id: string) => void; forPrint?: boolean;
}) {
  const L = layout(project);
  return (
    <div style={{ width: L.PW, height: L.PH, background: '#fff', transform: forPrint ? undefined : `scale(${scale})`, transformOrigin: 'top left', boxShadow: forPrint ? 'none' : '0 10px 40px rgba(0,0,0,0.18)', position: 'relative', flexShrink: 0 }}
      onClick={() => { if (editing) { setSelLabel(null); setSelEl(null); } }}>
      <div style={{ position: 'absolute', top: L.m, left: L.m, width: L.usableW, display: 'flex', flexWrap: 'wrap', gap: L.gap, alignContent: 'flex-start', justifyContent: 'center' }}>
        {project.labels.map(label => {
          const sz = sizeOf(label, project);
          return (
          <LabelView key={label.id} label={label} W={sz.w * MM} H={sz.h * MM} editing={editing && !forPrint} opts={optsFor(label, project, editing && !forPrint)}
            selectedLabel={selLabel === label.id} selectedEl={selLabel === label.id ? selEl : null} snap={selLabel === label.id ? snap : null}
            onSelectLabel={() => setSelLabel(label.id)} onSelectEl={(id) => { setSelLabel(label.id); setSelEl(id); }}
            onDragStart={dragStart} onDelEl={delEl} onAddText={(x, y) => addTextAt(label.id, x, y)} onDeleteLabel={deleteLabelId ? () => deleteLabelId(label.id) : undefined}
            editId={editId} onStartEdit={startEdit} onCommitText={commitText} onEndEdit={endEdit} />
        ); })}
        {!forPrint && <button onClick={(e) => { e.stopPropagation(); onAdd(); }} style={{ width: L.lw, height: Math.min(L.lh, 220), border: '2px dashed #cbd5e1', borderRadius: 8, background: '#f8fafc', color: '#94a3b8', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: SYS, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}><span style={{ fontSize: 22 }}>＋</span>Ajouter</button>}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
//  FEUILLE D'IMPRESSION (toujours A4, étiquettes à taille réelle, tuilées)
// ──────────────────────────────────────────────────────────────────────

// Calcule la disposition d'impression : pages A4 (ou A5/A3), étiquettes à
// taille réelle, tuilées selon la place, avec pagination explicite.
interface PrintPage { wMm: number; hMm: number; gapMm: number; labels: Label[]; tiling: boolean }
function printPlan(project: Project) {
  const paper = PAPERS[project.printPaper || 'A4'] || PAPERS.A4;
  const margin = project.printMarginMm ?? 0;
  const labels = project.labels.length ? project.labels : [newLabel()];
  // Regroupe les étiquettes par taille → chaque format est tuilé correctement.
  const groups = new Map<string, { w: number; h: number; labels: Label[] }>();
  for (const l of labels) { const { w, h } = sizeOf(l, project); const k = `${w}x${h}`; if (!groups.has(k)) groups.set(k, { w, h, labels: [] }); groups.get(k)!.labels.push(l); }
  const pages: PrintPage[] = [];
  for (const g of groups.values()) {
    const gapMm = g.labels.length > 1 ? GAP_MM : 0;
    const { perPage } = paginate(g.w, g.h, paper.w, paper.h, margin, gapMm);
    const tiling = g.labels.length > 1 || g.w < paper.w - 2 || g.h < paper.h - 2;
    for (const part of chunk(g.labels, perPage)) pages.push({ wMm: g.w, hMm: g.h, gapMm, labels: part, tiling });
  }
  const f0 = sizeOf(labels[0], project);
  const { cols, rows, perPage } = paginate(f0.w, f0.h, paper.w, paper.h, margin, labels.length > 1 ? GAP_MM : 0);
  return { paper, margin, pages, cols, rows, perPage, formats: groups.size };
}

function PrintSheet({ project, screen }: { project: Project; screen?: boolean }) {
  const plan = printPlan(project);
  const m = plan.margin * MM;
  return (
    <>
      {plan.pages.map((page, pi) => {
        const lw = page.wMm * MM, lh = page.hMm * MM, g = page.gapMm * MM;
        return (
          <div key={pi} style={{ width: plan.paper.w * MM, height: plan.paper.h * MM, boxSizing: 'border-box', padding: m, background: '#fff', breakAfter: pi < plan.pages.length - 1 ? 'page' : 'auto', pageBreakAfter: pi < plan.pages.length - 1 ? 'always' : 'auto', display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start', gap: g, margin: screen ? '0 auto 14px' : 0, boxShadow: screen ? '0 6px 24px rgba(0,0,0,0.25)' : 'none', overflow: 'hidden' }}>
            {page.labels.map(l => (
              <div key={l.id} style={{ width: lw, height: lh, flexShrink: 0, outline: page.tiling ? '0.4px dashed rgba(0,0,0,0.35)' : 'none' }}>
                <LabelView label={l} W={lw} H={lh} editing={false} opts={optsFor(l, project, false)} selectedLabel={false} selectedEl={null} onSelectLabel={() => {}} onSelectEl={() => {}} onDragStart={() => {}} onDelEl={() => {}} />
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────
//  CONTRÔLES UI
// ──────────────────────────────────────────────────────────────────────

const inp: CSSProperties = { width: '100%', padding: '7px 9px', background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 5, fontSize: 13, boxSizing: 'border-box', fontFamily: SYS };
const lbl: CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: SYS };
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div style={{ marginBottom: 10 }}><label style={lbl}>{label}</label>{children}</div>; }
function TextInp({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) { return <Field label={label}><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inp} /></Field>; }
// Champ prix : n'accepte que chiffres + virgule, normalise le point en virgule
function PriceInp({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <Field label={label}><input inputMode="decimal" value={value} placeholder="0,00" onChange={e => onChange(e.target.value.replace(/[^\d.,]/g, '').replace('.', ','))} style={inp} /></Field>;
}
function Warn({ children }: { children: React.ReactNode }) {
  return <div style={{ background: '#3f1d1d', border: '1px solid #7f1d1d', borderRadius: 5, padding: '7px 9px', fontSize: 12, color: '#fca5a5', marginBottom: 10 }}>{children}</div>;
}
function SectionTitle({ children }: { children: React.ReactNode }) { return <div style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '4px 0 10px', fontFamily: SYS }}>{children}</div>; }
function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <Field label={label}><div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="color" value={value.length === 7 ? value : '#000000'} onChange={e => onChange(e.target.value)} style={{ width: 34, height: 28, border: '1px solid #334155', borderRadius: 4, background: 'none', cursor: 'pointer', padding: 2 }} /><span style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>{value}</span></div></Field>;
}
function Slider({ label, value, min, max, step, onChange, suffix }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; suffix?: string }) {
  return <Field label={`${label} : ${value}${suffix || ''}`}><input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} style={{ width: '100%' }} /></Field>;
}
function NumMm({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return <Field label={label}><input type="number" min={10} max={420} value={value} onChange={e => onChange(Math.max(10, Math.min(420, parseInt(e.target.value) || 0)))} style={inp} /></Field>;
}

function ContentForm({ l, set }: { l: Label; set: (k: keyof LabelData, v: string) => void }) {
  const d = l.data;
  const G = (a: React.ReactNode, b: React.ReactNode) => <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>{a}{b}</div>;
  const cat = <TextInp label="Catégorie (bandeau)" value={d.category} onChange={v => set('category', v)} placeholder="COMPLÉMENT ALIMENTAIRE" />;
  const prod = <TextInp label="Produit" value={d.product} onChange={v => set('product', v)} />;
  const qty = <TextInp label="Descriptif / quantité" value={d.qtyLabel} onChange={v => set('qtyLabel', v)} placeholder="Lot de 3 x 60 gélules*" />;
  const dates = G(<TextInp label="Date début" value={d.dateStart} onChange={v => set('dateStart', v)} placeholder="01/06/2026" />, <TextInp label="Date fin" value={d.dateEnd} onChange={v => set('dateEnd', v)} placeholder="30/06/2026" />);
  let middle: React.ReactNode = null;
  const normal = pf(d.normalPrice), promo = pf(d.promoPrice);
  const diff = normal > promo ? Math.round((normal - promo) * 100) / 100 : 0;
  const autoPct = normal > 0 && diff > 0 ? Math.round((diff / normal) * 100) : 0;
  const isPct = d.remiseType === 'pct';
  const tgl = (active: boolean): CSSProperties => ({ flex: 1, padding: '6px', background: active ? '#16a34a' : '#1e293b', color: active ? '#fff' : '#94a3b8', border: '1px solid #334155', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontWeight: 700 });
  if (l.type === 'prix-promo') middle = <>
    {G(<PriceInp label="Prix normal €" value={d.normalPrice} onChange={v => set('normalPrice', v)} />, <PriceInp label="Prix promo €" value={d.promoPrice} onChange={v => set('promoPrice', v)} />)}
    <Field label="Affichage de la remise">
      <div style={{ display: 'flex', gap: 5 }}>
        <button onClick={() => set('remiseType', 'euro')} style={tgl(!isPct)}>En €</button>
        <button onClick={() => set('remiseType', 'pct')} style={tgl(isPct)}>En %</button>
      </div>
    </Field>
    <TextInp label={isPct ? 'Remise % affichée (vide = auto)' : 'Remise € affichée (vide = auto)'} value={d.remiseManual} onChange={v => set('remiseManual', v.replace(/[^\d.,]/g, '').replace('.', ','))} placeholder={isPct ? (autoPct ? `${autoPct}` : 'ex : 20') : (diff ? ff(diff) : 'ex : 0,50')} />
    {diff > 0 && <div style={{ background: '#0d2137', border: '1px solid #1e3a5f', borderRadius: 5, padding: '7px 9px', fontSize: 12, color: '#38bdf8', marginBottom: 10 }}>💶 Remise calculée : {isPct ? `−${autoPct} %` : `−${ff(diff)} €`}{(d.remiseManual || '').trim() && <span style={{ color: '#fbbf24' }}> · affichage forcé : −{d.remiseManual}{isPct ? ' %' : ' €'}</span>}</div>}
    {normal > 0 && promo > 0 && promo >= normal && <Warn>⚠ Le prix promo doit être <strong>inférieur</strong> au prix normal.</Warn>}
  </>;
  else if (l.type === 'bon-reduction') middle = G(<PriceInp label="Valeur bon €" value={d.couponValue} onChange={v => set('couponValue', v)} />, <TextInp label="Validité" value={d.couponExpiry} onChange={v => set('couponExpiry', v)} />);
  else if (l.type === 'remise-lot') middle = <>{G(<TextInp label="Qté totale" value={d.lotQty} onChange={v => set('lotQty', v)} />, <TextInp label="Dont offert(s)" value={d.lotFree} onChange={v => set('lotFree', v)} />)}<PriceInp label="Prix du lot €" value={d.lotPrice} onChange={v => set('lotPrice', v)} />{(parseInt(d.lotFree) || 0) >= (parseInt(d.lotQty) || 0) && <Warn>⚠ Le nombre d&apos;offerts doit être inférieur à la quantité totale.</Warn>}</>;
  else if (l.type === 'remise-2eme') { const r2 = deux2(d); middle = <>{G(<PriceInp label="Prix à l'unité €" value={d.normalPrice} onChange={v => set('normalPrice', v)} />, <TextInp label="Remise sur le 2ᵉ (%)" value={d.remiseManual} onChange={v => set('remiseManual', v.replace(/[^\d]/g, ''))} placeholder="60" />)}<div style={{ background: '#0d2137', border: '1px solid #1e3a5f', borderRadius: 5, padding: '7px 9px', fontSize: 12, color: '#38bdf8', marginBottom: 10 }}>🛒 2ᵉ produit à <strong>−{r2.pct}%</strong> · soit <strong>{ff(r2.lot2)} €</strong> le lot de 2</div></>; }
  else middle = <>{G(<TextInp label="P1 — qté" value={d.t1q} onChange={v => set('t1q', v)} />, <PriceInp label="P1 — prix" value={d.t1p} onChange={v => set('t1p', v)} />)}{G(<TextInp label="P2 — qté" value={d.t2q} onChange={v => set('t2q', v)} />, <PriceInp label="P2 — prix" value={d.t2p} onChange={v => set('t2p', v)} />)}{G(<TextInp label="P3 — qté" value={d.t3q} onChange={v => set('t3q', v)} />, <PriceInp label="P3 — prix" value={d.t3p} onChange={v => set('t3p', v)} />)}</>;
  return <>{cat}{prod}{middle}{qty}{dates}</>;
}

function ElementEditor({ el, patch }: { el: El; patch: (p: Partial<El>) => void }) {
  return (<>
    {(el.kind === 'text' || el.kind === 'pill') && (<>
      <Field label="Texte"><input value={el.text || ''} onChange={e => patch({ text: e.target.value })} style={inp} /></Field>
      <Field label="Police"><select value={el.font} onChange={e => patch({ font: e.target.value })} style={{ ...inp, cursor: 'pointer' }}>{FONTS.map(f => <option key={f.name} value={f.css}>{f.name}</option>)}</select></Field>
      <Field label={`Taille du texte : ${Math.round(el.size * 1000) / 10}%`}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={() => patch({ size: Math.max(0.005, Math.round((el.size - 0.005) * 1000) / 1000) })} title="Réduire" style={{ width: 30, height: 28, background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 5, cursor: 'pointer', fontSize: 14, fontWeight: 800 }}>A−</button>
          <input type="range" min={0.5} max={70} step={0.5} value={Math.round(el.size * 1000) / 10} onChange={e => patch({ size: parseFloat(e.target.value) / 100 })} style={{ flex: 1 }} />
          <button onClick={() => patch({ size: Math.min(0.7, Math.round((el.size + 0.005) * 1000) / 1000) })} title="Agrandir" style={{ width: 30, height: 28, background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 5, cursor: 'pointer', fontSize: 16, fontWeight: 800 }}>A＋</button>
        </div>
      </Field>
      <Field label="Graisse"><div style={{ display: 'flex', gap: 5 }}>{[{ v: 400, t: 'Normal' }, { v: 700, t: 'Gras' }, { v: 900, t: 'Extra' }].map(g => <button key={g.v} onClick={() => patch({ weight: g.v })} style={{ flex: 1, padding: '6px', background: el.weight === g.v ? '#16a34a' : '#1e293b', color: el.weight === g.v ? '#fff' : '#94a3b8', border: '1px solid #334155', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: g.v }}>{g.t}</button>)}</div></Field>
      <Field label="Alignement"><div style={{ display: 'flex', gap: 5 }}>{(['left', 'center', 'right'] as Align[]).map(al => <button key={al} onClick={() => patch({ align: al })} style={{ flex: 1, padding: '6px', background: el.align === al ? '#16a34a' : '#1e293b', color: el.align === al ? '#fff' : '#94a3b8', border: '1px solid #334155', borderRadius: 5, cursor: 'pointer', fontSize: 13 }}>{al === 'left' ? '⬅' : al === 'center' ? '↔' : '➡'}</button>)}</div></Field>
      <Field label="Couleur du texte">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
          {TEXT_COLORS.map(c => { const on = el.color.toLowerCase() === c.toLowerCase(); return <button key={c} onClick={() => patch({ color: c })} title={c} style={{ width: 24, height: 24, borderRadius: 5, background: c, border: on ? '2px solid #16a34a' : '1px solid #475569', cursor: 'pointer', padding: 0, boxShadow: on ? '0 0 0 2px #16a34a55' : 'none' }} />; })}
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#64748b', cursor: 'pointer' }}>
            <input type="color" value={el.color.length === 7 ? el.color : '#000000'} onChange={e => patch({ color: e.target.value })} style={{ width: 26, height: 24, border: '1px solid #475569', borderRadius: 5, background: 'none', cursor: 'pointer', padding: 2 }} title="Couleur personnalisée" />+
          </label>
        </div>
      </Field>
      {el.kind === 'pill' && <ColorRow label="Fond pastille" value={el.bg || '#000000'} onChange={c => patch({ bg: c })} />}
      <Field label="Texte barré (prix)">
        <button onClick={() => patch({ strike: !el.strike })} style={{ width: '100%', padding: '6px', background: el.strike ? '#16a34a' : '#1e293b', color: el.strike ? '#fff' : '#94a3b8', border: '1px solid #334155', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>{el.strike ? '✓ Barré activé' : 'Non barré'}</button>
      </Field>
      {el.strike && <Slider label="Épaisseur du trait barré" value={Math.round((el.strikeW ?? 0.05) * 1000) / 10} min={0.5} max={12} step={0.5} suffix="%" onChange={v => patch({ strikeW: v / 100 })} />}
    </>)}
    {el.kind === 'box' && (() => {
      const outline = !el.bg || el.bg === 'transparent';
      const curCol = (el.bg && el.bg.startsWith('#')) ? el.bg : (el.border?.match(/#[0-9a-fA-F]{3,6}/)?.[0] || '#0E7A4D');
      const setCol = (c: string) => outline ? patch({ bg: 'transparent', border: `3px solid ${c}` }) : patch({ bg: c, border: undefined });
      const tg = (on: boolean): CSSProperties => ({ flex: 1, padding: '6px', background: on ? '#16a34a' : '#1e293b', color: on ? '#fff' : '#94a3b8', border: '1px solid #334155', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontWeight: 700 });
      return (<>
        <Field label="Style">
          <div style={{ display: 'flex', gap: 5 }}>
            <button onClick={() => patch({ bg: curCol, border: undefined })} style={tg(!outline)}>Rempli</button>
            <button onClick={() => patch({ bg: 'transparent', border: `3px solid ${curCol}` })} style={tg(outline)}>Contour</button>
          </div>
        </Field>
        <Field label="Couleur">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
            {TEXT_COLORS.map(c => { const on = curCol.toLowerCase() === c.toLowerCase(); return <button key={c} onClick={() => setCol(c)} title={c} style={{ width: 24, height: 24, borderRadius: 5, background: c, border: on ? '2px solid #16a34a' : '1px solid #475569', cursor: 'pointer', padding: 0, boxShadow: on ? '0 0 0 2px #16a34a55' : 'none' }} />; })}
            <input type="color" value={curCol.length === 7 ? curCol : '#0E7A4D'} onChange={e => setCol(e.target.value)} style={{ width: 26, height: 24, border: '1px solid #475569', borderRadius: 5, background: 'none', cursor: 'pointer', padding: 2 }} title="Couleur personnalisée" />
          </div>
        </Field>
        <Slider label={el.shape === 'circle' ? 'Diamètre' : 'Largeur'} value={Math.round(el.w || 20)} min={1} max={100} step={1} suffix="%" onChange={v => patch({ w: v })} />
        {el.shape !== 'circle' && <Slider label="Hauteur / épaisseur" value={Math.round((el.h ?? 10) * 10) / 10} min={0.2} max={100} step={0.2} suffix="%" onChange={v => patch({ h: v })} />}
        {el.shape !== 'circle' && <Slider label="Coins arrondis" value={el.radius || 0} min={0} max={50} step={1} suffix="px" onChange={v => patch({ radius: v })} />}
      </>);
    })()}
    {el.kind === 'image' && <Slider label="Largeur" value={Math.round(el.w || 28)} min={4} max={90} step={1} suffix="%" onChange={v => patch({ w: v })} />}
    <Slider label="Rotation" value={el.rot} min={-30} max={30} step={1} suffix="°" onChange={v => patch({ rot: v })} />
    <div style={{ fontSize: 10, color: '#64748b', marginTop: 6, fontFamily: SYS }}>Position : glissez l&apos;élément sur l&apos;étiquette ✋</div>
  </>);
}

// ──────────────────────────────────────────────────────────────────────
//  IMPORT CSV / EXCEL
// ──────────────────────────────────────────────────────────────────────

type ImpField = { key: keyof LabelData; label: string; kw: RegExp };
const F_CAT: ImpField = { key: 'category', label: 'Catégorie', kw: /cat|rayon|univers|famille|gamme/i };
const F_PROD: ImpField = { key: 'product', label: 'Produit', kw: /produit|nom|libell|d[eé]sign|article|d[eé]nom/i };
const F_QTY: ImpField = { key: 'qtyLabel', label: 'Descriptif', kw: /descript|quantit|conditionn|contenance|g[eé]lul|capsul|comprim/i };
const FORMAT_KW = /format|taille|gabarit|dimension|mod[eè]le|support/i;
const IMPORT_FIELDS: Record<PromoType, ImpField[]> = {
  'prix-promo': [F_CAT, F_PROD,
    { key: 'normalPrice', label: 'Prix normal €', kw: /normal|barr|public|ancien|avant|initial|vente|courant|fort/i },
    { key: 'promoPrice', label: 'Prix promo €', kw: /promo|nouveau|apr[eè]s|remis|r[eé]duit|net/i }, F_QTY],
  'bon-reduction': [F_CAT, F_PROD,
    { key: 'couponValue', label: 'Valeur bon €', kw: /valeur|bon|montant/i },
    { key: 'couponExpiry', label: 'Validité', kw: /validit|date|jusqu|expir|fin/i }],
  'remise-lot': [F_CAT, F_PROD,
    { key: 'lotQty', label: 'Qté totale', kw: /qt|quantit|total|nombre/i },
    { key: 'lotFree', label: 'Offert(s)', kw: /offert|gratuit/i },
    { key: 'lotPrice', label: 'Prix du lot €', kw: /prix|lot|tarif|montant/i }, F_QTY],
  'multi-achat': [F_CAT, F_PROD,
    { key: 't1q', label: 'P1 qté', kw: /q.?1|qt[eé]?\s*1/i }, { key: 't1p', label: 'P1 prix', kw: /p.?1|prix\s*1/i },
    { key: 't2q', label: 'P2 qté', kw: /q.?2|qt[eé]?\s*2/i }, { key: 't2p', label: 'P2 prix', kw: /p.?2|prix\s*2/i },
    { key: 't3q', label: 'P3 qté', kw: /q.?3|qt[eé]?\s*3/i }, { key: 't3p', label: 'P3 prix', kw: /p.?3|prix\s*3/i }],
  'remise-2eme': [F_CAT, F_PROD,
    { key: 'normalPrice', label: "Prix à l'unité €", kw: /unit|prix|normal|public|vente|tarif/i },
    { key: 'remiseManual', label: 'Remise 2ᵉ (%)', kw: /remise|%|pourcent|pct|deuxi|2e|second/i }, F_QTY],
};

// Modèles « parfaits » par type : en-têtes reconnus automatiquement + exemples.
const TEMPLATES: Record<PromoType, { headers: string[]; rows: string[][] }> = {
  'prix-promo': {
    headers: ['Catégorie', 'Produit', 'Prix normal €', 'Prix promo €', 'Descriptif', 'Format'],
    rows: [
      ['COMPLÉMENT ALIMENTAIRE', 'Chondro-Aid Fort ARKOPHARMA', '31,90', '26,90', 'Lot de 3 x 60 gélules', 'A4'],
      ['SOIN VISAGE', 'Crème hydratante AVÈNE', '19,90', '14,90', 'Tube 40 ml', 'Vitrine'],
      ['HYGIÈNE BUCCO-DENTAIRE', 'Bain de bouche ELUDRIL', '8,50', '5,90', 'Flacon 500 ml', 'Rayon'],
    ],
  },
  'bon-reduction': {
    headers: ['Catégorie', 'Produit', 'Valeur bon €', 'Validité', 'Format'],
    rows: [
      ['HYGIÈNE', 'Dentifrice SENSODYNE', '2,00', '31/12/2026', 'Vitrine'],
      ['BÉBÉ', 'Lingettes MUSTELA', '1,50', '30/09/2026', 'Rayon'],
    ],
  },
  'remise-lot': {
    headers: ['Catégorie', 'Produit', 'Qté totale', 'Offert(s)', 'Prix du lot €', 'Descriptif', 'Format'],
    rows: [
      ['COMPLÉMENT ALIMENTAIRE', 'Magnésium B6', '3', '1', '19,98', 'Lot de 3 boîtes', 'A4'],
      ['SOLAIRE', 'Spray solaire SPF50+', '2', '1', '24,90', 'Lot de 2 sprays', 'Réglette'],
    ],
  },
  'multi-achat': {
    headers: ['Catégorie', 'Produit', 'Qté 1', 'Prix 1', 'Qté 2', 'Prix 2', 'Qté 3', 'Prix 3', 'Format'],
    rows: [
      ['SOLAIRE', 'Spray solaire SPF50', '1', '12,90', '2', '22,90', '3', '29,90', 'Petite'],
    ],
  },
  'remise-2eme': {
    headers: ['Catégorie', 'Produit', "Prix à l'unité €", 'Remise 2ᵉ (%)', 'Descriptif', 'Format'],
    rows: [
      ['HYGIÈNE BUCCO-DENTAIRE', 'Bain de bouche LISTERINE', '6,50', '60', 'Flacon 500 ml', 'A4'],
      ['DERMO-COSMÉTIQUE', 'Crème mains NEUTROGENA', '4,95', '50', 'Tube 75 ml', 'Vitrine'],
    ],
  },
};
// Légende des formats acceptés dans la colonne « Format » de l'Excel.
const FORMATS_LEGEND = FORMATS.map(f => `${f.name} (${f.w}×${f.h} mm)`).join(' · ');

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
// Modèle CSV (repli si l'écriture xlsx échoue).
function templateCsv(type: PromoType): string {
  const t = TEMPLATES[type];
  const esc = (v: string) => /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  return '﻿' + [t.headers, ...t.rows].map(r => r.map(esc).join(';')).join('\r\n');
}
// Génère et télécharge le modèle en vrai .xlsx (repli .csv si besoin).
async function downloadTemplate(type: PromoType) {
  const t = TEMPLATES[type];
  try {
    const mod = await import('write-excel-file/browser');
    const writeXlsx = mod.default as unknown as (data: unknown, opts: Record<string, unknown>) => { toBlob: () => Promise<Blob> };
    const header = t.headers.map(h => ({ value: h, fontWeight: 'bold', align: 'center', backgroundColor: '#E7F2EC', color: '#0A5C3A' }));
    const rows = t.rows.map(r => r.map(c => ({ value: c, type: String })));
    const columns = t.headers.map(h => ({ width: Math.max(16, h.length + 4) }));
    const sheet = (TYPES.find(x => x.id === type)?.label || 'Modèle').slice(0, 31);
    const blob = await writeXlsx([header, ...rows], { columns, sheet }).toBlob();
    triggerDownload(blob, `modele-pharmapromo-${type}.xlsx`);
  } catch {
    triggerDownload(new Blob([templateCsv(type)], { type: 'text/csv;charset=utf-8' }), `modele-pharmapromo-${type}.csv`);
  }
}

function cellToStr(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'number') return String(v).replace('.', ',');
  if (v instanceof Date) return v.toLocaleDateString('fr-FR');
  return String(v).trim();
}
async function readXlsx(file: File): Promise<string[][]> {
  const mod = await import('read-excel-file/browser');
  // read-excel-file v9 renvoie [{ sheet, data }] ; on prend la 1ʳᵉ feuille.
  // (compat : certaines versions renvoient directement les lignes.)
  const result = (await mod.default(file)) as unknown;
  let rows: unknown[] = Array.isArray(result) ? result : [];
  if (rows.length && !Array.isArray(rows[0]) && typeof rows[0] === 'object' && rows[0] !== null && 'data' in (rows[0] as object)) {
    rows = ((rows[0] as { data?: unknown[] }).data) || [];
  }
  return rows.map(r => (Array.isArray(r) ? r : []).map(cellToStr)).filter(r => r.some(c => c.length));
}
async function readTextSmart(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let text = new TextDecoder('utf-8').decode(buf);
  // mojibake typique d'un CSV Windows-1252 lu en UTF-8 → on redécode
  if (/Ã[-ÿ]|Â[-ÿ]|�/.test(text)) {
    try { text = new TextDecoder('windows-1252').decode(buf); } catch { /* garde UTF-8 */ }
  }
  return text;
}
function detectHeader(rows: string[][]): boolean {
  const r = rows[0] || [];
  return r.some(c => /produit|cat[eé]gorie|nom|prix|valeur|qt|descript|marque|libell|rayon/i.test(c));
}
const isNumericish = (s: string) => { const t = (s || '').trim(); return !!t && /^[\d\s.,€%+/-]+$/.test(t); };
function autoMap(fields: ImpField[], header: string[], hasHeader: boolean, body: string[][]): Record<string, number> {
  const ncols = Math.max(header.length, body.reduce((m, r) => Math.max(m, r.length), 0));
  const used = new Set<number>(); const map: Record<string, number> = {};
  fields.forEach(f => { map[f.key] = -1; });
  // 1) correspondance par mot-clé sur les en-têtes (prioritaire et globale)
  if (hasHeader) fields.forEach(f => {
    const col = header.findIndex((h, i) => !used.has(i) && f.kw.test(h));
    if (col >= 0) { map[f.key] = col; used.add(col); }
  });
  // 2) produit non trouvé : on prend la colonne la plus « texte » (noms longs, peu de chiffres)
  if (map.product === -1 && fields.some(f => f.key === 'product')) {
    let best = -1, bestScore = 3;
    for (let c = 0; c < ncols; c++) {
      if (used.has(c)) continue;
      let sum = 0, n = 0;
      for (const r of body) { const v = (r[c] || '').trim(); if (!v) continue; n++; sum += isNumericish(v) ? 0 : v.length; }
      const avg = n ? sum / n : 0;
      if (avg > bestScore) { bestScore = avg; best = c; }
    }
    if (best >= 0) { map.product = best; used.add(best); }
  }
  // 3) repli positionnel seulement si l'en-tête n'a quasi rien donné (fichiers bruts)
  if (Object.values(map).filter(v => v >= 0).length >= 2) return map;
  fields.forEach((f, idx) => { if (map[f.key] < 0 && idx < ncols && !used.has(idx)) { map[f.key] = idx; used.add(idx); } });
  return map;
}

// Mémorisation du mappage par « signature » de fichier (mêmes en-têtes = même fournisseur).
const impMapKey = (header: string[], type: PromoType) => 'pp:impmap:' + type + '|' + header.map(h => (h || '').trim().toLowerCase()).join('§').slice(0, 200);
function loadImportMap(header: string[], type: PromoType): { mapping: Record<string, number>; formatCol: number } | null {
  try { const v = localStorage.getItem(impMapKey(header, type)); return v ? JSON.parse(v) : null; } catch { return null; }
}
function saveImportMap(header: string[], type: PromoType, mapping: Record<string, number>, formatCol: number) {
  try { localStorage.setItem(impMapKey(header, type), JSON.stringify({ mapping, formatCol })); } catch { /* quota */ }
}

function ImportModal({ onClose, onImport }: { onClose: () => void; onImport: (labels: Label[]) => void }) {
  const [type, setType] = useState<PromoType>('prix-promo');
  const [rows, setRows] = useState<string[][]>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [formatCol, setFormatCol] = useState(-1);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const fields = IMPORT_FIELDS[type];
  const ncols = rows.reduce((m, r) => Math.max(m, r.length), 0);

  // (re)calcule le mappage auto à chaque changement de données / type / en-tête
  const [remembered, setRemembered] = useState(false);
  useEffect(() => {
    if (!rows.length) return;
    const header = rows[0] || [];
    const saved = hasHeader ? loadImportMap(header, type) : null;
    if (saved) { setMapping(saved.mapping); setFormatCol(saved.formatCol); setRemembered(true); }
    else {
      setMapping(autoMap(IMPORT_FIELDS[type], header, hasHeader, hasHeader ? rows.slice(1) : rows));
      setFormatCol(hasHeader ? header.findIndex(h => FORMAT_KW.test(h)) : -1);
      setRemembered(false);
    }
    setExcluded(new Set()); // tout coché par défaut
  }, [rows, type, hasHeader]);
  const resetMapping = () => { setMapping(autoMap(IMPORT_FIELDS[type], rows[0] || [], hasHeader, hasHeader ? rows.slice(1) : rows)); setFormatCol(hasHeader ? (rows[0] || []).findIndex(h => FORMAT_KW.test(h)) : -1); setRemembered(false); };

  // Empile les tableaux côte à côte en une seule liste, puis détecte l'en-tête.
  const loadRows = (rws: string[][]) => { const s = stackColumnBlocks(rws); setRows(s); setHasHeader(detectHeader(s)); setError(s.length ? '' : 'Aucune donnée détectée.'); };
  const onText = (txt: string) => loadRows(parseTable(txt));
  const onFile = async (f: File) => {
    setFileName(f.name); setError('');
    try { loadRows(/\.xlsx?$/i.test(f.name) ? await readXlsx(f) : parseTable(await readTextSmart(f))); }
    catch (e) { setError('Lecture impossible : ' + (e instanceof Error ? e.message : String(e))); }
  };

  const colLabel = (i: number) => (hasHeader && rows[0]?.[i]?.trim()) ? rows[0][i] : `Colonne ${i + 1}`;
  const body = hasHeader ? rows.slice(1) : rows;
  // Colonnes « prix » par type : une ligne ne devient une étiquette que si l'une
  // d'elles contient un montant > 0 (→ les lignes « Bateau », titres et vides disparaissent).
  const PRICE_KEYS: Record<PromoType, (keyof LabelData)[]> = {
    'prix-promo': ['promoPrice', 'normalPrice'],
    'bon-reduction': ['couponValue'],
    'remise-lot': ['lotPrice'],
    'multi-achat': ['t1p', 't2p', 't3p'],
    'remise-2eme': ['normalPrice'],
  };
  // Lignes retenues = produit non vide + au moins un prix valide (le reste est ignoré).
  const prepared = body.map(r => {
    const d: Partial<LabelData> = {};
    fields.forEach(f => { const c = mapping[f.key]; if (c >= 0 && r[c] != null && r[c] !== '') (d as Record<string, string>)[f.key] = r[c]; });
    if (!d.product) d.product = (mapping.product >= 0 ? r[mapping.product] : r[0]) || '';
    // Désignation pharmacie « Nom marque F/500ML » : si pas de descriptif fourni,
    // on détache le litrage/grammage pour l'afficher sur la petite ligne.
    if (!d.qtyLabel && d.product) { const sp = splitSize(d.product); if (sp.size) { d.product = sp.product; d.qtyLabel = sp.size; } }
    return { d, r };
  }).filter(({ d }) => (d.product || '').trim() && PRICE_KEYS[type].some(k => pf((d as Record<string, string>)[k] || '') > 0));
  const validCount = prepared.length;
  // Format dominant lu dans la colonne « Format » (taille de la planche).
  const fmtCounts: Record<string, number> = {};
  if (formatCol >= 0) for (const { r } of prepared) { const f = matchFormat(r[formatCol] || ''); if (f) fmtCounts[f.id] = (fmtCounts[f.id] || 0) + 1; }
  const domFmt = FORMATS.find(f => f.id === (Object.entries(fmtCounts).sort((a, b) => b[1] - a[1])[0]?.[0])) || null;
  const selected = prepared.filter((_, i) => !excluded.has(i));
  const selectedCount = selected.length;
  const toggleRow = (i: number) => setExcluded(s => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  const toggleAll = () => setExcluded(s => (s.size === 0 ? new Set(prepared.map((_, i) => i)) : new Set()));
  const build = () => {
    if (!selectedCount) { setError('Cochez au moins un produit à générer.'); return; }
    if (hasHeader && rows[0]) saveImportMap(rows[0], type, mapping, formatCol); // mémorise pour ce fournisseur
    const labels = selected.map(({ d, r }) => {
      if (!d.category) d.category = 'PROMOTION';
      const f = formatCol >= 0 ? matchFormat(r[formatCol] || '') : null;
      return newLabel(type, d, f ? { w: f.w, h: f.h } : undefined);
    });
    onImport(labels);
  };

  const example = 'Catégorie;Produit;Prix normal;Prix promo;Descriptif\nCOMPLÉMENT ALIMENTAIRE;Chondro-haid Fort ARKOPHARMA;31,90;26,90;Lot de 3 x 60 gélules*';

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SYS, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 640, maxWidth: '95vw', maxHeight: '92vh', overflow: 'auto', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 22, color: '#e2e8f0' }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Importer des produits</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>Fichier <strong>.xlsx</strong> ou <strong>.csv</strong>, ou collez depuis Excel. Accents et colonnes gérés automatiquement — vous pouvez corriger le mappage.</div>

        <div style={{ flex: '1 1 200px', marginBottom: 12 }}><label style={lbl}>Type d&apos;étiquette</label><select value={type} onChange={e => setType(e.target.value as PromoType)} style={{ ...inp, cursor: 'pointer' }}>{TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></div>

        <div style={{ background: '#0c2a1c', border: '1px solid #166534', borderRadius: 8, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 8 }}>① Récupérez le modèle prérempli, remplissez vos lignes, puis réimportez-le : les colonnes se mappent toutes seules.</div>
          <button onClick={() => downloadTemplate(type)} style={{ width: '100%', padding: '11px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 14, fontWeight: 800 }}>⬇ Télécharger le modèle Excel — {TYPES.find(t => t.id === type)?.label}</button>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', alignSelf: 'center' }}>② Importez votre fichier :</div>
          <label style={{ ...inp, width: 'auto', cursor: 'pointer', padding: '8px 14px', textAlign: 'center' }}>📁 Choisir un fichier (.xlsx / .csv)
            <input type="file" accept=".xlsx,.xls,.csv,text/csv,text/plain" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
        </div>
        {fileName && <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>📄 {fileName} — {validCount} produit(s) avec prix détecté(s) sur {body.length} ligne(s)</div>}

        <Field label="…ou coller depuis Excel (Ctrl+V)"><textarea placeholder={example} rows={3} onChange={e => onText(e.target.value)} style={{ ...inp, resize: 'vertical', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5 }} /></Field>

        {error && <Warn>{error}</Warn>}

        {rows.length > 0 && <>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1', marginBottom: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={hasHeader} onChange={e => setHasHeader(e.target.checked)} /> La 1ʳᵉ ligne contient les en-têtes de colonnes
          </label>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <SectionTitle>Correspondance des colonnes</SectionTitle>
            {remembered && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#86efac' }}>✓ mappage mémorisé <button onClick={resetMapping} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 10, textDecoration: 'underline' }}>réinitialiser</button></span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            {fields.map(f => (
              <div key={f.key}>
                <label style={lbl}>{f.label}</label>
                <select value={mapping[f.key] ?? -1} onChange={e => setMapping(m => ({ ...m, [f.key]: parseInt(e.target.value) }))} style={{ ...inp, cursor: 'pointer' }}>
                  <option value={-1}>(aucune)</option>
                  {Array.from({ length: ncols }).map((_, i) => <option key={i} value={i}>{colLabel(i)}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label style={lbl}>Format (taille d&apos;étiquette)</label>
              <select value={formatCol} onChange={e => setFormatCol(parseInt(e.target.value))} style={{ ...inp, cursor: 'pointer' }}>
                <option value={-1}>(aucune — garder le format actuel)</option>
                {Array.from({ length: ncols }).map((_, i) => <option key={i} value={i}>{colLabel(i)}</option>)}
              </select>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 14, lineHeight: 1.5 }}>📐 La colonne « Format » règle la taille <strong style={{ color: '#cbd5e1' }}>de chaque étiquette</strong> individuellement. Formats reconnus : <strong style={{ color: '#cbd5e1' }}>{FORMATS_LEGEND}</strong>.{domFmt && <span style={{ color: '#86efac' }}> (principal détecté : {domFmt.name})</span>}</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SectionTitle>Produits à générer ({selectedCount}/{validCount})</SectionTitle>
            {validCount > 0 && <button onClick={toggleAll} style={{ marginLeft: 'auto', marginBottom: 10, padding: '4px 10px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>{excluded.size === 0 ? 'Tout décocher' : 'Tout cocher'}</button>}
          </div>
          <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid #1e293b', borderRadius: 6, marginBottom: 14 }}>
            {prepared.map(({ d, r }, i) => {
              const on = !excluded.has(i);
              const price = (PRICE_KEYS[type].map(k => (d as Record<string, string>)[k]).find(v => v) || '');
              const fmt = formatCol >= 0 ? matchFormat(r[formatCol] || '') : null;
              return (
                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 9px', borderBottom: '1px solid #1e293b', cursor: 'pointer', background: on ? 'transparent' : '#0b1220', opacity: on ? 1 : 0.5 }}>
                  <input type="checkbox" checked={on} onChange={() => toggleRow(i)} />
                  <span style={{ flex: 1, fontSize: 12, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.product}</span>
                  <span style={{ fontSize: 12, color: '#86efac', fontWeight: 700 }}>{price} €</span>
                  {fmt && <span style={{ fontSize: 10, color: '#64748b' }}>{fmt.name}</span>}
                </label>
              );
            })}
          </div>
        </>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 16px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Annuler</button>
          <button onClick={build} disabled={!selectedCount} style={{ padding: '9px 20px', background: selectedCount ? '#16a34a' : '#334155', color: '#fff', border: 'none', borderRadius: 7, cursor: selectedCount ? 'pointer' : 'default', fontSize: 13, fontWeight: 800 }}>Générer {selectedCount || ''} étiquette{selectedCount > 1 ? 's' : ''}</button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
//  STORE (serveur Vercel KV ou repli localStorage)
// ──────────────────────────────────────────────────────────────────────

const KEY_LS = 'pharmapromo:key';
const authHeaders = (): Record<string, string> => { const k = (typeof localStorage !== 'undefined' && localStorage.getItem(KEY_LS)) || ''; return k ? { 'x-team-key': k } : {}; };
interface Store { list(): Promise<Meta[]>; get(id: string): Promise<Project | null>; create(p: Project): Promise<string>; save(id: string, p: Project): Promise<void>; remove(id: string): Promise<void>; }

const serverStore: Store = {
  async list() { const r = await fetch('/api/planches', { headers: authHeaders(), cache: 'no-store' }); if (r.status === 401) throw new Error('401'); return r.ok ? r.json() : []; },
  async get(id) { const r = await fetch(`/api/planches/${id}`, { headers: authHeaders(), cache: 'no-store' }); return r.ok ? r.json() : null; },
  async create(p) { const r = await fetch('/api/planches', { method: 'POST', headers: { 'content-type': 'application/json', ...authHeaders() }, body: JSON.stringify(p) }); const d = await r.json(); return d.id; },
  async save(id, p) { await fetch(`/api/planches/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json', ...authHeaders() }, body: JSON.stringify(p) }); },
  async remove(id) { await fetch(`/api/planches/${id}`, { method: 'DELETE', headers: authHeaders() }); },
};

const L_IDS = 'pp:local:ids';
const lid = (id: string) => `pp:local:${id}`;
const localStore: Store = {
  async list() { const ids: string[] = JSON.parse(localStorage.getItem(L_IDS) || '[]'); return ids.map(id => { const p = JSON.parse(localStorage.getItem(lid(id)) || 'null'); return p ? { id, pharmacy: p.pharmacy || 'Sans nom', plan: p.plan || '', updatedAt: p.updatedAt || 0 } : null; }).filter(Boolean).sort((a, b) => (b as Meta).updatedAt - (a as Meta).updatedAt) as Meta[]; },
  async get(id) { return JSON.parse(localStorage.getItem(lid(id)) || 'null'); },
  async create(p) { const id = uid(); const ids: string[] = JSON.parse(localStorage.getItem(L_IDS) || '[]'); ids.push(id); localStorage.setItem(L_IDS, JSON.stringify(ids)); localStorage.setItem(lid(id), JSON.stringify({ ...p, updatedAt: Date.now() })); return id; },
  async save(id, p) { localStorage.setItem(lid(id), JSON.stringify({ ...p, updatedAt: Date.now() })); const ids: string[] = JSON.parse(localStorage.getItem(L_IDS) || '[]'); if (!ids.includes(id)) { ids.push(id); localStorage.setItem(L_IDS, JSON.stringify(ids)); } },
  async remove(id) { localStorage.removeItem(lid(id)); const ids: string[] = JSON.parse(localStorage.getItem(L_IDS) || '[]'); localStorage.setItem(L_IDS, JSON.stringify(ids.filter(x => x !== id))); },
};

// ── Bibliothèque de logos enregistrés (cloud KV ou repli local) ──────────
interface SavedLogo { id: string; name: string; src: string }
interface LogoStore { list(): Promise<SavedLogo[]>; add(name: string, src: string): Promise<SavedLogo[]>; remove(id: string): Promise<SavedLogo[]>; }
const serverLogos: LogoStore = {
  async list() { const r = await fetch('/api/logos', { headers: authHeaders(), cache: 'no-store' }); return r.ok ? r.json() : []; },
  async add(name, src) { await fetch('/api/logos', { method: 'POST', headers: { 'content-type': 'application/json', ...authHeaders() }, body: JSON.stringify({ name, src }) }); return this.list(); },
  async remove(id) { await fetch(`/api/logos?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: authHeaders() }); return this.list(); },
};
const LOGOS_LS = 'pp:logos';
const localLogos: LogoStore = {
  async list() { return JSON.parse(localStorage.getItem(LOGOS_LS) || '[]'); },
  async add(name, src) { const arr: SavedLogo[] = JSON.parse(localStorage.getItem(LOGOS_LS) || '[]'); arr.unshift({ id: uid(), name, src }); const next = arr.slice(0, 50); localStorage.setItem(LOGOS_LS, JSON.stringify(next)); return next; },
  async remove(id) { const arr: SavedLogo[] = JSON.parse(localStorage.getItem(LOGOS_LS) || '[]').filter((l: SavedLogo) => l.id !== id); localStorage.setItem(LOGOS_LS, JSON.stringify(arr)); return arr; },
};

// Bibliothèque de logos : téléverser pour enregistrer, cliquer pour appliquer.
function LogoLibrary({ logos, onSave, onDelete, onPick }: { logos: SavedLogo[]; onSave: (name: string, src: string) => void; onDelete: (id: string) => void; onPick: (src: string) => void }) {
  const upload = (file: File) => { const r = new FileReader(); r.onload = () => onSave(file.name.replace(/\.[^.]+$/, ''), r.result as string); r.readAsDataURL(file); };
  return (
    <Field label="Logos enregistrés (bibliothèque)">
      <label style={{ ...inp, cursor: 'pointer', textAlign: 'center', display: 'block', marginBottom: 8 }}>⬆ Enregistrer un logo<input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && upload(e.target.files[0])} /></label>
      {logos.length === 0 ? <div style={{ fontSize: 11, color: '#64748b' }}>Aucun logo enregistré. Téléversez-le une fois, il restera disponible et s&apos;applique en un clic.</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
          {logos.map(lg => (
            <div key={lg.id} onClick={() => onPick(lg.src)} title={`Appliquer : ${lg.name}`} style={{ position: 'relative', background: '#fff', border: '1px solid #334155', borderRadius: 6, padding: 4, height: 54, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <img src={lg.src} alt={lg.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              <button onClick={e => { e.stopPropagation(); onDelete(lg.id); }} title="Retirer de la bibliothèque" style={{ position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: '50%', background: '#ef4444', color: '#fff', border: '2px solid #0f172a', fontSize: 9, cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
            </div>
          ))}
        </div>
      )}
    </Field>
  );
}

// ──────────────────────────────────────────────────────────────────────
//  STUDIO
// ──────────────────────────────────────────────────────────────────────

function useMobile() {
  const [m, setM] = useState(false);
  useEffect(() => { const f = () => setM(window.innerWidth < 820); f(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  return m;
}

function Studio({ project, setProject, onBack, saving, mode, undo, redo, canUndo, canRedo, logos, onSaveLogo, onDeleteLogo }: { project: Project; setProject: (fn: (p: Project) => Project) => void; onBack: () => void; saving: string; mode: 'server' | 'local'; undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean; logos: SavedLogo[]; onSaveLogo: (name: string, src: string) => void; onDeleteLogo: (id: string) => void; }) {
  const [selLabel, setSelLabel] = useState<string | null>(null);
  const [selEl, setSelEl] = useState<string | null>(null);
  const [editing, setEditing] = useState(true);
  const [scale, setScale] = useState(0.6);
  const [showImport, setShowImport] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [pctBadge, setPctBadge] = useState('20');
  const [editId, setEditId] = useState<string | null>(null);
  const drag = useRef<DragState | null>(null);
  const [snap, setSnap] = useState<Snap>({ x: false, y: false });
  const isMobile = useMobile();
  const L = layout(project);

  useEffect(() => {
    const fit = () => {
      if (window.innerWidth < 820) { const availW = window.innerWidth - 20, availH = window.innerHeight - 150; setScale(Math.min(3.5, Math.max(0.12, Math.min(availH / L.PH, availW / L.PW)))); }
      else { const availH = window.innerHeight - 130, availW = window.innerWidth - 340 - 80; setScale(Math.min(3.5, Math.max(0.2, Math.min(availH / L.PH, availW / L.PW)))); }
    };
    fit(); window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit);
  }, [L.PH, L.PW]);

  // ouvre le panneau d'édition sur mobile lors d'une sélection
  const pickLabel = (id: string | null) => { setSelLabel(id); setSelEl(null); if (id && isMobile) setPanelOpen(true); };
  // Sélectionner un élément n'ouvre PAS le panneau du bas (mobile) : on garde l'étiquette
  // visible pour pouvoir écrire directement dessus (le panneau recouvrirait l'étiquette).
  const pickEl = (id: string | null) => { setSelEl(id); };

  // changement de dimensions : si l'orientation bascule, on remet les positions par défaut
  const setSize = (w: number, h: number) => setProject(p => {
    const flip = (p.labelWmm > p.labelHmm * 1.5) !== (w > h * 1.5);
    return { ...p, labelWmm: w, labelHmm: h, labels: flip ? p.labels.map(l => ({ ...l, overrides: {} })) : p.labels };
  });
  // Changement de style : on repart des positions par défaut (compositions différentes).
  const setTheme = (t: string) => setProject(p => p.theme === t ? p : ({ ...p, theme: t, labels: p.labels.map(l => ({ ...l, overrides: {} })) }));
  const current = project.labels.find(l => l.id === selLabel) || null;
  const seedOpts: SeedOpts = { landscape: L.landscape, logo: project.logo, disclaimer: project.disclaimer, editing: true, small: L.small, aspect: project.labelWmm / project.labelHmm, theme: project.theme || 'promo', dateStart: project.dateStart, dateEnd: project.dateEnd };
  const currentEl: El | null = current && selEl ? resolveEls(current, seedOpts).find(e => e.id === selEl) || null : null;
  const overflow = project.labels.length > L.capacity;

  const updateLabel = useCallback((id: string, fn: (l: Label) => Label) => setProject(p => ({ ...p, labels: p.labels.map(l => l.id === id ? fn(l) : l) })), [setProject]);
  const setData = (k: keyof LabelData, v: string) => { if (current) updateLabel(current.id, l => ({ ...l, data: { ...l.data, [k]: v } })); };
  const patchElById = (id: string, patch: Partial<El>) => { if (!current) return; updateLabel(current.id, l => isBound(l, id) ? { ...l, overrides: { ...l.overrides, [id]: { ...l.overrides[id], ...patch } } } : { ...l, extra: l.extra.map(e => e.id === id ? { ...e, ...patch } : e) }); };
  const patchEl = (patch: Partial<El>) => { if (selEl) patchElById(selEl, patch); };
  // Supprimer un bloc : les blocs ajoutés sont retirés, les blocs du modèle sont masqués (réversible).
  const delEl = (id: string) => { if (!current) return; updateLabel(current.id, l => isBound(l, id) ? { ...l, overrides: { ...l.overrides, [id]: { ...l.overrides[id], hidden: true } } } : { ...l, extra: l.extra.filter(e => e.id !== id) }); if (selEl === id) setSelEl(null); };
  // Ajout d'un bloc de texte libre, déplaçable / redimensionnable / supprimable.
  // Sans cible précise : étiquette sélectionnée, sinon la dernière. Position en % (défaut centre).
  const addTextBlock = (labelId?: string, x = 18, y = 45) => {
    const target = labelId ? project.labels.find(l => l.id === labelId) : (current || project.labels[project.labels.length - 1]);
    if (!target) return;
    const e: El = { id: 't' + uid(), kind: 'text', text: 'Nouveau texte', x, y, w: 64, size: 0.05, font: SYS, color: '#21392B', weight: 700, align: 'center', rot: 0, removable: true };
    updateLabel(target.id, l => ({ ...l, extra: [...l.extra, e] }));
    setSelLabel(target.id); setSelEl(e.id); setEditId(e.id);
    if (isMobile) setPanelOpen(true);
  };
  // Ajout d'une forme simple : carré, rond ou ligne (déplaçable / redimensionnable / supprimable).
  const addShape = (shape: 'rect' | 'circle' | 'line') => {
    const target = current || project.labels[project.labels.length - 1];
    if (!target) return;
    const asp = project.labelWmm / project.labelHmm;
    const base = { id: 's' + uid(), kind: 'box' as ElKind, size: 0, font: SYS, color: '#0E7A4D', weight: 400, align: 'left' as Align, rot: 0, removable: true, bg: '#0E7A4D' };
    let e: El;
    if (shape === 'circle') e = { ...base, x: 38, y: 38, w: 24, shape: 'circle' };
    else if (shape === 'line') e = { ...base, x: 25, y: 50, w: 50, h: 0.8, radius: 999 };
    else e = { ...base, x: 38, y: 40, w: 24, h: Math.round(24 * asp * 10) / 10, radius: 4 };
    updateLabel(target.id, l => ({ ...l, extra: [...l.extra, e] }));
    setSelLabel(target.id); setSelEl(e.id);
    if (isMobile) setPanelOpen(true);
  };
  // Réaffiche tous les blocs du modèle qui avaient été masqués.
  const restoreHidden = () => { if (!current) return; updateLabel(current.id, l => { const ov: Record<string, Partial<El>> = {}; for (const [k, v] of Object.entries(l.overrides)) { const r = { ...v }; delete r.hidden; ov[k] = r; } return { ...l, overrides: ov }; }); };
  const hiddenCount = current ? Object.values(current.overrides).filter(o => o.hidden).length : 0;
  const changeType = (t: PromoType) => { if (current) { updateLabel(current.id, l => ({ ...l, type: t, overrides: {} })); setSelEl(null); } };
  const setAccent = (c: string) => { if (current) updateLabel(current.id, l => ({ ...l, accent: c })); };
  const setBg = (c: string) => { if (current) updateLabel(current.id, l => ({ ...l, bg: c })); };
  // Format propre à l'étiquette sélectionnée (null = comme la planche). Reset des positions.
  const setLabelSize = (w: number | null, h: number | null) => { if (!current) return; updateLabel(current.id, l => { const nl: Label = { ...l, overrides: {} }; if (w && h) { nl.wMm = w; nl.hMm = h; } else { delete nl.wMm; delete nl.hMm; } return nl; }); setSelEl(null); };
  // Édition par lot : applique le format de l'étiquette courante à TOUTES.
  const applyFormatToAll = () => { if (!current) return; const w = current.wMm, h = current.hMm; setProject(p => ({ ...p, labels: p.labels.map(l => { const nl: Label = { ...l, overrides: {} }; if (w && h) { nl.wMm = w; nl.hMm = h; } else { delete nl.wMm; delete nl.hMm; } return nl; }) })); };
  const addLabel = () => { const t = current?.type || 'prix-promo'; const nl = newLabel(t); setProject(p => ({ ...p, labels: [...p.labels, nl] })); setSelLabel(nl.id); setSelEl(null); };
  const duplicateLabel = () => { if (!current) return; const copy: Label = { ...current, id: uid(), overrides: { ...current.overrides }, extra: current.extra.map(e => ({ ...e })) }; setProject(p => ({ ...p, labels: [...p.labels, copy] })); setSelLabel(copy.id); };
  const deleteLabel = () => { if (!current) return; setProject(p => ({ ...p, labels: p.labels.filter(l => l.id !== current.id) })); setSelLabel(null); setSelEl(null); };
  const deleteLabelById = (id: string) => { setProject(p => ({ ...p, labels: p.labels.filter(l => l.id !== id) })); if (selLabel === id) { setSelLabel(null); setSelEl(null); } };
  // Réordonne l'étiquette sélectionnée (ordre = ordre d'impression).
  const moveLabel = (dir: -1 | 1) => { if (!current) return; setProject(p => { const i = p.labels.findIndex(l => l.id === current.id); const j = i + dir; if (i < 0 || j < 0 || j >= p.labels.length) return p; const ls = p.labels.slice(); [ls[i], ls[j]] = [ls[j], ls[i]]; return { ...p, labels: ls }; }); };
  const labelIndex = current ? project.labels.findIndex(l => l.id === current.id) : -1;
  const addBadge = (t: string, bg: string) => { if (!current) return; const e: El = { id: 'b' + uid(), kind: 'pill', text: t, x: 8, y: 8, size: 0.045, font: SYS, color: '#fff', bg, weight: 900, align: 'center', rot: -8, radius: 6, removable: true }; updateLabel(current.id, l => ({ ...l, extra: [...l.extra, e] })); setSelEl(e.id); };
  const addBrandLogoSrc = (src: string) => { if (!current) return; const e: El = { id: 'logo' + uid(), kind: 'image', src, x: 66, y: 6, w: 22, size: 0, font: SYS, color: '#000', weight: 400, align: 'left', rot: 0, removable: true }; updateLabel(current.id, l => ({ ...l, extra: [...l.extra, e] })); setSelEl(e.id); };
  const uploadBrandLogo = (file: File) => { const r = new FileReader(); r.onload = () => addBrandLogoSrc(r.result as string); r.readAsDataURL(file); };
  const uploadPharmaLogo = (file: File) => { const r = new FileReader(); r.onload = () => setProject(p => ({ ...p, logo: r.result as string })); r.readAsDataURL(file); };

  const dragStart = (ev: React.PointerEvent, labelId: string, elId: string, el: El) => {
    const target = ev.currentTarget as HTMLElement;
    const box = target.closest('[data-labelbox]') as HTMLElement; if (!box) return;
    const r = box.getBoundingClientRect(), er = target.getBoundingClientRect();
    // Taille du bloc en % de l'étiquette → permet d'aligner son CENTRE sur l'axe central.
    drag.current = { labelId, elId, offX: ((ev.clientX - r.left) / r.width) * 100 - el.x, offY: ((ev.clientY - r.top) / r.height) * 100 - el.y, box, elW: (er.width / r.width) * 100, elH: (er.height / r.height) * 100, startX: ev.clientX, startY: ev.clientY, active: false };
    target.setPointerCapture?.(ev.pointerId);
  };
  useEffect(() => {
    const SNAP = 1.5; // seuil d'aimantage (% de l'étiquette)
    const move = (ev: PointerEvent) => {
      const ds = drag.current; if (!ds) return; const r = ds.box.getBoundingClientRect();
      // Seuil anti-clic : tant que le pointeur n'a pas franchi ~4 px, on ne bouge pas le bloc.
      // → un simple clic / double-clic (avec micro-tremblement de souris ou tactile) reste un clic
      //   et déclenche bien la sélection / l'édition au lieu de déplacer le prix par accident.
      if (!ds.active) { if (Math.hypot(ev.clientX - ds.startX, ev.clientY - ds.startY) < 4) return; ds.active = true; }
      let nx = Math.max(-8, Math.min(99, ((ev.clientX - r.left) / r.width) * 100 - ds.offX));
      let ny = Math.max(-8, Math.min(99, ((ev.clientY - r.top) / r.height) * 100 - ds.offY));
      // Aimantage au centre : on aligne le centre du bloc sur 50 %. Shift = désactivé (placement libre).
      const sx = !ev.shiftKey && Math.abs(nx + ds.elW / 2 - 50) < SNAP;
      const sy = !ev.shiftKey && Math.abs(ny + ds.elH / 2 - 50) < SNAP;
      if (sx) nx = 50 - ds.elW / 2;
      if (sy) ny = 50 - ds.elH / 2;
      setSnap(s => (s.x === sx && s.y === sy) ? s : { x: sx, y: sy });
      updateLabel(ds.labelId, l => isBound(l, ds.elId) ? { ...l, overrides: { ...l.overrides, [ds.elId]: { ...l.overrides[ds.elId], x: nx, y: ny } } } : { ...l, extra: l.extra.map(e => e.id === ds.elId ? { ...e, x: nx, y: ny } : e) });
    };
    const up = () => { drag.current = null; setSnap(s => (s.x || s.y) ? { x: false, y: false } : s); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [updateLabel]);

  // Suppression au clavier : élément sélectionné sinon étiquette sélectionnée.
  const delKeyRef = useRef<() => void>(() => {});
  delKeyRef.current = () => { if (selEl) delEl(selEl); else if (selLabel) deleteLabelById(selLabel); };
  // Raccourcis Annuler / Refaire / Suppr (hors champs de saisie)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.ctrlKey || e.metaKey) && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      else if (!e.ctrlKey && !e.metaKey && (k === 'delete' || k === 'backspace')) { e.preventDefault(); delKeyRef.current(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  return (
    <>
    <div id="app" style={{ display: 'flex', height: '100vh', fontFamily: SYS, overflow: 'hidden' }}>
      <div id="studio" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <main style={{ flex: 1, background: '#0b1220', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap' }}>
            <button onClick={onBack} style={{ padding: '7px 12px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>← Bibliothèque</button>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>{project.pharmacy} <span style={{ color: '#475569', fontWeight: 400 }}>· {project.plan}</span></div>
            <div style={{ fontSize: 11, color: saving === 'Enregistré' ? '#4ade80' : '#fbbf24' }}>{saving}</div>
            <div style={{ width: 1, height: 24, background: '#1e293b' }} />
            <div style={{ display: 'flex', gap: 4 }}>{PAGE_FORMATS.map(f => { const on = project.pageFormat === f.id; return <button key={f.id} onClick={() => setProject(p => ({ ...p, pageFormat: f.id }))} style={{ padding: '5px 9px', background: on ? '#16a34a' : '#1e293b', color: on ? '#fff' : '#94a3b8', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>{f.name}</button>; })}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={undo} disabled={!canUndo} title="Annuler (Ctrl+Z)" style={{ padding: '5px 9px', background: '#1e293b', color: canUndo ? '#cbd5e1' : '#475569', border: '1px solid #334155', borderRadius: 6, cursor: canUndo ? 'pointer' : 'default', fontSize: 13 }}>↶</button>
              <button onClick={redo} disabled={!canRedo} title="Refaire (Ctrl+Y)" style={{ padding: '5px 9px', background: '#1e293b', color: canRedo ? '#cbd5e1' : '#475569', border: '1px solid #334155', borderRadius: 6, cursor: canRedo ? 'pointer' : 'default', fontSize: 13 }}>↷</button>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(e => !e)} style={{ padding: '7px 12px', background: editing ? '#16a34a22' : '#1e293b', color: editing ? '#4ade80' : '#94a3b8', border: `1px solid ${editing ? '#16a34a' : '#334155'}`, borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>{editing ? '✓ Édition' : 'Aperçu'}</button>
              <button onClick={() => setShowImport(true)} style={{ padding: '7px 12px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>⬆ Importer</button>
              <button onClick={addLabel} style={{ padding: '7px 12px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>＋ Étiquette</button>
              <button onClick={() => addTextBlock()} title="Ajouter un bloc de texte (ou double-cliquez sur l'étiquette)" style={{ padding: '7px 12px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>＋ Texte</button>
              <div style={{ display: 'flex', gap: 3, border: '1px solid #334155', borderRadius: 7, padding: 2 }} title="Style d'étiquette (non destructif)">
                {[{ id: 'promo', t: '🏷️ Promo', c: '#D4A017' }, { id: 'officine', t: '✚ Officine', c: '#0E7A4D' }].map(th => { const on = (project.theme || 'promo') === th.id; return <button key={th.id} onClick={() => setTheme(th.id)} style={{ padding: '4px 9px', background: on ? th.c : 'transparent', color: on ? '#fff' : '#94a3b8', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>{th.t}</button>; })}
              </div>
              <button onClick={() => setShowPreview(true)} style={{ padding: '7px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 800, boxShadow: '0 2px 10px #16a34a66' }}>🖨 Imprimer / PDF</button>
            </div>
          </div>
          {overflow && <div style={{ background: '#7c2d12', color: '#fed7aa', fontSize: 12, padding: '6px 16px' }}>⚠ {project.labels.length} étiquettes pour {L.capacity} emplacement(s) — réduisez la taille ou changez de format.</div>}
          <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 8 : 28, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            <div style={{ width: L.PW * scale, height: L.PH * scale, flexShrink: 0 }}>
              <Planche project={project} scale={scale} editing={editing} selLabel={selLabel} selEl={selEl} snap={snap} setSelLabel={pickLabel} setSelEl={pickEl} onAdd={addLabel} dragStart={dragStart} delEl={delEl} addTextAt={(id, x, y) => addTextBlock(id, x, y)} editId={editId} startEdit={(id) => { setSelEl(id); setEditId(id); if (isMobile) setPanelOpen(false); }} commitText={(id, t) => patchElById(id, { text: t })} endEdit={() => setEditId(null)} deleteLabelId={deleteLabelById} />
            </div>
          </div>
        </main>

        {isMobile && panelOpen && <div onClick={() => setPanelOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 55 }} />}
        <aside style={isMobile
          ? { position: 'fixed', left: 0, right: 0, bottom: 0, height: '66vh', zIndex: 60, background: '#0f172a', borderTop: '1px solid #1e293b', display: 'flex', flexDirection: 'column', overflow: 'hidden', transform: panelOpen ? 'translateY(0)' : 'translateY(100%)', transition: 'transform .25s', boxShadow: '0 -12px 40px rgba(0,0,0,0.5)', borderTopLeftRadius: 14, borderTopRightRadius: 14 }
          : { width: 340, flexShrink: 0, background: '#0f172a', borderLeft: '1px solid #1e293b', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {isMobile && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: '1px solid #1e293b' }}><div style={{ width: 40, height: 4, background: '#334155', borderRadius: 2, margin: '0 auto' }} /><button onClick={() => setPanelOpen(false)} style={{ position: 'absolute', right: 14, background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>✕</button></div>}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
            {!current ? (
              <>
                <SectionTitle>Réglages de la planche</SectionTitle>
                <TextInp label="Nom de l'officine" value={project.pharmacy} onChange={v => setProject(p => ({ ...p, pharmacy: v }))} />
                <TextInp label="Intitulé du plan / période" value={project.plan} onChange={v => setProject(p => ({ ...p, plan: v }))} />
                <Field label="Logo de l'officine (sur chaque étiquette)">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <label style={{ ...inp, cursor: 'pointer', textAlign: 'center', flex: 1 }}>{project.logo ? 'Changer le logo' : '⬆ Téléverser'}<input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadPharmaLogo(e.target.files[0])} /></label>
                    {project.logo && <button onClick={() => setProject(p => ({ ...p, logo: null }))} style={{ padding: '7px 10px', background: '#7f1d1d', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>✕</button>}
                  </div>
                </Field>
                <LogoLibrary logos={logos} onSave={onSaveLogo} onDelete={onDeleteLogo} onPick={src => setProject(p => ({ ...p, logo: src }))} />
                {project.logo && <button onClick={() => onSaveLogo('Logo', project.logo!)} style={{ ...inp, cursor: 'pointer', textAlign: 'center', display: 'block', marginBottom: 10, color: '#cbd5e1' }}>💾 Enregistrer le logo actuel dans la bibliothèque</button>}
                <Field label="Période de promotion (toutes les étiquettes)">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input value={project.dateStart || ''} onChange={e => setProject(p => ({ ...p, dateStart: e.target.value }))} placeholder="du 01/06/2026" style={inp} />
                    <input value={project.dateEnd || ''} onChange={e => setProject(p => ({ ...p, dateEnd: e.target.value }))} placeholder="au 30/06/2026" style={inp} />
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>S&apos;affiche en bas de chaque étiquette (sauf si une étiquette a ses propres dates).</div>
                </Field>
                <Field label="Mentions légales (bas d'étiquette)"><textarea value={project.disclaimer} onChange={e => setProject(p => ({ ...p, disclaimer: e.target.value }))} rows={2} style={{ ...inp, resize: 'none' }} /></Field>
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: 12, marginTop: 6 }}>
                  <SectionTitle>Dimensions des étiquettes</SectionTitle>
                  <Field label="Modèles courants (mm)">
                    <select value={`${project.labelWmm}x${project.labelHmm}`} onChange={e => { const [w, h] = e.target.value.split('x').map(Number); setSize(w, h); setProject(pp => ({ ...pp, pageFormat: (w === 210 && h === 297) ? 'A4' : 'fit' })); }} style={{ ...inp, cursor: 'pointer' }}>
                      <option value={`${project.labelWmm}x${project.labelHmm}`}>{project.labelWmm}×{project.labelHmm} (actuel)</option>
                      {LABEL_PRESETS.map(p => <option key={p.name} value={`${p.w}x${p.h}`}>{p.name}</option>)}
                    </select>
                  </Field>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <NumMm label="Largeur (mm)" value={project.labelWmm} onChange={v => setSize(v, project.labelHmm)} />
                    <NumMm label="Hauteur (mm)" value={project.labelHmm} onChange={v => setSize(project.labelWmm, v)} />
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{L.landscape ? 'Disposition réglette (paysage)' : 'Disposition portrait'} · {L.capacity} / page</div>
                </div>
                <div style={{ marginTop: 16, padding: 12, background: '#0b1220', borderRadius: 8, border: '1px solid #1e293b', fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>👉 Cliquez une <strong style={{ color: '#e2e8f0' }}>étiquette</strong> puis un <strong style={{ color: '#e2e8f0' }}>élément</strong> pour le déplacer/personnaliser. La remise immédiate se calcule automatiquement (prix normal − promo).</div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}><SectionTitle>Étiquette sélectionnée</SectionTitle><button onClick={() => { setSelLabel(null); setSelEl(null); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16 }}>✕</button></div>
                <div style={{ background: '#0b1220', border: '1px solid #1e293b', borderRadius: 8, padding: 10, marginBottom: 12 }}>
                  <SectionTitle>＋ Ajouter sur l&apos;étiquette</SectionTitle>
                  <button onClick={() => addTextBlock()} style={{ width: '100%', padding: '9px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 800, marginBottom: 6 }}>🔤 Bloc de texte</button>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[{ s: 'rect' as const, t: '⬛', n: 'Carré' }, { s: 'circle' as const, t: '⚫', n: 'Rond' }, { s: 'line' as const, t: '➖', n: 'Ligne' }].map(b => <button key={b.s} onClick={() => addShape(b.s)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 4px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}><span style={{ fontSize: 16 }}>{b.t}</span>{b.n}</button>)}
                  </div>
                </div>
                <Field label="Type de promotion">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>{TYPES.map(t => { const on = current.type === t.id; return <button key={t.id} onClick={() => changeType(t.id)} style={{ padding: '7px 6px', background: on ? `${t.color}22` : '#1e293b', border: `1px solid ${on ? t.color : '#334155'}`, borderRadius: 6, cursor: 'pointer', fontSize: 10.5, fontWeight: 700, color: on ? '#f8fafc' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 5 }}><span>{t.icon}</span>{t.label}</button>; })}</div>
                </Field>
                <Field label="Format de cette étiquette">
                  <select value={current.wMm ? `${current.wMm}x${current.hMm}` : ''} onChange={e => { const v = e.target.value; if (!v) setLabelSize(null, null); else { const [w, h] = v.split('x').map(Number); setLabelSize(w, h); } }} style={{ ...inp, cursor: 'pointer' }}>
                    <option value="">Comme la planche ({project.labelWmm}×{project.labelHmm} mm)</option>
                    {FORMATS.map(f => <option key={f.id} value={`${f.w}x${f.h}`}>{f.name} — {f.w}×{f.h} mm</option>)}
                  </select>
                  {project.labels.length > 1 && <button onClick={applyFormatToAll} style={{ width: '100%', marginTop: 6, padding: '6px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>↪ Appliquer ce format aux {project.labels.length} étiquettes</button>}
                </Field>
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: 12, marginTop: 6 }}><SectionTitle>Contenu</SectionTitle><ContentForm l={current} set={setData} /></div>
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: 12 }}><SectionTitle>Couleurs</SectionTitle><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><ColorRow label="Cercle / accent" value={current.accent} onChange={setAccent} /><ColorRow label="Fond" value={current.bg} onChange={setBg} /></div></div>
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: 12 }}>
                  <SectionTitle>Blocs présents</SectionTitle>
                  {hiddenCount > 0 && <button onClick={restoreHidden} style={{ width: '100%', padding: '7px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>↺ Réafficher {hiddenCount} bloc{hiddenCount > 1 ? 's' : ''} masqué{hiddenCount > 1 ? 's' : ''}</button>}
                  {(() => {
                    const blocks = resolveEls(current, seedOpts).filter(e => !e.hidden && (e.kind === 'text' || e.kind === 'pill' || e.kind === 'image' || (e.kind === 'box' && e.removable)));
                    return <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
                      <label style={lbl}>Tous les blocs ({blocks.length})</label>
                      {blocks.map(e => {
                        const on = selEl === e.id;
                        const name = e.kind === 'image' ? '🖼 image / logo' : (e.kind === 'box' ? (e.shape === 'circle' ? '⚫ rond' : (e.h != null && e.h < 3 ? '➖ ligne' : '⬛ forme')) : (e.text?.trim() ? e.text.slice(0, 26) : '(vide)'));
                        return <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: on ? '#16a34a22' : '#1e293b', border: `1px solid ${on ? '#16a34a' : '#334155'}`, borderRadius: 6, padding: '5px 8px' }}>
                          <button onClick={() => pickEl(e.id)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', color: on ? '#f8fafc' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontFamily: SYS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</button>
                          <button onClick={() => delEl(e.id)} title="Supprimer ce bloc" style={{ flexShrink: 0, width: 24, height: 24, background: '#7f1d1d', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 13, fontWeight: 800, lineHeight: 1 }}>🗑</button>
                        </div>;
                      })}
                    </div>;
                  })()}
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 8, lineHeight: 1.5 }}>✍️ <strong style={{ color: '#cbd5e1' }}>Double-cliquez un bloc sur l&apos;étiquette pour écrire dedans</strong> (Entrée = valider, Échap = annuler). Cliquez un bloc dans la liste pour le sélectionner, 🗑 pour le retirer.</div>
                </div>
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: 12 }}>
                  <SectionTitle>Logo marque & pictos</SectionTitle>
                  <label style={{ ...inp, cursor: 'pointer', textAlign: 'center', display: 'block', marginBottom: 10 }}>⬆ Logo de marque / labo<input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadBrandLogo(e.target.files[0])} /></label>
                  <LogoLibrary logos={logos} onSave={onSaveLogo} onDelete={onDeleteLogo} onPick={addBrandLogoSrc} />
                  <Field label="Pastille % personnalisée">
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input inputMode="numeric" value={pctBadge} onChange={e => setPctBadge(e.target.value.replace(/[^\d]/g, ''))} placeholder="20" style={{ ...inp, width: 64 }} />
                      <span style={{ color: '#64748b', fontSize: 13 }}>%</span>
                      <button onClick={() => pctBadge && addBadge(`-${pctBadge}%`, '#dc2626')} style={{ flex: 1, padding: '7px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontWeight: 800 }}>＋ Ajouter −{pctBadge || '…'}%</button>
                    </div>
                  </Field>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{BADGES.map(b => <button key={b.t} onClick={() => addBadge(b.t, b.bg)} style={{ padding: '4px 8px', background: b.bg, color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 9.5, fontWeight: 800 }}>{b.t}</button>)}</div>
                </div>
                {currentEl && <div style={{ borderTop: '1px solid #1e293b', paddingTop: 12, marginTop: 4 }}><SectionTitle>✦ Élément : {currentEl.kind === 'image' ? 'logo / image' : (currentEl.text ? `« ${currentEl.text.slice(0, 18)} »` : currentEl.kind)}</SectionTitle><ElementEditor el={currentEl} patch={patchEl} /><button onClick={() => delEl(currentEl.id)} style={{ width: '100%', padding: '8px', marginTop: 8, background: '#7f1d1d', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>🗑 Supprimer ce bloc</button></div>}
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: 12, marginTop: 6 }}>
                  <Field label={`Ordre d'impression — position ${labelIndex + 1} / ${project.labels.length}`}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => moveLabel(-1)} disabled={labelIndex <= 0} style={{ flex: 1, padding: '7px', background: '#1e293b', color: labelIndex <= 0 ? '#475569' : '#cbd5e1', border: '1px solid #334155', borderRadius: 6, cursor: labelIndex <= 0 ? 'default' : 'pointer', fontSize: 12, fontWeight: 700 }}>◀ Avancer</button>
                      <button onClick={() => moveLabel(1)} disabled={labelIndex < 0 || labelIndex >= project.labels.length - 1} style={{ flex: 1, padding: '7px', background: '#1e293b', color: labelIndex >= project.labels.length - 1 ? '#475569' : '#cbd5e1', border: '1px solid #334155', borderRadius: 6, cursor: labelIndex >= project.labels.length - 1 ? 'default' : 'pointer', fontSize: 12, fontWeight: 700 }}>Reculer ▶</button>
                    </div>
                  </Field>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={duplicateLabel} style={{ flex: 1, padding: '8px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>⧉ Dupliquer</button>
                    <button onClick={deleteLabel} style={{ flex: 1, padding: '8px', background: '#7f1d1d', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>🗑 Supprimer</button>
                  </div>
                </div>
              </>
            )}
          </div>
          <div style={{ padding: '8px 18px', borderTop: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: mode === 'server' ? '#22c55e' : '#f59e0b' }} />
            <span style={{ fontSize: 10, color: '#475569' }}>{mode === 'server' ? "Bibliothèque d'équipe (cloud)" : 'Local (backend non configuré)'}</span>
          </div>
        </aside>
      </div>

      {isMobile && !panelOpen && (
        <button onClick={() => setPanelOpen(true)} style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 50, padding: '12px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 999, cursor: 'pointer', fontSize: 14, fontWeight: 800, boxShadow: '0 6px 20px rgba(22,163,74,0.5)' }}>
          {selLabel ? '✏️ Éditer l’étiquette' : '⚙️ Réglages'}
        </button>
      )}

      {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={(labels) => { setProject(p => ({ ...p, labels: [...p.labels, ...labels] })); setShowImport(false); }} />}
      {showPreview && <PrintPreviewModal project={project} setProject={setProject} onClose={() => setShowPreview(false)} />}

      <style>{`input[type=range] { accent-color: #16a34a; }`}</style>
    </div>

    <div id="print-root" style={{ display: 'none' }}>
      <PrintSheet project={project} />
    </div>
    <style>{`@media print { @page { size: ${(PAPERS[project.printPaper || 'A4'] || PAPERS.A4).name}; margin: 0; } html, body { background: #fff !important; } #app { display: none !important; } #print-root { display: block !important; } }`}</style>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────
//  APERÇU IMPRESSION (+ choix papier & marge)
// ──────────────────────────────────────────────────────────────────────

function PrintPreviewModal({ project, setProject, onClose }: { project: Project; setProject: (fn: (p: Project) => Project) => void; onClose: () => void }) {
  const plan = printPlan(project);
  const pageWpx = plan.paper.w * MM, pageHpx = plan.paper.h * MM;
  const s = Math.min(0.62, 470 / pageWpx);
  const totalH = plan.pages.length * pageHpx + (plan.pages.length - 1) * 14;
  // Export PDF : on passe par l'impression navigateur (PDF vectoriel, net) en
  // pré-remplissant un nom de fichier propre. Respecte le papier + la marge choisis.
  const exportPDF = () => {
    const clean = (txt: string) => (txt || '').replace(/[^\p{L}\p{N}\-_ ]/gu, '').trim().replace(/\s+/g, '-');
    const name = ['Promo', clean(project.pharmacy) || 'planche', clean(project.plan), new Date().toISOString().slice(0, 10)].filter(Boolean).join('_');
    const prev = document.title;
    const restore = () => { document.title = prev; window.removeEventListener('afterprint', restore); };
    window.addEventListener('afterprint', restore);
    document.title = name;
    window.print();
  };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.75)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SYS, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 620, maxWidth: '95vw', maxHeight: '92vh', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 20, color: '#e2e8f0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Aperçu impression</div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ flex: '1 1 120px' }}>
            <label style={lbl}>Papier</label>
            <select value={project.printPaper || 'A4'} onChange={e => setProject(p => ({ ...p, printPaper: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
              {Object.entries(PAPERS).map(([id, p]) => <option key={id} value={id}>{p.name} ({p.w}×{p.h} mm)</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label style={lbl}>Marge : {project.printMarginMm ?? 0} mm</label>
            <input type="range" min={0} max={15} step={1} value={project.printMarginMm ?? 0} onChange={e => setProject(p => ({ ...p, printMarginMm: parseInt(e.target.value) }))} style={{ width: '100%' }} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
          {project.labels.length} étiquette{project.labels.length > 1 ? 's' : ''} · <strong style={{ color: '#cbd5e1' }}>{plan.perPage}</strong> / feuille ({plan.cols}×{plan.rows}) · <strong style={{ color: '#cbd5e1' }}>{plan.pages.length}</strong> feuille{plan.pages.length > 1 ? 's' : ''} {plan.paper.name}
        </div>
        <div style={{ flex: 1, overflow: 'auto', background: '#334155', borderRadius: 8, padding: 14, minHeight: 200 }}>
          <div style={{ height: totalH * s, width: pageWpx * s, margin: '0 auto', position: 'relative' }}>
            <div style={{ transform: `scale(${s})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
              <PrintSheet project={project} screen />
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 12 }}>💡 Pour le PDF à envoyer par mail : cliquez <strong style={{ color: '#cbd5e1' }}>Exporter en PDF</strong>, puis choisissez <strong style={{ color: '#cbd5e1' }}>« Enregistrer au format PDF »</strong> comme imprimante. La marge choisie est conservée.</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 16px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Fermer</button>
          <button onClick={exportPDF} style={{ padding: '9px 20px', background: '#0e7a4d', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 800 }}>⤓ Exporter en PDF</button>
          <button onClick={() => window.print()} style={{ padding: '9px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 800 }}>🖨 Imprimer</button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
//  BIBLIOTHÈQUE + LOGIN + ORCHESTRATION
// ──────────────────────────────────────────────────────────────────────

function Library({ metas, mode, onOpen, onNew, onDelete, onRename, onDuplicate, onDeleteMany, trash, onRestore, onPurge, onEmptyTrash, onExport, onImport, onLogout }: { metas: Meta[]; mode: 'server' | 'local'; onOpen: (id: string) => void; onNew: () => void; onDelete: (id: string) => void; onRename: (id: string, pharmacy: string, plan: string) => void; onDuplicate: (id: string) => void; onDeleteMany: (ids: string[]) => void; trash: TrashItem[]; onRestore: (t: TrashItem) => void; onPurge: (id: string) => void; onEmptyTrash: () => void; onExport: () => void; onImport: (file: File) => void; onLogout: () => void; }) {
  const [showTrash, setShowTrash] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftPlan, setDraftPlan] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const toggleSel = (id: string) => setSel(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const deleteSelected = () => { if (sel.size && confirm(`Supprimer ${sel.size} planche${sel.size > 1 ? 's' : ''} ?`)) { onDeleteMany([...sel]); setSel(new Set()); } };
  const startEdit = (m: Meta) => { setEditId(m.id); setDraftName(m.pharmacy); setDraftPlan(m.plan); };
  const commit = () => { if (editId) onRename(editId, draftName.trim() || 'Sans nom', draftPlan.trim()); setEditId(null); };
  const cardInp: CSSProperties = { width: '100%', padding: '6px 7px', background: '#1e293b', color: '#e2e8f0', border: '1px solid #16a34a', borderRadius: 5, fontSize: 13, boxSizing: 'border-box', fontFamily: SYS, marginBottom: 6 };
  return (
    <div style={{ minHeight: '100vh', background: '#0b1220', fontFamily: SYS, color: '#e2e8f0' }}>
      <div style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#16a34a,#15803d)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 18, flexShrink: 0 }}>✚</div>
        <div><div style={{ fontSize: 16, fontWeight: 800 }}>PharmaPROMO <span style={{ color: '#16a34a' }}>Studio</span></div><div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.06em' }}>BIBLIOTHÈQUE D&apos;ÉQUIPE</div></div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ fontSize: 11, color: mode === 'server' ? '#4ade80' : '#f59e0b' }}>● {mode === 'server' ? 'Cloud partagé' : 'Local'}</span>{mode === 'server' && <button onClick={onLogout} style={{ padding: '6px 12px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Déconnexion</button>}</div>
      </div>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, gap: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, marginRight: 'auto' }}>Planches promotionnelles</h1>
          <button onClick={onExport} disabled={!metas.length} title="Télécharger une sauvegarde (.json) de toutes vos planches" style={{ padding: '10px 14px', background: '#1e293b', color: metas.length ? '#cbd5e1' : '#475569', border: '1px solid #334155', borderRadius: 8, cursor: metas.length ? 'pointer' : 'default', fontSize: 13, fontWeight: 700 }}>⬇ Sauvegarder</button>
          <label title="Restaurer des planches depuis un fichier de sauvegarde (.json)" style={{ padding: '10px 14px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>⬆ Restaurer<input type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) { onImport(e.target.files[0]); e.target.value = ''; } }} /></label>
          {sel.size > 0 && <button onClick={deleteSelected} style={{ padding: '10px 14px', background: '#7f1d1d', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 800 }}>🗑 Supprimer ({sel.size})</button>}
          {sel.size > 0 && <button onClick={() => setSel(new Set())} style={{ padding: '10px 12px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Annuler</button>}
          <button onClick={() => setShowTrash(t => !t)} title="Corbeille (récupérable 30 jours)" style={{ padding: '10px 14px', background: showTrash ? '#7f1d1d' : '#1e293b', color: showTrash ? '#fff' : '#cbd5e1', border: '1px solid #334155', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>🗑 Corbeille{trash.length ? ` (${trash.length})` : ''}</button>
          <button onClick={onNew} style={{ padding: '10px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 800, boxShadow: '0 2px 12px #16a34a55' }}>＋ Nouvelle planche</button>
        </div>
        {showTrash && (
          <div style={{ marginBottom: 20, padding: 16, background: '#0f172a', border: '1px solid #7f1d1d', borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 10 }}>
              <SectionTitle>Corbeille — {trash.length} planche{trash.length > 1 ? 's' : ''}</SectionTitle>
              {trash.length > 0 && <button onClick={() => { if (confirm('Vider définitivement la corbeille ?')) onEmptyTrash(); }} style={{ marginLeft: 'auto', padding: '6px 12px', background: '#7f1d1d', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Vider la corbeille</button>}
            </div>
            {trash.length === 0 ? <div style={{ fontSize: 12, color: '#64748b' }}>Vide. Les planches supprimées arrivent ici (récupérables 30 jours).</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {trash.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0b1220', border: '1px solid #1e293b', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.project.pharmacy}</div><div style={{ fontSize: 11, color: '#64748b' }}>{t.project.plan} · supprimée le {new Date(t.deletedAt).toLocaleDateString('fr-FR')}</div></div>
                    <button onClick={() => onRestore(t)} style={{ padding: '6px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>↩ Restaurer</button>
                    <button onClick={() => { if (confirm('Supprimer définitivement cette planche ?')) onPurge(t.id); }} title="Supprimer définitivement" style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14 }}>🗑</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {metas.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#475569', border: '2px dashed #1e293b', borderRadius: 12 }}>Aucune planche. Cliquez <strong style={{ color: '#94a3b8' }}>Nouvelle planche</strong> pour démarrer.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 14 }}>
            {metas.map(m => {
              const editing = editId === m.id;
              return (
              <div key={m.id} onClick={() => { if (!editing) onOpen(m.id); }} style={{ position: 'relative', background: '#0f172a', border: `1px solid ${sel.has(m.id) ? '#ef4444' : '#1e293b'}`, borderRadius: 12, padding: 18, cursor: editing ? 'default' : 'pointer' }} onMouseEnter={e => { if (!sel.has(m.id)) e.currentTarget.style.borderColor = '#16a34a'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = sel.has(m.id) ? '#ef4444' : '#1e293b'; }}>
                <label onClick={e => e.stopPropagation()} title="Sélectionner pour suppression" style={{ position: 'absolute', top: 10, left: 10, zIndex: 2, background: '#0f172acc', borderRadius: 5, padding: 3, display: 'flex', cursor: 'pointer' }}><input type="checkbox" checked={sel.has(m.id)} onChange={() => toggleSel(m.id)} /></label>
                <div style={{ height: 80, background: 'linear-gradient(135deg,#FFD400,#F5C800)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, marginBottom: 12 }}>🏷️</div>
                {editing ? (
                  <div onClick={e => e.stopPropagation()}>
                    <input autoFocus value={draftName} onChange={e => setDraftName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') commit(); else if (e.key === 'Escape') setEditId(null); }} placeholder="Nom de la planche" style={cardInp} />
                    <input value={draftPlan} onChange={e => setDraftPlan(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') commit(); else if (e.key === 'Escape') setEditId(null); }} placeholder="Intitulé / période" style={{ ...cardInp, fontSize: 12 }} />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={commit} style={{ flex: 1, padding: '6px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>✓ Enregistrer</button>
                      <button onClick={() => setEditId(null)} style={{ padding: '6px 10px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>✕</button>
                    </div>
                  </div>
                ) : (<>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>{m.pharmacy}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{m.plan}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span style={{ fontSize: 10, color: '#475569' }}>{m.updatedAt ? new Date(m.updatedAt).toLocaleDateString('fr-FR') : ''}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={e => { e.stopPropagation(); startEdit(m); }} title="Renommer" style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>✏️</button>
                      <button onClick={e => { e.stopPropagation(); onDuplicate(m.id); }} title="Dupliquer la planche" style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>⧉</button>
                      <button onClick={e => { e.stopPropagation(); if (confirm('Supprimer cette planche ?')) onDelete(m.id); }} title="Supprimer" style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 13 }}>🗑</button>
                    </div>
                  </div>
                </>)}
              </div>
            );})}
          </div>
        )}
      </div>
    </div>
  );
}

function Login({ onSubmit, error }: { onSubmit: (key: string) => void; error: string }) {
  const [k, setK] = useState('');
  return (
    <div style={{ minHeight: '100vh', background: '#0b1220', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SYS }}>
      <form onSubmit={e => { e.preventDefault(); onSubmit(k); }} style={{ width: 360, maxWidth: '90vw', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 28, color: '#e2e8f0' }}>
        <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg,#16a34a,#15803d)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 24, marginBottom: 16 }}>✚</div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>PharmaPROMO Studio</div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>Entrez le mot de passe d&apos;équipe pour accéder à la bibliothèque partagée.</div>
        <input type="password" value={k} onChange={e => setK(e.target.value)} placeholder="Mot de passe d'équipe" autoFocus style={{ ...inp, marginBottom: 12 }} />
        {error && <div style={{ fontSize: 12, color: '#f87171', marginBottom: 12 }}>{error}</div>}
        <button type="submit" style={{ width: '100%', padding: '11px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 800 }}>Entrer</button>
      </form>
    </div>
  );
}

type View = 'loading' | 'login' | 'library' | 'studio';

// Corbeille locale : planches supprimées récupérables 30 jours (par navigateur).
interface TrashItem { id: string; deletedAt: number; project: Project }
const TRASH_LS = 'pp:trash';
const TRASH_MAX_AGE = 30 * 24 * 3600 * 1000;
const readTrash = (): TrashItem[] => { try { return (JSON.parse(localStorage.getItem(TRASH_LS) || '[]') as TrashItem[]).filter(t => Date.now() - t.deletedAt < TRASH_MAX_AGE); } catch { return []; } };
const writeTrash = (arr: TrashItem[]) => { try { localStorage.setItem(TRASH_LS, JSON.stringify(arr.slice(0, 50))); } catch { /* quota */ } };

export default function Home() {
  const [view, setView] = useState<View>('loading');
  const [trash, setTrash] = useState<TrashItem[]>([]);
  const [mode, setMode] = useState<'server' | 'local'>('local');
  const [store, setStore] = useState<Store>(() => localStore);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [project, setProjectState] = useState<Project | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [saving, setSaving] = useState('Enregistré');
  const [logos, setLogos] = useState<SavedLogo[]>([]);
  const [loginErr, setLoginErr] = useState('');
  const [histVer, setHistVer] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const histTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const past = useRef<Project[]>([]);
  const future = useRef<Project[]>([]);
  const committed = useRef<Project | null>(null);
  const projectRef = useRef<Project | null>(null);

  const refreshList = useCallback(async (s: Store) => { try { setMetas(await s.list()); } catch { /* 401 */ } }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/health', { cache: 'no-store' });
        const h = await r.json();
        if (h.configured) {
          setMode('server'); setStore(() => serverStore);
          if (h.keyRequired && !localStorage.getItem(KEY_LS)) { setView('login'); return; }
          try { setMetas(await serverStore.list()); setView('library'); } catch { setView('login'); }
        } else { setMode('local'); setStore(() => localStore); setMetas(await localStore.list()); setView('library'); }
      } catch { setMode('local'); setStore(() => localStore); setMetas(await localStore.list()); setView('library'); }
    })();
  }, []);

  const doLogin = async (key: string) => { localStorage.setItem(KEY_LS, key); try { setMetas(await serverStore.list()); setLoginErr(''); setView('library'); } catch { localStorage.removeItem(KEY_LS); setLoginErr('Mot de passe incorrect.'); } };
  const logout = () => { localStorage.removeItem(KEY_LS); setView('login'); };
  const openPlanche = async (id: string) => { const p = await store.get(id); if (p) { const mp = migrate(p); setProjectState(mp); projectRef.current = mp; committed.current = mp; past.current = []; future.current = []; setHistVer(v => v + 1); setCurrentId(id); setSaving('Enregistré'); setView('studio'); } };
  const newPlanche = async () => { const id = await store.create(defaultProject()); await openPlanche(id); refreshList(store); };
  // Suppression = mise à la corbeille (récupérable) puis retrait du store.
  const trashPlanches = async (ids: string[]) => {
    const items: TrashItem[] = [];
    for (const id of ids) { const p = await store.get(id); if (p) items.push({ id, deletedAt: Date.now(), project: p }); await store.remove(id); }
    const next = [...items, ...readTrash().filter(t => !ids.includes(t.id))];
    writeTrash(next); setTrash(next); refreshList(store);
  };
  const deletePlanche = (id: string) => trashPlanches([id]);
  const deleteManyPlanches = (ids: string[]) => trashPlanches(ids);
  const restorePlanche = async (item: TrashItem) => { await store.create(item.project); const next = readTrash().filter(t => t.id !== item.id); writeTrash(next); setTrash(next); refreshList(store); };
  const purgeTrash = (id: string) => { const next = readTrash().filter(t => t.id !== id); writeTrash(next); setTrash(next); };
  const emptyTrash = () => { writeTrash([]); setTrash([]); };
  const renamePlanche = async (id: string, pharmacy: string, plan: string) => { const p = await store.get(id); if (!p) return; await store.save(id, { ...p, pharmacy, plan }); refreshList(store); };
  const duplicatePlanche = async (id: string) => { const p = await store.get(id); if (!p) return; await store.create({ ...p, pharmacy: `${p.pharmacy} (copie)` }); refreshList(store); };

  // Bibliothèque de logos (cloud si configuré, sinon local)
  const logoStore = mode === 'server' ? serverLogos : localLogos;
  const refreshLogos = useCallback(async () => { try { setLogos(await (mode === 'server' ? serverLogos : localLogos).list()); } catch { /* 401 */ } }, [mode]);
  useEffect(() => { if (view === 'library' || view === 'studio') refreshLogos(); }, [view, refreshLogos]);
  useEffect(() => { setTrash(readTrash()); }, [view]);
  const saveLogo = async (name: string, src: string) => { try { setLogos(await logoStore.add(name, src)); } catch { /* ignore */ } };
  const deleteLogo = async (id: string) => { try { setLogos(await logoStore.remove(id)); } catch { /* ignore */ } };

  // Sauvegarde : télécharge toutes les planches en un seul fichier JSON.
  const exportAll = async () => {
    const planches = (await Promise.all(metas.map(m => store.get(m.id)))).filter(Boolean);
    const data = { app: 'pharmapromo', version: 1, exportedAt: Date.now(), planches };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `pharmapromo-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };
  // Restauration : recrée les planches d'un fichier de sauvegarde (sans écraser l'existant).
  const importBackup = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      const planches: unknown[] = Array.isArray(data) ? data : (data?.planches ?? []);
      if (!Array.isArray(planches) || !planches.length) { alert('Fichier de sauvegarde invalide ou vide.'); return; }
      let n = 0;
      for (const p of planches) { if (p && typeof p === 'object') { await store.create(migrate(p as Project)); n++; } }
      await refreshList(store);
      alert(`${n} planche(s) restaurée(s).`);
    } catch { alert('Lecture impossible : fichier de sauvegarde invalide.'); }
  };
  const backToLibrary = async () => { if (saveTimer.current) { clearTimeout(saveTimer.current); if (currentId && projectRef.current) await store.save(currentId, projectRef.current); } setView('library'); setCurrentId(null); setProjectState(null); refreshList(store); };

  const setProject = useCallback((fn: (p: Project) => Project) => {
    setProjectState(prev => {
      if (!prev) return prev;
      const next = fn(prev);
      projectRef.current = next;
      setSaving('Enregistrement…');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => { if (currentId) { await store.save(currentId, next); setSaving('Enregistré'); } }, 700);
      // capture historique (regroupé après 500ms d'inactivité)
      if (histTimer.current) clearTimeout(histTimer.current);
      histTimer.current = setTimeout(() => {
        if (committed.current && JSON.stringify(committed.current) !== JSON.stringify(next)) {
          past.current.push(committed.current);
          if (past.current.length > 60) past.current.shift();
          committed.current = next; future.current = [];
          setHistVer(v => v + 1);
        }
      }, 500);
      return next;
    });
  }, [currentId, store]);

  const applyHistory = useCallback((target: Project) => {
    projectRef.current = target; committed.current = target; setProjectState(target); setHistVer(v => v + 1);
    setSaving('Enregistrement…');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => { if (currentId) { await store.save(currentId, target); setSaving('Enregistré'); } }, 400);
  }, [currentId, store]);

  const undo = useCallback(() => {
    if (!past.current.length || !projectRef.current) return;
    future.current.push(projectRef.current);
    applyHistory(past.current.pop()!);
  }, [applyHistory]);
  const redo = useCallback(() => {
    if (!future.current.length || !projectRef.current) return;
    past.current.push(projectRef.current);
    applyHistory(future.current.pop()!);
  }, [applyHistory]);

  void histVer; // force le recalcul de canUndo/canRedo
  if (view === 'loading') return <div style={{ minHeight: '100vh', background: '#0b1220', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontFamily: SYS }}>Chargement…</div>;
  if (view === 'login') return <Login onSubmit={doLogin} error={loginErr} />;
  if (view === 'studio' && project) return <Studio project={project} setProject={setProject} onBack={backToLibrary} saving={saving} mode={mode} undo={undo} redo={redo} canUndo={past.current.length > 0} canRedo={future.current.length > 0} logos={logos} onSaveLogo={saveLogo} onDeleteLogo={deleteLogo} />;
  return <Library metas={metas} mode={mode} onOpen={openPlanche} onNew={newPlanche} onDelete={deletePlanche} onRename={renamePlanche} onDuplicate={duplicatePlanche} onDeleteMany={deleteManyPlanches} trash={trash} onRestore={restorePlanche} onPurge={purgeTrash} onEmptyTrash={emptyTrash} onExport={exportAll} onImport={importBackup} onLogout={logout} />;
}
