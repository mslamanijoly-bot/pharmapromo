'use client';
import { useState, useEffect, useRef, useCallback, CSSProperties } from 'react';
import { MM, pf, ff, fitSize, priceParts, parseTable, paginate, chunk } from '@/lib/calc';

/* ════════════════════════════════════════════════════════════════════
   PHARMAPROMO STUDIO
   DA premium « Homme de Fer affiné » · disposition orientée (portrait / réglette)
   Formats en mm · remise immédiate auto · période de dates · mentions + logo
   Bibliothèque d'équipe (backend Vercel KV) + repli local
   ════════════════════════════════════════════════════════════════════ */

// ──────────────────────────────────────────────────────────────────────
//  MODÈLE
// ──────────────────────────────────────────────────────────────────────

type PromoType = 'prix-promo' | 'bon-reduction' | 'remise-lot' | 'multi-achat';
type Align = 'left' | 'center' | 'right';
type ElKind = 'text' | 'pill' | 'box' | 'image';

interface El {
  id: string; kind: ElKind; text?: string; src?: string;
  x: number; y: number; w?: number; h?: number;
  size: number; font: string; color: string; bg?: string;
  weight: number; align: Align; rot: number;
  strike?: boolean; radius?: number; shape?: 'circle'; shadow?: boolean; border?: string;
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

interface Label { id: string; type: PromoType; accent: string; bg: string; data: LabelData; overrides: Record<string, Partial<El>>; extra: El[]; }

interface Project {
  pharmacy: string; plan: string; logo: string | null; disclaimer: string;
  pageFormat: string; labelWmm: number; labelHmm: number;
  printPaper?: string; printMarginMm?: number; theme?: string;
  labels: Label[]; updatedAt?: number;
}

const PAPERS: Record<string, { name: string; w: number; h: number }> = {
  A4: { name: 'A4', w: 210, h: 297 },
  A5: { name: 'A5', w: 148, h: 210 },
  A3: { name: 'A3', w: 297, h: 420 },
};

interface Meta { id: string; pharmacy: string; plan: string; updatedAt: number; }
interface SeedOpts { landscape: boolean; logo?: string | null; disclaimer?: string; editing?: boolean; small?: boolean; aspect?: number; theme?: string; }

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

const TYPES: { id: PromoType; label: string; icon: string; color: string }[] = [
  { id: 'prix-promo',    label: 'Prix Promo',       icon: '🏷️', color: '#D81E27' },
  { id: 'bon-reduction', label: 'Bon de Réduction', icon: '✂️', color: '#15803d' },
  { id: 'remise-lot',    label: 'Remise Lot',       icon: '📦', color: '#c2410c' },
  { id: 'multi-achat',   label: 'Multi-Achat',      icon: '📊', color: '#6d28d9' },
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

const PAGE_FORMATS = [
  { id: 'fit', name: '1 / page', w: 0, h: 0 },
  { id: 'A4', name: 'A4', w: 210, h: 297 },
  { id: 'A5', name: 'A5', w: 148, h: 210 },
  { id: 'A3', name: 'A3', w: 297, h: 420 },
  { id: 'roll', name: 'Rouleau', w: 0, h: 0 },
];

const LABEL_PRESETS = [
  { name: 'A4 portrait — 210×297', w: 210, h: 297 },
  { name: 'Réglette — 200×80', w: 200, h: 80 },
  { name: 'Vitrine — 105×150', w: 105, h: 150 },
  { name: 'Rayon — 63×72', w: 63, h: 72 },
  { name: 'Petite — 48×45', w: 48, h: 45 },
];

const MARGIN_MM = 0, HEADER_MM = 0, GAP_MM = 3;

const SYS = FONTS[0].css;
const DISCLAIMER = '*Non cumulable avec d’autres promotions en cours et dans la limite des stocks disponibles.';
const uid = () => Math.random().toString(36).slice(2, 9);

const newData = (): LabelData => ({
  category: 'COMPLÉMENT ALIMENTAIRE', product: 'Nom du produit', qtyLabel: '',
  normalPrice: '31,90', promoPrice: '26,90',
  remiseType: 'euro', remiseManual: '',
  couponValue: '2,00', couponExpiry: '31/12/2026',
  lotQty: '3', lotFree: '1', lotPrice: '19,98', unitPrice: '9,99',
  t1q: '1', t1p: '9,90', t2q: '2', t2p: '8,50', t3q: '3', t3p: '7,90',
  dateStart: '', dateEnd: '',
});

function newLabel(type: PromoType = 'prix-promo', data?: Partial<LabelData>): Label {
  return { id: uid(), type, accent: DA.red, bg: DA.bg, data: { ...newData(), ...data }, overrides: {}, extra: [] };
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
  // thèmes premium retirés : tout repasse en « promo »
  q.theme = 'promo';
  q.labels = (q.labels || []).map(l => ({ ...l, data: { ...newData(), ...l.data } }));
  return q;
}

// ──────────────────────────────────────────────────────────────────────
//  ÉLÉMENTS PAR TYPE (DA premium, orientée)
// ──────────────────────────────────────────────────────────────────────

const B = { font: SYS, rot: 0 };

function dateText(d: LabelData): string | null {
  const { dateStart: s, dateEnd: e } = d;
  if (s && e) return `Offre valable du ${s} au ${e}`;
  if (s) return `Offre valable dès le ${s}`;
  if (e) return `Offre valable jusqu'au ${e}`;
  return null;
}

// pieds (date, mentions, logo) — positions portrait / réglette
function footEls(l: Label, o: SeedOpts): El[] {
  const out: El[] = [];
  const dt = dateText(l.data);
  // coordonnées de la zone logo + pied selon orientation
  const lx = o.landscape ? 88 : 6, ly = o.landscape ? 80 : 84, lw = o.landscape ? 10 : 17, lh = o.landscape ? 16 : 9;
  if (!o.small) {
    if (o.landscape) {
      if (dt) out.push({ ...B, id: 'date', kind: 'text', text: dt, x: 3, y: 82, w: 55, size: 0.06, color: DA.band, weight: 700, align: 'left' });
      if (o.disclaimer) out.push({ ...B, id: 'disc', kind: 'text', text: o.disclaimer, x: 3, y: 91, w: 60, size: 0.048, color: DA.ink, weight: 500, align: 'left' });
    } else {
      if (dt) out.push({ ...B, id: 'date', kind: 'text', text: dt, x: 26, y: 87.5, w: 58, size: 0.019, color: DA.band, weight: 700, align: 'left' });
      if (o.disclaimer) out.push({ ...B, id: 'disc', kind: 'text', text: o.disclaimer, x: 26, y: 92, w: 60, size: 0.016, color: DA.ink, weight: 500, align: 'left' });
    }
  }
  // EMPLACEMENT LOGO (image si dispo, sinon placeholder visible en édition)
  if (o.logo) out.push({ ...B, id: 'plogo', kind: 'image', src: o.logo, x: lx, y: ly, w: lw, size: 0, color: '#000', weight: 400, align: 'left' });
  else if (o.editing) {
    out.push({ ...B, id: 'logoBox', kind: 'box', x: lx, y: ly, w: lw, h: lh, bg: 'transparent', border: '1.5px dashed rgba(0,0,0,0.28)', radius: 6, size: 0, color: '#000', weight: 400, align: 'left' });
    out.push({ ...B, id: 'logoTxt', kind: 'text', text: '📷 LOGO', x: lx, y: ly + lh * 0.32, w: lw, size: o.landscape ? 0.07 : 0.02, color: 'rgba(0,0,0,0.4)', weight: 700, align: 'center' });
  }
  return out;
}

function seedEls(l: Label, o: SeedOpts): El[] {
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
        { ...B, id: 'product', kind: 'text', text: d.product, x: 3, y: 51, w: 55, size: fitSize(d.product, 0.55, asp, 0.082, 2, 0.045), color: '#21392B', weight: 800, align: 'left' },
        ...(d.qtyLabel ? [{ ...B, id: 'qty', kind: 'text' as ElKind, text: d.qtyLabel, x: 3, y: 71, w: 55, size: 0.058, color: DA.green, weight: 600, align: 'left' as Align }] : []),
        { ...B, id: 'circle', kind: 'box', shape: 'circle', x: 60, y: 2, w: 42, bg: circleBg, size: 0, color: a, weight: 400, align: 'left', shadow: true },
        ...(normal > 0 ? [{ ...B, id: 'old', kind: 'text' as ElKind, text: `${d.normalPrice}€`, x: 61, y: 9, w: 38, size: 0.09, color: '#fff', weight: 700, align: 'center' as Align, strike: true }] : []),
        { ...B, id: 'priceInt', kind: 'text', text: intp, x: 66, y: 18, size: 0.42, color: DA.priceY, weight: 900, align: 'left' },
        { ...B, id: 'euro', kind: 'text', text: '€', x: 85, y: 20.5, size: 0.135, color: DA.priceY, weight: 900, align: 'left' },
        { ...B, id: 'cents', kind: 'text', text: cents, x: 85, y: 37, size: 0.15, color: DA.priceY, weight: 900, align: 'left' },
        ...(remiseTxt ? [
          { ...B, id: 'pdiv', kind: 'box' as ElKind, x: 64, y: 61, w: 30, h: 1.2, bg: '#ffffffcc', size: 0, color: '#fff', weight: 400, align: 'left' as Align },
          { ...B, id: 'remiseBig', kind: 'text' as ElKind, text: remiseTxt, x: 64, y: 63.5, size: 0.12, color: '#fff', weight: 900, align: 'left' as Align },
          { ...B, id: 'remiseSmall', kind: 'text' as ElKind, text: 'DE REMISE IMMÉDIATE', x: 77, y: 64.5, w: 21, size: 0.048, color: '#fff', weight: 800, align: 'left' as Align },
        ] : []),
        ...footEls(l, o),
      ];
    }
    // PORTRAIT — bandeau, cercle prix, produit, descriptif
    return [
      { ...B, id: 'band', kind: 'box', x: 0, y: 0, w: 100, h: 7, bg: DA.band, size: 0, color: '#fff', weight: 400, align: 'left' },
      { ...B, id: 'cat', kind: 'text', text: d.category, x: 0, y: 1.7, w: 100, size: fitSize(d.category, 0.96, asp, 0.027, 1, 0.016), color: '#fff', weight: 800, align: 'center' },
      { ...B, id: 'circle', kind: 'box', shape: 'circle', x: 19, y: 9, w: 62, bg: circleBg, size: 0, color: a, weight: 400, align: 'left', shadow: true },
      ...(normal > 0 ? [{ ...B, id: 'old', kind: 'text' as ElKind, text: `${d.normalPrice}€`, x: 31, y: 14, w: 38, size: 0.027, color: '#fff', weight: 700, align: 'center' as Align, strike: true }] : []),
      { ...B, id: 'priceInt', kind: 'text', text: intp, x: 27, y: 17, size: 0.175, color: DA.priceY, weight: 900, align: 'left' },
      { ...B, id: 'euro', kind: 'text', text: '€', x: 60, y: 18.5, size: 0.052, color: DA.priceY, weight: 900, align: 'left' },
      { ...B, id: 'cents', kind: 'text', text: cents, x: 60, y: 27, size: 0.062, color: DA.priceY, weight: 900, align: 'left' },
      ...(remiseTxt ? [
        { ...B, id: 'pdiv', kind: 'box' as ElKind, x: 31, y: 41, w: 38, h: 0.5, bg: '#ffffffcc', size: 0, color: '#fff', weight: 400, align: 'left' as Align },
        { ...B, id: 'remiseBig', kind: 'text' as ElKind, text: remiseTxt, x: 31, y: 43, size: 0.05, color: '#fff', weight: 900, align: 'left' as Align },
        { ...B, id: 'remiseSmall', kind: 'text' as ElKind, text: 'DE REMISE IMMÉDIATE', x: 45, y: 43.5, w: 26, size: 0.021, color: '#fff', weight: 800, align: 'left' as Align },
      ] : []),
      { ...B, id: 'product', kind: 'text', text: d.product, x: 6, y: 56, w: 88, size: fitSize(d.product, 0.88, asp, 0.052, 2, 0.03), color: '#21392B', weight: 800, align: 'center' },
      ...(d.qtyLabel ? [{ ...B, id: 'qty', kind: 'text' as ElKind, text: d.qtyLabel, x: 6, y: 70, w: 88, size: fitSize(d.qtyLabel, 0.88, asp, 0.037, 1, 0.024), color: DA.green, weight: 600, align: 'center' as Align }] : []),
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
      { ...B, id: 'circle', kind: 'box', shape: 'circle', x: 22, y: 11, w: 56, bg: circleBg, size: 0, color: a, weight: 400, align: 'left', shadow: true },
      { ...B, id: 'btag', kind: 'text', text: 'BON DE RÉDUCTION', x: 24, y: 17, w: 52, size: 0.028, color: '#fff', weight: 800, align: 'center' },
      { ...B, id: 'priceInt', kind: 'text', text: pf(d.couponValue).toString().split('.')[0] || '0', x: 30, y: 22, size: 0.16, color: DA.priceY, weight: 900, align: 'left' },
      { ...B, id: 'euro', kind: 'text', text: '€', x: 58, y: 23, size: 0.06, color: DA.priceY, weight: 900, align: 'left' },
      { ...B, id: 'product', kind: 'text', text: d.product, x: 6, y: 58, w: 88, size: fitSize(d.product, 0.88, asp, 0.052, 2, 0.03), color: '#21392B', weight: 800, align: 'center' },
      { ...B, id: 'exp', kind: 'text', text: `Valable jusqu'au ${d.couponExpiry}`, x: 6, y: 72, w: 88, size: 0.035, color: DA.green, weight: 600, align: 'center' },
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
      { ...B, id: 'product', kind: 'text', text: d.product, x: 6, y: 58, w: 88, size: fitSize(d.product, 0.88, asp, 0.052, 2, 0.03), color: '#21392B', weight: 800, align: 'center' },
      ...(d.qtyLabel ? [{ ...B, id: 'qty', kind: 'text' as ElKind, text: d.qtyLabel, x: 6, y: 72, w: 88, size: 0.037, color: DA.green, weight: 600, align: 'center' as Align }] : []),
    ];
  }

  // ===== MULTI-ACHAT =====
  const cols = [{ q: d.t1q, p: d.t1p }, { q: d.t2q, p: d.t2p }, { q: d.t3q, p: d.t3p }];
  const els: El[] = [
    ...frame,
    { ...B, id: 'mtitle', kind: 'text', text: 'OFFRE MULTI-ACHAT', x: 6, y: 12, w: 88, size: 0.05, color: DA.red, weight: 900, align: 'center' },
    { ...B, id: 'product', kind: 'text', text: d.product, x: 6, y: 20, w: 88, size: fitSize(d.product, 0.88, asp, 0.06, 2, 0.035), color: DA.green, weight: 800, align: 'center' },
  ];
  cols.forEach((c, i) => {
    const cx = 8 + i * 29;
    els.push({ ...B, id: `q${i}`, kind: 'box', x: cx, y: 34, w: 26, h: 8, bg: i === 2 ? DA.red : DA.band, size: 0, color: '#fff', weight: 400, align: 'center', radius: 6 });
    els.push({ ...B, id: `qt${i}`, kind: 'text', text: `${c.q} pce${parseInt(c.q) > 1 ? 's' : ''}`, x: cx, y: 35.5, w: 26, size: 0.03, color: '#fff', weight: 800, align: 'center' });
    els.push({ ...B, id: `p${i}`, kind: 'text', text: `${c.p}€`, x: cx, y: 46, w: 26, size: 0.07, color: DA.red, weight: 900, align: 'center' });
  });
  els.push({ ...B, id: 'mfoot', kind: 'text', text: 'Plus vous achetez, plus vous économisez', x: 6, y: 62, w: 88, size: 0.035, color: DA.green, weight: 600, align: 'center' });
  return els;
}

const FULL: SeedOpts = { landscape: false, logo: 'x', disclaimer: 'x' };
function resolveEls(l: Label, o: SeedOpts): El[] {
  const bound = seedEls(l, o).map(e => ({ ...e, ...l.overrides[e.id] }));
  return [...bound, ...l.extra];
}
function isBound(l: Label, id: string): boolean {
  for (const landscape of [false, true]) {
    if (seedEls(l, { ...FULL, landscape }).some(e => e.id === id)) return true;
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
    letterSpacing: e.track != null ? `${e.track}em` : (e.weight >= 800 ? '0.01em' : undefined),
    fontStyle: e.italic ? 'italic' : undefined,
  };
  if (e.kind === 'box') {
    if (e.shape === 'circle') { st.width = `${e.w}%`; st.aspectRatio = '1 / 1'; st.height = 'auto'; st.borderRadius = '50%'; st.background = e.bg; }
    else { st.height = `${e.h ?? 10}%`; st.background = e.bg; st.borderRadius = e.radius ? `${e.radius}px` : undefined; }
    if (e.border) st.border = e.border;
    // Cercle promo : anneau clair en bordure interne (effet « arc ») + ombre douce, sans reflet.
    if (e.shadow) st.boxShadow = e.shape === 'circle'
      ? 'inset 0 0 0 3px rgba(255,255,255,0.22), 0 8px 22px rgba(0,0,0,0.20)'
      : '0 8px 22px rgba(0,0,0,0.20)';
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

interface DragState { labelId: string; elId: string; offX: number; offY: number; box: HTMLElement; }

function LabelView({ label, W, H, editing, opts, selectedLabel, selectedEl, onSelectLabel, onSelectEl, onDragStart, onDelEl }: {
  label: Label; W: number; H: number; editing: boolean; opts: SeedOpts;
  selectedLabel: boolean; selectedEl: string | null;
  onSelectLabel: () => void; onSelectEl: (id: string) => void;
  onDragStart: (e: React.PointerEvent, labelId: string, elId: string, el: El) => void;
  onDelEl: (id: string) => void;
}) {
  const els = resolveEls(label, opts).filter(e => !e.hidden);
  const bg = label.bg;
  const selColor = label.accent;
  return (
    <div data-labelbox onClick={(ev) => { ev.stopPropagation(); onSelectLabel(); }}
      style={{ position: 'relative', width: W, height: H, background: bg, border: editing ? `1px solid ${selectedLabel ? selColor : 'rgba(0,0,0,0.08)'}` : 'none', borderRadius: editing ? 6 : 0, overflow: 'hidden', cursor: editing ? 'pointer' : 'default', boxShadow: selectedLabel && editing ? `0 0 0 3px ${selColor}44` : 'none', flexShrink: 0, boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: WATERMARK, backgroundSize: `${Math.max(46, W * 0.1)}px ${Math.max(46, W * 0.1)}px`, opacity: 0.7, pointerEvents: 'none' }} />
      {els.map(e => {
        const sel = editing && selectedEl === e.id;
        return (
          <div key={e.id} onPointerDown={(ev) => { if (editing) { ev.stopPropagation(); onSelectEl(e.id); onDragStart(ev, label.id, e.id, e); } }}
            style={{ ...renderEl(e, H), outline: sel ? `1.5px solid ${selColor}` : 'none', outlineOffset: 2, cursor: editing ? 'move' : 'default', userSelect: 'none', touchAction: 'none' }}>
            {e.kind === 'image' ? <img src={e.src} alt="" style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none' }} /> : (e.kind === 'box' ? null : e.text)}
            {sel && e.removable && <button onPointerDown={(ev) => { ev.stopPropagation(); ev.preventDefault(); onDelEl(e.id); }} style={{ position: 'absolute', top: -10, right: -10, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', color: '#fff', border: '2px solid #fff', fontSize: 11, cursor: 'pointer', lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>}
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
//  LAYOUT + PLANCHE
// ──────────────────────────────────────────────────────────────────────

function layout(p: Project) {
  const fmt = PAGE_FORMATS.find(f => f.id === p.pageFormat) || PAGE_FORMATS[0];
  const lw = p.labelWmm * MM, lh = p.labelHmm * MM;
  const m = MARGIN_MM * MM, gap = GAP_MM * MM, header = HEADER_MM * MM;
  let pageWmm: number, pageHmm: number, perRow: number, capacity: number;
  if (fmt.id === 'roll' || fmt.id === 'fit') {
    // page = largeur de l'étiquette, empilage vertical
    pageWmm = p.labelWmm; perRow = 1;
    const n = Math.max(1, p.labels.length);
    pageHmm = n * p.labelHmm + (n - 1) * GAP_MM;
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
  const small = Math.min(p.labelWmm, p.labelHmm) < 80;
  return { fmt, lw, lh, m, gap, header, PW, PH, pageWmm, pageHmm, usableW, perRow, capacity, landscape, small };
}

function Planche({ project, scale, editing, selLabel, selEl, setSelLabel, setSelEl, onAdd, dragStart, delEl, forPrint }: {
  project: Project; scale: number; editing: boolean;
  selLabel: string | null; selEl: string | null;
  setSelLabel: (id: string | null) => void; setSelEl: (id: string | null) => void;
  onAdd: () => void; dragStart: (e: React.PointerEvent, labelId: string, elId: string, el: El) => void;
  delEl: (id: string) => void; forPrint?: boolean;
}) {
  const L = layout(project);
  const opts: SeedOpts = { landscape: L.landscape, logo: project.logo, disclaimer: project.disclaimer, editing: editing && !forPrint, small: L.small, aspect: project.labelWmm / project.labelHmm, theme: project.theme || 'promo' };
  return (
    <div style={{ width: L.PW, height: L.PH, background: '#fff', transform: forPrint ? undefined : `scale(${scale})`, transformOrigin: 'top left', boxShadow: forPrint ? 'none' : '0 10px 40px rgba(0,0,0,0.18)', position: 'relative', flexShrink: 0 }}
      onClick={() => { if (editing) { setSelLabel(null); setSelEl(null); } }}>
      <div style={{ position: 'absolute', top: L.m, left: L.m, width: L.usableW, display: 'flex', flexWrap: 'wrap', gap: L.gap, alignContent: 'flex-start', justifyContent: 'center' }}>
        {project.labels.map(label => (
          <LabelView key={label.id} label={label} W={L.lw} H={L.lh} editing={editing && !forPrint} opts={opts}
            selectedLabel={selLabel === label.id} selectedEl={selLabel === label.id ? selEl : null}
            onSelectLabel={() => setSelLabel(label.id)} onSelectEl={(id) => { setSelLabel(label.id); setSelEl(id); }}
            onDragStart={dragStart} onDelEl={delEl} />
        ))}
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
function printPlan(project: Project) {
  const paper = PAPERS[project.printPaper || 'A4'] || PAPERS.A4;
  const margin = project.printMarginMm ?? 0;
  const gapMm = project.labels.length > 1 ? GAP_MM : 0;
  const { cols, rows, perPage } = paginate(project.labelWmm, project.labelHmm, paper.w, paper.h, margin, gapMm);
  const labels = project.labels.length ? project.labels : [newLabel()];
  const pages = chunk(labels, perPage);
  const tiling = labels.length > 1 || project.labelWmm < paper.w - 2 || project.labelHmm < paper.h - 2;
  return { paper, margin, gapMm, cols, rows, perPage, pages, tiling };
}

function PrintSheet({ project, screen }: { project: Project; screen?: boolean }) {
  const lw = project.labelWmm * MM, lh = project.labelHmm * MM;
  const plan = printPlan(project);
  const opts: SeedOpts = {
    landscape: lw > lh * 1.5, logo: project.logo, disclaimer: project.disclaimer,
    editing: false, small: Math.min(project.labelWmm, project.labelHmm) < 80,
    aspect: project.labelWmm / project.labelHmm, theme: project.theme || 'promo',
  };
  const g = plan.gapMm * MM, m = plan.margin * MM;
  return (
    <>
      {plan.pages.map((page, pi) => (
        <div key={pi} style={{ width: plan.paper.w * MM, height: plan.paper.h * MM, boxSizing: 'border-box', padding: m, background: '#fff', breakAfter: pi < plan.pages.length - 1 ? 'page' : 'auto', pageBreakAfter: pi < plan.pages.length - 1 ? 'always' : 'auto', display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start', gap: g, margin: screen ? '0 auto 14px' : 0, boxShadow: screen ? '0 6px 24px rgba(0,0,0,0.25)' : 'none', overflow: 'hidden' }}>
          {page.map(l => (
            <div key={l.id} style={{ width: lw, height: lh, flexShrink: 0, outline: plan.tiling ? '0.4px dashed rgba(0,0,0,0.35)' : 'none' }}>
              <LabelView label={l} W={lw} H={lh} editing={false} opts={opts} selectedLabel={false} selectedEl={null} onSelectLabel={() => {}} onSelectEl={() => {}} onDragStart={() => {}} onDelEl={() => {}} />
            </div>
          ))}
        </div>
      ))}
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
  else middle = <>{G(<TextInp label="P1 — qté" value={d.t1q} onChange={v => set('t1q', v)} />, <PriceInp label="P1 — prix" value={d.t1p} onChange={v => set('t1p', v)} />)}{G(<TextInp label="P2 — qté" value={d.t2q} onChange={v => set('t2q', v)} />, <PriceInp label="P2 — prix" value={d.t2p} onChange={v => set('t2p', v)} />)}{G(<TextInp label="P3 — qté" value={d.t3q} onChange={v => set('t3q', v)} />, <PriceInp label="P3 — prix" value={d.t3p} onChange={v => set('t3p', v)} />)}</>;
  return <>{cat}{prod}{middle}{qty}{dates}</>;
}

function ElementEditor({ el, patch }: { el: El; patch: (p: Partial<El>) => void }) {
  return (<>
    {(el.kind === 'text' || el.kind === 'pill') && (<>
      <Field label="Texte"><input value={el.text || ''} onChange={e => patch({ text: e.target.value })} style={inp} /></Field>
      <Field label="Police"><select value={el.font} onChange={e => patch({ font: e.target.value })} style={{ ...inp, cursor: 'pointer' }}>{FONTS.map(f => <option key={f.name} value={f.css}>{f.name}</option>)}</select></Field>
      <Slider label="Taille" value={Math.round(el.size * 1000) / 10} min={1} max={55} step={0.5} suffix="%" onChange={v => patch({ size: v / 100 })} />
      <Field label="Graisse"><div style={{ display: 'flex', gap: 5 }}>{[{ v: 400, t: 'Normal' }, { v: 700, t: 'Gras' }, { v: 900, t: 'Extra' }].map(g => <button key={g.v} onClick={() => patch({ weight: g.v })} style={{ flex: 1, padding: '6px', background: el.weight === g.v ? '#16a34a' : '#1e293b', color: el.weight === g.v ? '#fff' : '#94a3b8', border: '1px solid #334155', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: g.v }}>{g.t}</button>)}</div></Field>
      <Field label="Alignement"><div style={{ display: 'flex', gap: 5 }}>{(['left', 'center', 'right'] as Align[]).map(al => <button key={al} onClick={() => patch({ align: al })} style={{ flex: 1, padding: '6px', background: el.align === al ? '#16a34a' : '#1e293b', color: el.align === al ? '#fff' : '#94a3b8', border: '1px solid #334155', borderRadius: 5, cursor: 'pointer', fontSize: 13 }}>{al === 'left' ? '⬅' : al === 'center' ? '↔' : '➡'}</button>)}</div></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><ColorRow label="Couleur texte" value={el.color} onChange={c => patch({ color: c })} />{el.kind === 'pill' && <ColorRow label="Fond pastille" value={el.bg || '#000000'} onChange={c => patch({ bg: c })} />}</div>
    </>)}
    {el.kind === 'box' && <ColorRow label="Couleur" value={typeof el.bg === 'string' && el.bg.startsWith('#') ? el.bg : '#D81E27'} onChange={c => patch({ bg: c })} />}
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
const F_QTY: ImpField = { key: 'qtyLabel', label: 'Descriptif', kw: /descript|quantit|format|conditionn|contenance|lot|g[eé]lul|capsul|comprim/i };
const IMPORT_FIELDS: Record<PromoType, ImpField[]> = {
  'prix-promo': [F_CAT, F_PROD,
    { key: 'normalPrice', label: 'Prix normal €', kw: /normal|barr|public|ancien|avant|initial/i },
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
};

function cellToStr(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'number') return String(v).replace('.', ',');
  if (v instanceof Date) return v.toLocaleDateString('fr-FR');
  return String(v).trim();
}
async function readXlsx(file: File): Promise<string[][]> {
  const mod = await import('read-excel-file/browser');
  const rows = (await mod.default(file)) as unknown as unknown[][];
  return rows.map(r => r.map(cellToStr)).filter(r => r.some(c => c.length));
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
function autoMap(fields: ImpField[], header: string[], hasHeader: boolean): Record<string, number> {
  const used = new Set<number>(); const map: Record<string, number> = {};
  fields.forEach((f, idx) => {
    let col = -1;
    if (hasHeader) col = header.findIndex((h, i) => !used.has(i) && f.kw.test(h));
    if (col < 0) col = (idx < header.length && !used.has(idx)) ? idx : -1;
    if (col >= 0) used.add(col);
    map[f.key] = col;
  });
  return map;
}

function ImportModal({ onClose, onImport }: { onClose: () => void; onImport: (labels: Label[]) => void }) {
  const [type, setType] = useState<PromoType>('prix-promo');
  const [rows, setRows] = useState<string[][]>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const fields = IMPORT_FIELDS[type];
  const ncols = rows.reduce((m, r) => Math.max(m, r.length), 0);

  // (re)calcule le mappage auto à chaque changement de données / type / en-tête
  useEffect(() => {
    if (rows.length) setMapping(autoMap(IMPORT_FIELDS[type], rows[0] || [], hasHeader));
  }, [rows, type, hasHeader]);

  const loadRows = (rws: string[][]) => { setRows(rws); setHasHeader(detectHeader(rws)); setError(rws.length ? '' : 'Aucune donnée détectée.'); };
  const onText = (txt: string) => loadRows(parseTable(txt));
  const onFile = async (f: File) => {
    setFileName(f.name); setError('');
    try { loadRows(/\.xlsx?$/i.test(f.name) ? await readXlsx(f) : parseTable(await readTextSmart(f))); }
    catch (e) { setError('Lecture impossible : ' + (e instanceof Error ? e.message : String(e))); }
  };

  const colLabel = (i: number) => (hasHeader && rows[0]?.[i]?.trim()) ? rows[0][i] : `Colonne ${i + 1}`;
  const body = hasHeader ? rows.slice(1) : rows;
  const build = () => {
    const labels = body.filter(r => (mapping.product >= 0 ? r[mapping.product] : r[0] || '').trim()).map(r => {
      const d: Partial<LabelData> = {};
      fields.forEach(f => { const c = mapping[f.key]; if (c >= 0 && r[c] != null && r[c] !== '') (d as Record<string, string>)[f.key] = r[c]; });
      if (!d.product) d.product = r[0] || 'Produit';
      if (!d.category) d.category = 'PROMOTION';
      return newLabel(type, d);
    });
    if (labels.length) onImport(labels);
  };

  const example = 'Catégorie;Produit;Prix normal;Prix promo;Descriptif\nCOMPLÉMENT ALIMENTAIRE;Chondro-haid Fort ARKOPHARMA;31,90;26,90;Lot de 3 x 60 gélules*';

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SYS, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 640, maxWidth: '95vw', maxHeight: '92vh', overflow: 'auto', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 22, color: '#e2e8f0' }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Importer des produits</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>Fichier <strong>.xlsx</strong> ou <strong>.csv</strong>, ou collez depuis Excel. Accents et colonnes gérés automatiquement — vous pouvez corriger le mappage.</div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ flex: '1 1 200px' }}><label style={lbl}>Type d&apos;étiquette</label><select value={type} onChange={e => setType(e.target.value as PromoType)} style={{ ...inp, cursor: 'pointer' }}>{TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
          <label style={{ ...inp, width: 'auto', cursor: 'pointer', padding: '8px 14px', textAlign: 'center' }}>📁 Choisir un fichier (.xlsx / .csv)
            <input type="file" accept=".xlsx,.xls,.csv,text/csv,text/plain" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
        </div>
        {fileName && <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>📄 {fileName} — {body.length} ligne(s) de données</div>}

        <Field label="…ou coller depuis Excel (Ctrl+V)"><textarea placeholder={example} rows={3} onChange={e => onText(e.target.value)} style={{ ...inp, resize: 'vertical', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5 }} /></Field>

        {error && <Warn>{error}</Warn>}

        {rows.length > 0 && <>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1', marginBottom: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={hasHeader} onChange={e => setHasHeader(e.target.checked)} /> La 1ʳᵉ ligne contient les en-têtes de colonnes
          </label>

          <SectionTitle>Correspondance des colonnes</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {fields.map(f => (
              <div key={f.key}>
                <label style={lbl}>{f.label}</label>
                <select value={mapping[f.key] ?? -1} onChange={e => setMapping(m => ({ ...m, [f.key]: parseInt(e.target.value) }))} style={{ ...inp, cursor: 'pointer' }}>
                  <option value={-1}>(aucune)</option>
                  {Array.from({ length: ncols }).map((_, i) => <option key={i} value={i}>{colLabel(i)}</option>)}
                </select>
              </div>
            ))}
          </div>

          <SectionTitle>Aperçu</SectionTitle>
          <div style={{ overflow: 'auto', border: '1px solid #1e293b', borderRadius: 6, marginBottom: 14 }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
              <tbody>
                {body.slice(0, 4).map((r, ri) => (
                  <tr key={ri}>{Array.from({ length: ncols }).map((_, ci) => {
                    const mapped = fields.find(f => mapping[f.key] === ci);
                    return <td key={ci} style={{ border: '1px solid #1e293b', padding: '4px 7px', whiteSpace: 'nowrap', color: mapped ? '#e2e8f0' : '#64748b', background: mapped ? '#16a34a18' : 'transparent', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r[ci] || ''}</td>;
                  })}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 16px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Annuler</button>
          <button onClick={build} disabled={!body.length} style={{ padding: '9px 20px', background: body.length ? '#16a34a' : '#334155', color: '#fff', border: 'none', borderRadius: 7, cursor: body.length ? 'pointer' : 'default', fontSize: 13, fontWeight: 800 }}>Générer {body.length || ''} étiquette{body.length > 1 ? 's' : ''}</button>
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

// ──────────────────────────────────────────────────────────────────────
//  STUDIO
// ──────────────────────────────────────────────────────────────────────

function useMobile() {
  const [m, setM] = useState(false);
  useEffect(() => { const f = () => setM(window.innerWidth < 820); f(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  return m;
}

function Studio({ project, setProject, onBack, saving, mode, undo, redo, canUndo, canRedo }: { project: Project; setProject: (fn: (p: Project) => Project) => void; onBack: () => void; saving: string; mode: 'server' | 'local'; undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean; }) {
  const [selLabel, setSelLabel] = useState<string | null>(null);
  const [selEl, setSelEl] = useState<string | null>(null);
  const [editing, setEditing] = useState(true);
  const [scale, setScale] = useState(0.6);
  const [showImport, setShowImport] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [pctBadge, setPctBadge] = useState('20');
  const drag = useRef<DragState | null>(null);
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
  const pickEl = (id: string | null) => { setSelEl(id); if (id && isMobile) setPanelOpen(true); };

  // changement de dimensions : si l'orientation bascule, on remet les positions par défaut
  const setSize = (w: number, h: number) => setProject(p => {
    const flip = (p.labelWmm > p.labelHmm * 1.5) !== (w > h * 1.5);
    return { ...p, labelWmm: w, labelHmm: h, labels: flip ? p.labels.map(l => ({ ...l, overrides: {} })) : p.labels };
  });
  const current = project.labels.find(l => l.id === selLabel) || null;
  const seedOpts: SeedOpts = { landscape: L.landscape, logo: project.logo, disclaimer: project.disclaimer, editing: true, small: L.small, aspect: project.labelWmm / project.labelHmm, theme: project.theme || 'promo' };
  const currentEl: El | null = current && selEl ? resolveEls(current, seedOpts).find(e => e.id === selEl) || null : null;
  const overflow = project.labels.length > L.capacity;

  const updateLabel = useCallback((id: string, fn: (l: Label) => Label) => setProject(p => ({ ...p, labels: p.labels.map(l => l.id === id ? fn(l) : l) })), [setProject]);
  const setData = (k: keyof LabelData, v: string) => { if (current) updateLabel(current.id, l => ({ ...l, data: { ...l.data, [k]: v } })); };
  const patchEl = (patch: Partial<El>) => { if (!current || !selEl) return; const id = selEl; updateLabel(current.id, l => isBound(l, id) ? { ...l, overrides: { ...l.overrides, [id]: { ...l.overrides[id], ...patch } } } : { ...l, extra: l.extra.map(e => e.id === id ? { ...e, ...patch } : e) }); };
  const delEl = (id: string) => { if (current) { updateLabel(current.id, l => ({ ...l, extra: l.extra.filter(e => e.id !== id) })); if (selEl === id) setSelEl(null); } };
  const changeType = (t: PromoType) => { if (current) { updateLabel(current.id, l => ({ ...l, type: t, overrides: {} })); setSelEl(null); } };
  const setAccent = (c: string) => { if (current) updateLabel(current.id, l => ({ ...l, accent: c })); };
  const setBg = (c: string) => { if (current) updateLabel(current.id, l => ({ ...l, bg: c })); };
  const addLabel = () => { const t = current?.type || 'prix-promo'; const nl = newLabel(t); setProject(p => ({ ...p, labels: [...p.labels, nl] })); setSelLabel(nl.id); setSelEl(null); };
  const duplicateLabel = () => { if (!current) return; const copy: Label = { ...current, id: uid(), overrides: { ...current.overrides }, extra: current.extra.map(e => ({ ...e })) }; setProject(p => ({ ...p, labels: [...p.labels, copy] })); setSelLabel(copy.id); };
  const deleteLabel = () => { if (!current) return; setProject(p => ({ ...p, labels: p.labels.filter(l => l.id !== current.id) })); setSelLabel(null); setSelEl(null); };
  const addBadge = (t: string, bg: string) => { if (!current) return; const e: El = { id: 'b' + uid(), kind: 'pill', text: t, x: 8, y: 8, size: 0.045, font: SYS, color: '#fff', bg, weight: 900, align: 'center', rot: -8, radius: 6, removable: true }; updateLabel(current.id, l => ({ ...l, extra: [...l.extra, e] })); setSelEl(e.id); };
  const uploadBrandLogo = (file: File) => { if (!current) return; const r = new FileReader(); r.onload = () => { const e: El = { id: 'logo' + uid(), kind: 'image', src: r.result as string, x: 66, y: 6, w: 22, size: 0, font: SYS, color: '#000', weight: 400, align: 'left', rot: 0, removable: true }; updateLabel(current.id, l => ({ ...l, extra: [...l.extra, e] })); setSelEl(e.id); }; r.readAsDataURL(file); };
  const uploadPharmaLogo = (file: File) => { const r = new FileReader(); r.onload = () => setProject(p => ({ ...p, logo: r.result as string })); r.readAsDataURL(file); };

  const dragStart = (ev: React.PointerEvent, labelId: string, elId: string, el: El) => {
    const box = (ev.currentTarget as HTMLElement).closest('[data-labelbox]') as HTMLElement; if (!box) return;
    const r = box.getBoundingClientRect();
    drag.current = { labelId, elId, offX: ((ev.clientX - r.left) / r.width) * 100 - el.x, offY: ((ev.clientY - r.top) / r.height) * 100 - el.y, box };
    (ev.currentTarget as HTMLElement).setPointerCapture?.(ev.pointerId);
  };
  useEffect(() => {
    const move = (ev: PointerEvent) => {
      const ds = drag.current; if (!ds) return; const r = ds.box.getBoundingClientRect();
      const nx = Math.max(-8, Math.min(99, ((ev.clientX - r.left) / r.width) * 100 - ds.offX));
      const ny = Math.max(-8, Math.min(99, ((ev.clientY - r.top) / r.height) * 100 - ds.offY));
      updateLabel(ds.labelId, l => isBound(l, ds.elId) ? { ...l, overrides: { ...l.overrides, [ds.elId]: { ...l.overrides[ds.elId], x: nx, y: ny } } } : { ...l, extra: l.extra.map(e => e.id === ds.elId ? { ...e, x: nx, y: ny } : e) });
    };
    const up = () => { drag.current = null; };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [updateLabel]);

  // Raccourcis Annuler / Refaire (hors champs de saisie)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.ctrlKey || e.metaKey) && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
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
              <button onClick={() => setShowPreview(true)} style={{ padding: '7px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 800, boxShadow: '0 2px 10px #16a34a66' }}>🖨 Imprimer / PDF</button>
            </div>
          </div>
          {overflow && <div style={{ background: '#7c2d12', color: '#fed7aa', fontSize: 12, padding: '6px 16px' }}>⚠ {project.labels.length} étiquettes pour {L.capacity} emplacement(s) — réduisez la taille ou changez de format.</div>}
          <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 8 : 28, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            <div style={{ width: L.PW * scale, height: L.PH * scale, flexShrink: 0 }}>
              <Planche project={project} scale={scale} editing={editing} selLabel={selLabel} selEl={selEl} setSelLabel={pickLabel} setSelEl={pickEl} onAdd={addLabel} dragStart={dragStart} delEl={delEl} />
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
                <Field label="Type de promotion">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>{TYPES.map(t => { const on = current.type === t.id; return <button key={t.id} onClick={() => changeType(t.id)} style={{ padding: '7px 6px', background: on ? `${t.color}22` : '#1e293b', border: `1px solid ${on ? t.color : '#334155'}`, borderRadius: 6, cursor: 'pointer', fontSize: 10.5, fontWeight: 700, color: on ? '#f8fafc' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 5 }}><span>{t.icon}</span>{t.label}</button>; })}</div>
                </Field>
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: 12, marginTop: 6 }}><SectionTitle>Contenu</SectionTitle><ContentForm l={current} set={setData} /></div>
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: 12 }}><SectionTitle>Couleurs</SectionTitle><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><ColorRow label="Cercle / accent" value={current.accent} onChange={setAccent} /><ColorRow label="Fond" value={current.bg} onChange={setBg} /></div></div>
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: 12 }}>
                  <SectionTitle>Logo marque & pictos</SectionTitle>
                  <label style={{ ...inp, cursor: 'pointer', textAlign: 'center', display: 'block', marginBottom: 10 }}>⬆ Logo de marque / labo<input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadBrandLogo(e.target.files[0])} /></label>
                  <Field label="Pastille % personnalisée">
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input inputMode="numeric" value={pctBadge} onChange={e => setPctBadge(e.target.value.replace(/[^\d]/g, ''))} placeholder="20" style={{ ...inp, width: 64 }} />
                      <span style={{ color: '#64748b', fontSize: 13 }}>%</span>
                      <button onClick={() => pctBadge && addBadge(`-${pctBadge}%`, '#dc2626')} style={{ flex: 1, padding: '7px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontWeight: 800 }}>＋ Ajouter −{pctBadge || '…'}%</button>
                    </div>
                  </Field>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{BADGES.map(b => <button key={b.t} onClick={() => addBadge(b.t, b.bg)} style={{ padding: '4px 8px', background: b.bg, color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 9.5, fontWeight: 800 }}>{b.t}</button>)}</div>
                </div>
                {currentEl && <div style={{ borderTop: '1px solid #1e293b', paddingTop: 12, marginTop: 4 }}><SectionTitle>✦ Élément : {currentEl.kind === 'image' ? 'logo / image' : (currentEl.text ? `« ${currentEl.text.slice(0, 18)} »` : currentEl.kind)}</SectionTitle><ElementEditor el={currentEl} patch={patchEl} /></div>}
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: 12, marginTop: 6, display: 'flex', gap: 8 }}>
                  <button onClick={duplicateLabel} style={{ flex: 1, padding: '8px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>⧉ Dupliquer</button>
                  <button onClick={deleteLabel} style={{ flex: 1, padding: '8px', background: '#7f1d1d', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>🗑 Supprimer</button>
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
        <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 16px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Fermer</button>
          <button onClick={() => window.print()} style={{ padding: '9px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 800 }}>🖨 Imprimer maintenant</button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
//  BIBLIOTHÈQUE + LOGIN + ORCHESTRATION
// ──────────────────────────────────────────────────────────────────────

function Library({ metas, mode, onOpen, onNew, onDelete, onLogout }: { metas: Meta[]; mode: 'server' | 'local'; onOpen: (id: string) => void; onNew: () => void; onDelete: (id: string) => void; onLogout: () => void; }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0b1220', fontFamily: SYS, color: '#e2e8f0' }}>
      <div style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#16a34a,#15803d)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 18, flexShrink: 0 }}>✚</div>
        <div><div style={{ fontSize: 16, fontWeight: 800 }}>PharmaPROMO <span style={{ color: '#16a34a' }}>Studio</span></div><div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.06em' }}>BIBLIOTHÈQUE D&apos;ÉQUIPE</div></div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ fontSize: 11, color: mode === 'server' ? '#4ade80' : '#f59e0b' }}>● {mode === 'server' ? 'Cloud partagé' : 'Local'}</span>{mode === 'server' && <button onClick={onLogout} style={{ padding: '6px 12px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Déconnexion</button>}</div>
      </div>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}><h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Planches promotionnelles</h1><button onClick={onNew} style={{ marginLeft: 'auto', padding: '10px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 800, boxShadow: '0 2px 12px #16a34a55' }}>＋ Nouvelle planche</button></div>
        {metas.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#475569', border: '2px dashed #1e293b', borderRadius: 12 }}>Aucune planche. Cliquez <strong style={{ color: '#94a3b8' }}>Nouvelle planche</strong> pour démarrer.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 14 }}>
            {metas.map(m => (
              <div key={m.id} onClick={() => onOpen(m.id)} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 18, cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.borderColor = '#16a34a')} onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e293b')}>
                <div style={{ height: 80, background: 'linear-gradient(135deg,#FFD400,#F5C800)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, marginBottom: 12 }}>🏷️</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>{m.pharmacy}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{m.plan}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: 10, color: '#475569' }}>{m.updatedAt ? new Date(m.updatedAt).toLocaleDateString('fr-FR') : ''}</span><button onClick={e => { e.stopPropagation(); if (confirm('Supprimer cette planche ?')) onDelete(m.id); }} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 13 }}>🗑</button></div>
              </div>
            ))}
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

export default function Home() {
  const [view, setView] = useState<View>('loading');
  const [mode, setMode] = useState<'server' | 'local'>('local');
  const [store, setStore] = useState<Store>(() => localStore);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [project, setProjectState] = useState<Project | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [saving, setSaving] = useState('Enregistré');
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
  const deletePlanche = async (id: string) => { await store.remove(id); refreshList(store); };
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
  if (view === 'studio' && project) return <Studio project={project} setProject={setProject} onBack={backToLibrary} saving={saving} mode={mode} undo={undo} redo={redo} canUndo={past.current.length > 0} canRedo={future.current.length > 0} />;
  return <Library metas={metas} mode={mode} onOpen={openPlanche} onNew={newPlanche} onDelete={deletePlanche} onLogout={logout} />;
}
