'use client';
import { useState, useEffect, useRef, useCallback, CSSProperties } from 'react';

/* ════════════════════════════════════════════════════════════════════
   PHARMAPROMO STUDIO
   Planche redimensionnable (A4/A5/A3/rouleau · taille étiquette en mm)
   Contrôle total par élément · logos · pictos · import CSV
   Bibliothèque d'équipe partagée (backend Vercel KV) + repli local
   ════════════════════════════════════════════════════════════════════ */

// ──────────────────────────────────────────────────────────────────────
//  MODÈLE
// ──────────────────────────────────────────────────────────────────────

type PromoType = 'prix-promo' | 'remise-marque' | 'bon-reduction' | 'remise-lot' | 'multi-achat';
type Align = 'left' | 'center' | 'right';
type ElKind = 'text' | 'pill' | 'box' | 'image';

interface El {
  id: string; kind: ElKind; text?: string; src?: string;
  x: number; y: number; w?: number; h?: number;
  size: number; font: string; color: string; bg?: string;
  weight: number; align: Align; rot: number;
  strike?: boolean; radius?: number; hidden?: boolean; removable?: boolean;
}

interface LabelData {
  product: string; sku: string; brand: string;
  normalPrice: string; promoPrice: string; brandDiscount: string;
  couponValue: string; couponExpiry: string; couponConditions: string;
  lotQty: string; lotFree: string; lotPrice: string; unitPrice: string;
  t1q: string; t1p: string; t2q: string; t2p: string; t3q: string; t3p: string;
}

interface Label {
  id: string; type: PromoType; accent: string; bg: string;
  data: LabelData; overrides: Record<string, Partial<El>>; extra: El[];
}

interface Project {
  pharmacy: string; plan: string; logo: string | null;
  pageFormat: string;        // 'A4' | 'A5' | 'A3' | 'roll'
  labelWmm: number; labelHmm: number;
  labels: Label[];
  updatedAt?: number;
}

interface Meta { id: string; pharmacy: string; plan: string; updatedAt: number; }

// ──────────────────────────────────────────────────────────────────────
//  CONSTANTES
// ──────────────────────────────────────────────────────────────────────

const TYPES: { id: PromoType; label: string; icon: string; color: string }[] = [
  { id: 'prix-promo',    label: 'Prix Promo',       icon: '🏷️', color: '#dc2626' },
  { id: 'remise-marque', label: 'Remise Marque',    icon: '🎯', color: '#1d4ed8' },
  { id: 'bon-reduction', label: 'Bon de Réduction', icon: '✂️', color: '#15803d' },
  { id: 'remise-lot',    label: 'Remise Lot',       icon: '📦', color: '#c2410c' },
  { id: 'multi-achat',   label: 'Multi-Achat',      icon: '📊', color: '#6d28d9' },
];

const FONTS = [
  { name: 'Système',   css: 'system-ui,-apple-system,Segoe UI,sans-serif' },
  { name: 'Arial',     css: 'Arial,Helvetica,sans-serif' },
  { name: 'Impact',    css: 'Impact,Haettenschweiler,Arial Narrow,sans-serif' },
  { name: 'Georgia',   css: 'Georgia,Cambria,serif' },
  { name: 'Trebuchet', css: '"Trebuchet MS",Tahoma,sans-serif' },
  { name: 'Verdana',   css: 'Verdana,Geneva,sans-serif' },
  { name: 'Courier',   css: '"Courier New",monospace' },
];

const BADGES = [
  { t: 'NOUVEAU', bg: '#dc2626' }, { t: 'BIO', bg: '#15803d' },
  { t: '★ COUP DE CŒUR', bg: '#d97706' }, { t: '-50%', bg: '#dc2626' },
  { t: '-30%', bg: '#dc2626' }, { t: '2+1', bg: '#c2410c' },
  { t: 'PROMO', bg: '#dc2626' }, { t: 'VEGAN', bg: '#16a34a' },
  { t: 'SANS ORDONNANCE', bg: '#0891b2' }, { t: 'FABRIQUÉ EN FRANCE', bg: '#1d4ed8' },
  { t: 'DÉSTOCKAGE', bg: '#7c3aed' }, { t: 'DERNIERS JOURS', bg: '#b91c1c' },
];

const PAGE_FORMATS = [
  { id: 'A4', name: 'A4', w: 210, h: 297 },
  { id: 'A5', name: 'A5', w: 148, h: 210 },
  { id: 'A3', name: 'A3', w: 297, h: 420 },
  { id: 'roll', name: 'Rouleau', w: 0, h: 0 },
];

const LABEL_PRESETS = [
  { name: 'A6 — 105×148', w: 105, h: 148 },
  { name: 'Grande — 99×85', w: 99, h: 85 },
  { name: 'Moyenne — 70×42', w: 70, h: 42 },
  { name: 'Rayon — 63×72', w: 63, h: 72 },
  { name: 'Petite — 48×45', w: 48, h: 45 },
  { name: 'Réglette — 38×21', w: 38, h: 21 },
];

const MM = 96 / 25.4;            // px par mm @96dpi
const MARGIN_MM = 6, HEADER_MM = 13, GAP_MM = 3;

const SYS = FONTS[0].css;
const pf = (s: string) => parseFloat((s || '').replace(',', '.')) || 0;
const ff = (n: number) => n.toFixed(2).replace('.', ',');
const uid = () => Math.random().toString(36).slice(2, 9);
const accentOf = (t: PromoType) => TYPES.find(x => x.id === t)!.color;

const newData = (): LabelData => ({
  product: 'Nom du produit', sku: '', brand: 'Marque',
  normalPrice: '12,50', promoPrice: '8,75', brandDiscount: '20',
  couponValue: '2,00', couponExpiry: '31/12/2026',
  couponConditions: 'Valable sur présentation. Non cumulable.',
  lotQty: '3', lotFree: '1', lotPrice: '19,98', unitPrice: '9,99',
  t1q: '1', t1p: '9,90', t2q: '2', t2p: '8,50', t3q: '3', t3p: '7,90',
});

function newLabel(type: PromoType = 'prix-promo', data?: Partial<LabelData>): Label {
  return { id: uid(), type, accent: accentOf(type), bg: '#ffffff', data: { ...newData(), ...data }, overrides: {}, extra: [] };
}

function defaultProject(): Project {
  return {
    pharmacy: 'Pharmacie du Centre', plan: 'Plan promotionnel', logo: null,
    pageFormat: 'A4', labelWmm: 63, labelHmm: 72,
    labels: [
      newLabel('prix-promo', { product: 'Doliprane 1000mg', sku: '3400935959755', normalPrice: '5,90', promoPrice: '4,20' }),
      newLabel('remise-marque', { brand: 'Avène', product: 'Crème hydratante', brandDiscount: '25', normalPrice: '18,90' }),
      newLabel('multi-achat', { product: 'Compléments Magnésium' }),
    ],
  };
}

// migration d'anciennes planches (cols/rows → mm)
function migrate(p: Project): Project {
  const q = p as Project & { cols?: number; rows?: number };
  if (!q.pageFormat) q.pageFormat = 'A4';
  if (!q.labelWmm || !q.labelHmm) { q.labelWmm = 63; q.labelHmm = 72; }
  return q;
}

// ──────────────────────────────────────────────────────────────────────
//  ÉLÉMENTS STRUCTURELS PAR TYPE
// ──────────────────────────────────────────────────────────────────────

function seedEls(l: Label): El[] {
  const a = l.accent, d = l.data;
  const base = { font: SYS, rot: 0, align: 'left' as Align };

  if (l.type === 'prix-promo') {
    const n = pf(d.normalPrice), p = pf(d.promoPrice);
    const pct = n > 0 && p > 0 ? Math.round((1 - p / n) * 100) : 0;
    const save = n > p ? ff(n - p) : '';
    return [
      { ...base, id: 'hdr', kind: 'box', x: 0, y: 0, w: 100, h: 22, bg: a, size: 0, color: a, weight: 400 },
      { ...base, id: 'tag', kind: 'text', text: 'PROMO', x: 5, y: 3, size: 0.115, color: '#fff', weight: 900 },
      { ...base, id: 'sub', kind: 'text', text: 'PRIX SPÉCIAL', x: 5, y: 14, size: 0.06, color: '#ffffffcc', weight: 600 },
      ...(pct > 0 ? [{ ...base, id: 'pct', kind: 'pill' as ElKind, text: `-${pct}%`, x: 74, y: 3.5, size: 0.1, color: a, bg: '#fff', weight: 900, align: 'center' as Align, radius: 50 }] : []),
      { ...base, id: 'prod', kind: 'text', text: d.product, x: 5, y: 27, w: 90, size: 0.105, color: '#111827', weight: 700 },
      ...(d.sku ? [{ ...base, id: 'sku', kind: 'text' as ElKind, text: `Réf : ${d.sku}`, x: 5, y: 40, size: 0.055, color: '#9ca3af', weight: 400 }] : []),
      ...(n > 0 ? [{ ...base, id: 'old', kind: 'text' as ElKind, text: `${d.normalPrice} €`, x: 5, y: 64, size: 0.09, color: '#cbd5e1', weight: 500, strike: true }] : []),
      { ...base, id: 'price', kind: 'text', text: `${d.promoPrice} €`, x: 5, y: 70, size: 0.27, color: a, weight: 900 },
      ...(save ? [{ ...base, id: 'save', kind: 'pill' as ElKind, text: `Économisez ${save} €`, x: 5, y: 92, size: 0.06, color: '#fff', bg: '#15803d', weight: 700, radius: 30 }] : []),
    ];
  }
  if (l.type === 'remise-marque') {
    const n = pf(d.normalPrice), disc = pf(d.brandDiscount);
    const np = n > 0 && disc > 0 ? ff(n * (1 - disc / 100)) : '';
    return [
      { ...base, id: 'hdr', kind: 'box', x: 0, y: 0, w: 100, h: 24, bg: a, size: 0, color: a, weight: 400 },
      { ...base, id: 'brand', kind: 'text', text: d.brand || 'MARQUE', x: 5, y: 4, size: 0.12, color: '#fff', weight: 900 },
      { ...base, id: 'sub', kind: 'text', text: 'REMISE FABRICANT', x: 5, y: 16, size: 0.06, color: '#ffffffcc', weight: 600 },
      { ...base, id: 'disc', kind: 'text', text: `-${d.brandDiscount || '0'}%`, x: 0, y: 30, w: 100, size: 0.34, color: a, weight: 900, align: 'center' },
      { ...base, id: 'prod', kind: 'text', text: d.product, x: 0, y: 64, w: 100, size: 0.08, color: '#374151', weight: 600, align: 'center' },
      ...(np ? [
        { ...base, id: 'old', kind: 'text' as ElKind, text: `${d.normalPrice} €`, x: 8, y: 82, size: 0.09, color: '#9ca3af', weight: 500, strike: true },
        { ...base, id: 'arrow', kind: 'text' as ElKind, text: '→', x: 40, y: 80, size: 0.12, color: a, weight: 900 },
        { ...base, id: 'new', kind: 'text' as ElKind, text: `${np} €`, x: 60, y: 80, size: 0.13, color: a, weight: 900 },
      ] : []),
    ];
  }
  if (l.type === 'bon-reduction') {
    const g = a;
    return [
      { ...base, id: 'cut', kind: 'text', text: '✂ — — — — — — — — — — — — — —', x: 4, y: 2, size: 0.07, color: g, weight: 600 },
      { ...base, id: 'hdr', kind: 'box', x: 0, y: 12, w: 100, h: 18, bg: g, size: 0, color: g, weight: 400 },
      { ...base, id: 'tag', kind: 'text', text: 'BON DE RÉDUCTION', x: 0, y: 15, w: 100, size: 0.095, color: '#fff', weight: 900, align: 'center' },
      { ...base, id: 'val', kind: 'text', text: `${d.couponValue} €`, x: 0, y: 36, w: 100, size: 0.3, color: g, weight: 900, align: 'center' },
      { ...base, id: 'prod', kind: 'text', text: `Sur : ${d.product}`, x: 0, y: 68, w: 100, size: 0.075, color: '#374151', weight: 600, align: 'center' },
      { ...base, id: 'cond', kind: 'text', text: d.couponConditions, x: 5, y: 80, w: 60, size: 0.05, color: '#6b7280', weight: 400 },
      { ...base, id: 'exp', kind: 'text', text: `Valable jusqu'au ${d.couponExpiry}`, x: 5, y: 92, size: 0.055, color: g, weight: 700 },
    ];
  }
  if (l.type === 'remise-lot') {
    const qty = Math.max(2, parseInt(d.lotQty) || 3);
    const free = Math.max(1, parseInt(d.lotFree) || 1);
    const paid = Math.max(1, qty - free);
    const u = pf(d.unitPrice);
    const totalN = u > 0 ? ff(u * qty) : '';
    const save = u > 0 ? ff(u * free) : '';
    return [
      { ...base, id: 'hdr', kind: 'box', x: 0, y: 0, w: 100, h: 24, bg: a, size: 0, color: a, weight: 400 },
      { ...base, id: 'tag', kind: 'text', text: 'LOT ÉCONOMIQUE', x: 5, y: 4, size: 0.12, color: '#fff', weight: 900 },
      { ...base, id: 'sub', kind: 'text', text: `${paid} acheté${paid > 1 ? 's' : ''} + ${free} offert${free > 1 ? 's' : ''}`, x: 5, y: 16, size: 0.06, color: '#ffffffdd', weight: 600 },
      { ...base, id: 'lotn', kind: 'pill', text: `LOT ×${qty}`, x: 74, y: 4, size: 0.085, color: a, bg: '#fff', weight: 900, align: 'center', radius: 20 },
      { ...base, id: 'prod', kind: 'text', text: d.product, x: 5, y: 30, w: 90, size: 0.1, color: '#111827', weight: 700 },
      ...(totalN ? [{ ...base, id: 'old', kind: 'text' as ElKind, text: `Au lieu de ${totalN} €`, x: 5, y: 58, size: 0.06, color: '#9ca3af', weight: 500, strike: true }] : []),
      { ...base, id: 'price', kind: 'text', text: `${d.lotPrice} €`, x: 5, y: 66, size: 0.22, color: a, weight: 900 },
      { ...base, id: 'unit', kind: 'text', text: 'le lot', x: 5, y: 90, size: 0.06, color: '#6b7280', weight: 500 },
      ...(save ? [{ ...base, id: 'save', kind: 'pill' as ElKind, text: `Économie ${save} €`, x: 58, y: 70, size: 0.07, color: '#fff', bg: '#15803d', weight: 700, align: 'center' as Align, radius: 30 }] : []),
    ];
  }
  // multi-achat
  const cols = [{ q: d.t1q, p: d.t1p }, { q: d.t2q, p: d.t2p }, { q: d.t3q, p: d.t3p }];
  const els: El[] = [
    { ...base, id: 'hdr', kind: 'box', x: 0, y: 0, w: 100, h: 24, bg: a, size: 0, color: a, weight: 400 },
    { ...base, id: 'tag', kind: 'text', text: 'OFFRE MULTI-ACHAT', x: 5, y: 4, size: 0.11, color: '#fff', weight: 900 },
    { ...base, id: 'sub', kind: 'text', text: 'Plus vous achetez, plus vous économisez', x: 5, y: 16, size: 0.052, color: '#ffffffcc', weight: 500 },
    { ...base, id: 'prod', kind: 'text', text: d.product, x: 5, y: 28, w: 90, size: 0.09, color: '#111827', weight: 700 },
  ];
  cols.forEach((c, i) => {
    const cx = 5 + i * 31;
    els.push({ ...base, id: `q${i}`, kind: 'pill', text: `${c.q} pce${parseInt(c.q) > 1 ? 's' : ''}`, x: cx, y: 44, w: 28, size: 0.06, color: i === 2 ? '#fff' : a, bg: i === 2 ? a : `${a}22`, weight: 700, align: 'center', radius: 15 });
    els.push({ ...base, id: `p${i}`, kind: 'text', text: `${c.p}€`, x: cx, y: 60, w: 28, size: 0.16, color: a, weight: 900, align: 'center' });
    els.push({ ...base, id: `u${i}`, kind: 'text', text: '/ pièce', x: cx, y: 84, w: 28, size: 0.05, color: '#9ca3af', weight: 400, align: 'center' });
  });
  return els;
}

function resolveEls(l: Label): El[] {
  const bound = seedEls(l).map(e => ({ ...e, ...l.overrides[e.id] }));
  return [...bound, ...l.extra];
}
const isBound = (l: Label, id: string) => seedEls(l).some(e => e.id === id);

function renderEl(e: El, H: number): CSSProperties {
  const fs = e.size * H;
  const st: CSSProperties = {
    position: 'absolute', left: `${e.x}%`, top: `${e.y}%`,
    transform: e.rot ? `rotate(${e.rot}deg)` : undefined, transformOrigin: 'top left',
    fontFamily: e.font, fontWeight: e.weight, color: e.color, textAlign: e.align, lineHeight: 1.05,
    width: e.w != null ? `${e.w}%` : undefined,
    whiteSpace: e.w != null ? 'normal' : 'nowrap',
    textDecoration: e.strike ? 'line-through' : undefined,
  };
  if (e.kind === 'box') { st.height = `${e.h ?? 10}%`; st.background = e.bg; st.borderRadius = e.radius ? `${e.radius}px` : undefined; st.fontSize = 0; }
  else st.fontSize = fs;
  if (e.kind === 'pill') {
    st.background = e.bg; st.padding = `${fs * 0.3}px ${fs * 0.6}px`;
    st.borderRadius = e.radius != null ? (e.radius >= 50 ? '999px' : `${e.radius}px`) : '6px';
    st.display = 'inline-block'; st.width = 'auto';
  }
  return st;
}

// ──────────────────────────────────────────────────────────────────────
//  LAYOUT (flux auto-adaptatif)
// ──────────────────────────────────────────────────────────────────────

function layout(p: Project) {
  const fmt = PAGE_FORMATS.find(f => f.id === p.pageFormat) || PAGE_FORMATS[0];
  const lw = p.labelWmm * MM, lh = p.labelHmm * MM;
  const m = MARGIN_MM * MM, gap = GAP_MM * MM, header = HEADER_MM * MM;
  let pageWmm: number, pageHmm: number, perRow: number;
  if (fmt.id === 'roll') {
    pageWmm = p.labelWmm + MARGIN_MM * 2;
    perRow = 1;
    const n = Math.max(1, p.labels.length);
    pageHmm = MARGIN_MM * 2 + HEADER_MM + n * p.labelHmm + (n - 1) * GAP_MM;
  } else {
    pageWmm = fmt.w; pageHmm = fmt.h;
    const usableW = pageWmm * MM - m * 2;
    perRow = Math.max(1, Math.floor((usableW + gap) / (lw + gap)));
  }
  const PW = pageWmm * MM, PH = pageHmm * MM;
  const usableW = PW - m * 2;
  const usableH = PH - m * 2 - header;
  const rowsFit = Math.max(1, Math.floor((usableH + gap) / (lh + gap)));
  const capacity = perRow * (fmt.id === 'roll' ? p.labels.length || 1 : rowsFit);
  return { fmt, lw, lh, m, gap, header, PW, PH, pageWmm, pageHmm, usableW, perRow, capacity };
}

// ──────────────────────────────────────────────────────────────────────
//  VUE ÉTIQUETTE
// ──────────────────────────────────────────────────────────────────────

interface DragState { labelId: string; elId: string; offX: number; offY: number; box: HTMLElement; }

function LabelView({ label, W, H, editing, selectedLabel, selectedEl, onSelectLabel, onSelectEl, onDragStart, onDelEl }: {
  label: Label; W: number; H: number; editing: boolean;
  selectedLabel: boolean; selectedEl: string | null;
  onSelectLabel: () => void; onSelectEl: (id: string) => void;
  onDragStart: (e: React.PointerEvent, labelId: string, elId: string, el: El) => void;
  onDelEl: (id: string) => void;
}) {
  const els = resolveEls(label).filter(e => !e.hidden);
  return (
    <div data-labelbox onClick={(ev) => { ev.stopPropagation(); onSelectLabel(); }}
      style={{ position: 'relative', width: W, height: H, background: label.bg,
        border: `2px solid ${selectedLabel && editing ? label.accent : '#e5e7eb'}`, borderRadius: 8, overflow: 'hidden',
        cursor: editing ? 'pointer' : 'default', boxShadow: selectedLabel && editing ? `0 0 0 3px ${label.accent}33` : 'none', flexShrink: 0 }}>
      {els.map(e => {
        const sel = editing && selectedEl === e.id;
        return (
          <div key={e.id}
            onPointerDown={(ev) => { if (editing) { ev.stopPropagation(); onSelectEl(e.id); onDragStart(ev, label.id, e.id, e); } }}
            style={{ ...renderEl(e, H), outline: sel ? `1.5px solid ${label.accent}` : 'none', outlineOffset: 2, cursor: editing ? 'move' : 'default', userSelect: 'none', touchAction: 'none' }}>
            {e.kind === 'image'
              ? <img src={e.src} alt="" style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none' }} />
              : (e.kind === 'box' ? null : e.text)}
            {sel && e.removable && (
              <button onPointerDown={(ev) => { ev.stopPropagation(); ev.preventDefault(); onDelEl(e.id); }}
                style={{ position: 'absolute', top: -10, right: -10, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', color: '#fff', border: '2px solid #fff', fontSize: 11, cursor: 'pointer', lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
//  VUE PLANCHE
// ──────────────────────────────────────────────────────────────────────

function Planche({ project, scale, editing, selLabel, selEl, setSelLabel, setSelEl, onAdd, dragStart, delEl, forPrint }: {
  project: Project; scale: number; editing: boolean;
  selLabel: string | null; selEl: string | null;
  setSelLabel: (id: string | null) => void; setSelEl: (id: string | null) => void;
  onAdd: () => void; dragStart: (e: React.PointerEvent, labelId: string, elId: string, el: El) => void;
  delEl: (id: string) => void; forPrint?: boolean;
}) {
  const L = layout(project);
  return (
    <div style={{ width: L.PW, height: L.PH, background: '#fff', transform: forPrint ? undefined : `scale(${scale})`, transformOrigin: 'top center', boxShadow: forPrint ? 'none' : '0 10px 40px rgba(0,0,0,0.18)', position: 'relative', flexShrink: 0 }}
      onClick={() => { if (editing) { setSelLabel(null); setSelEl(null); } }}>
      {/* En-tête officine */}
      <div style={{ position: 'absolute', top: L.m, left: L.m, right: L.m, height: L.header - 10, display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>
        {project.logo && <img src={project.logo} alt="" style={{ height: L.header - 22, width: 'auto', objectFit: 'contain' }} />}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', fontFamily: SYS }}>{project.pharmacy}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: SYS }}>{project.plan}</div>
        </div>
        <div style={{ fontSize: 10, color: '#cbd5e1', fontFamily: SYS }}>{L.fmt.name} · {project.labelWmm}×{project.labelHmm} mm</div>
      </div>
      {/* Grille en flux */}
      <div style={{ position: 'absolute', top: L.m + L.header, left: L.m, width: L.usableW, display: 'flex', flexWrap: 'wrap', gap: L.gap, alignContent: 'flex-start' }}>
        {project.labels.map(label => (
          <LabelView key={label.id} label={label} W={L.lw} H={L.lh} editing={editing && !forPrint}
            selectedLabel={selLabel === label.id} selectedEl={selLabel === label.id ? selEl : null}
            onSelectLabel={() => setSelLabel(label.id)} onSelectEl={(id) => { setSelLabel(label.id); setSelEl(id); }}
            onDragStart={dragStart} onDelEl={delEl} />
        ))}
        {!forPrint && (
          <button onClick={(e) => { e.stopPropagation(); onAdd(); }}
            style={{ width: L.lw, height: L.lh, border: '2px dashed #cbd5e1', borderRadius: 8, background: '#f8fafc', color: '#94a3b8', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: SYS, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <span style={{ fontSize: 22 }}>＋</span>Ajouter
          </button>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
//  CONTRÔLES UI
// ──────────────────────────────────────────────────────────────────────

const inp: CSSProperties = { width: '100%', padding: '7px 9px', background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 5, fontSize: 13, boxSizing: 'border-box', fontFamily: SYS };
const lbl: CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: SYS };

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div style={{ marginBottom: 10 }}><label style={lbl}>{label}</label>{children}</div>; }
function TextInp({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) { return <Field label={label}><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inp} /></Field>; }
function SectionTitle({ children }: { children: React.ReactNode }) { return <div style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '4px 0 10px', fontFamily: SYS }}>{children}</div>; }
function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <Field label={label}><div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
    <input type="color" value={value.length === 7 ? value : '#000000'} onChange={e => onChange(e.target.value)} style={{ width: 34, height: 28, border: '1px solid #334155', borderRadius: 4, background: 'none', cursor: 'pointer', padding: 2 }} />
    <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>{value}</span>
  </div></Field>;
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
  switch (l.type) {
    case 'prix-promo': return <><TextInp label="Produit" value={d.product} onChange={v => set('product', v)} /><TextInp label="Référence / code-barres" value={d.sku} onChange={v => set('sku', v)} />{G(<TextInp label="Prix normal €" value={d.normalPrice} onChange={v => set('normalPrice', v)} />, <TextInp label="Prix promo €" value={d.promoPrice} onChange={v => set('promoPrice', v)} />)}</>;
    case 'remise-marque': return <><TextInp label="Marque" value={d.brand} onChange={v => set('brand', v)} /><TextInp label="Produit" value={d.product} onChange={v => set('product', v)} />{G(<TextInp label="Remise %" value={d.brandDiscount} onChange={v => set('brandDiscount', v)} />, <TextInp label="Prix normal €" value={d.normalPrice} onChange={v => set('normalPrice', v)} />)}</>;
    case 'bon-reduction': return <><TextInp label="Produit" value={d.product} onChange={v => set('product', v)} />{G(<TextInp label="Valeur bon €" value={d.couponValue} onChange={v => set('couponValue', v)} />, <TextInp label="Validité" value={d.couponExpiry} onChange={v => set('couponExpiry', v)} />)}<Field label="Conditions"><textarea value={d.couponConditions} onChange={e => set('couponConditions', e.target.value)} rows={2} style={{ ...inp, resize: 'none' }} /></Field></>;
    case 'remise-lot': return <><TextInp label="Produit" value={d.product} onChange={v => set('product', v)} />{G(<TextInp label="Qté totale" value={d.lotQty} onChange={v => set('lotQty', v)} />, <TextInp label="Dont offert(s)" value={d.lotFree} onChange={v => set('lotFree', v)} />)}{G(<TextInp label="Prix unitaire €" value={d.unitPrice} onChange={v => set('unitPrice', v)} />, <TextInp label="Prix du lot €" value={d.lotPrice} onChange={v => set('lotPrice', v)} />)}</>;
    case 'multi-achat': return <><TextInp label="Produit" value={d.product} onChange={v => set('product', v)} />{G(<TextInp label="Palier 1 — qté" value={d.t1q} onChange={v => set('t1q', v)} />, <TextInp label="Palier 1 — prix" value={d.t1p} onChange={v => set('t1p', v)} />)}{G(<TextInp label="Palier 2 — qté" value={d.t2q} onChange={v => set('t2q', v)} />, <TextInp label="Palier 2 — prix" value={d.t2p} onChange={v => set('t2p', v)} />)}{G(<TextInp label="Palier 3 — qté" value={d.t3q} onChange={v => set('t3q', v)} />, <TextInp label="Palier 3 — prix" value={d.t3p} onChange={v => set('t3p', v)} />)}</>;
  }
}

function ElementEditor({ el, patch }: { el: El; patch: (p: Partial<El>) => void }) {
  return (<>
    {(el.kind === 'text' || el.kind === 'pill') && (<>
      <Field label="Texte"><input value={el.text || ''} onChange={e => patch({ text: e.target.value })} style={inp} /></Field>
      <Field label="Police"><select value={el.font} onChange={e => patch({ font: e.target.value })} style={{ ...inp, cursor: 'pointer' }}>{FONTS.map(f => <option key={f.name} value={f.css}>{f.name}</option>)}</select></Field>
      <Slider label="Taille" value={Math.round(el.size * 1000) / 10} min={2} max={55} step={0.5} suffix="%" onChange={v => patch({ size: v / 100 })} />
      <Field label="Graisse"><div style={{ display: 'flex', gap: 5 }}>{[{ v: 400, t: 'Normal' }, { v: 700, t: 'Gras' }, { v: 900, t: 'Extra' }].map(g => <button key={g.v} onClick={() => patch({ weight: g.v })} style={{ flex: 1, padding: '6px', background: el.weight === g.v ? '#16a34a' : '#1e293b', color: el.weight === g.v ? '#fff' : '#94a3b8', border: '1px solid #334155', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: g.v }}>{g.t}</button>)}</div></Field>
      <Field label="Alignement"><div style={{ display: 'flex', gap: 5 }}>{(['left', 'center', 'right'] as Align[]).map(al => <button key={al} onClick={() => patch({ align: al })} style={{ flex: 1, padding: '6px', background: el.align === al ? '#16a34a' : '#1e293b', color: el.align === al ? '#fff' : '#94a3b8', border: '1px solid #334155', borderRadius: 5, cursor: 'pointer', fontSize: 13 }}>{al === 'left' ? '⬅' : al === 'center' ? '↔' : '➡'}</button>)}</div></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <ColorRow label="Couleur texte" value={el.color} onChange={c => patch({ color: c })} />
        {el.kind === 'pill' && <ColorRow label="Fond pastille" value={el.bg || '#000000'} onChange={c => patch({ bg: c })} />}
      </div>
    </>)}
    {el.kind === 'box' && <ColorRow label="Couleur de la bande" value={el.bg || '#000000'} onChange={c => patch({ bg: c })} />}
    {el.kind === 'image' && <Slider label="Largeur" value={Math.round(el.w || 28)} min={8} max={90} step={1} suffix="%" onChange={v => patch({ w: v })} />}
    <Slider label="Rotation" value={el.rot} min={-30} max={30} step={1} suffix="°" onChange={v => patch({ rot: v })} />
    <div style={{ fontSize: 10, color: '#64748b', marginTop: 6, fontFamily: SYS }}>Position : glissez l&apos;élément sur l&apos;étiquette ✋</div>
  </>);
}

// ──────────────────────────────────────────────────────────────────────
//  IMPORT CSV / EXCEL
// ──────────────────────────────────────────────────────────────────────

function parseTable(text: string): string[][] {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim().length);
  const sample = lines[0] || '';
  const sep = sample.includes('\t') ? '\t' : (sample.includes(';') ? ';' : ',');
  return lines.map(l => l.split(sep).map(c => c.trim().replace(/^"|"$/g, '')));
}

function ImportModal({ onClose, onImport }: { onClose: () => void; onImport: (labels: Label[]) => void }) {
  const [text, setText] = useState('');
  const [type, setType] = useState<PromoType>('prix-promo');
  const example = 'Produit;Prix normal;Prix promo\nDoliprane 1000mg;5,90;4,20\nNurofen 400mg;8,50;6,90\nSpasfon Lyoc;6,20;4,95';
  const build = () => {
    const rows = parseTable(text.trim() || example);
    if (!rows.length) return;
    const hasHeader = rows[0].some(c => /produit|nom|prix|marque|remise/i.test(c));
    const body = hasHeader ? rows.slice(1) : rows;
    const labels = body.filter(r => r[0]).map(r => {
      const d: Partial<LabelData> = { product: r[0] };
      if (type === 'prix-promo') { d.normalPrice = r[1] || ''; d.promoPrice = r[2] || ''; d.sku = r[3] || ''; }
      else if (type === 'remise-marque') { d.brand = r[1] || ''; d.brandDiscount = r[2] || ''; d.normalPrice = r[3] || ''; }
      else if (type === 'remise-lot') { d.lotQty = r[1] || '3'; d.lotFree = r[2] || '1'; d.unitPrice = r[3] || ''; d.lotPrice = r[4] || ''; }
      else if (type === 'bon-reduction') { d.couponValue = r[1] || ''; d.couponExpiry = r[2] || ''; }
      else { d.t1q = r[1] || '1'; d.t1p = r[2] || ''; d.t2q = r[3] || '2'; d.t2p = r[4] || ''; d.t3q = r[5] || '3'; d.t3p = r[6] || ''; }
      return newLabel(type, d);
    });
    onImport(labels);
  };
  const onFile = (f: File) => { const r = new FileReader(); r.onload = () => setText(r.result as string); r.readAsText(f); };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SYS }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 560, maxWidth: '92vw', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 24, color: '#e2e8f0' }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Importer des produits</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>Collez depuis Excel (Ctrl+V) ou importez un <strong>.csv</strong>. Séparateur virgule / point-virgule / tabulation détecté automatiquement.</div>
        <Field label="Type d'étiquette à générer"><select value={type} onChange={e => setType(e.target.value as PromoType)} style={{ ...inp, cursor: 'pointer' }}>{TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></Field>
        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6, fontFamily: 'monospace' }}>Colonnes : {type === 'prix-promo' ? 'Produit ; Prix normal ; Prix promo ; Réf' : type === 'remise-marque' ? 'Produit ; Marque ; Remise% ; Prix normal' : type === 'remise-lot' ? 'Produit ; Qté ; Offerts ; Prix unit. ; Prix lot' : type === 'bon-reduction' ? 'Produit ; Valeur ; Validité' : 'Produit ; Q1 ; P1 ; Q2 ; P2 ; Q3 ; P3'}</div>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder={example} rows={7} style={{ ...inp, resize: 'vertical', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5 }} />
        <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center' }}>
          <label style={{ ...inp, width: 'auto', cursor: 'pointer', padding: '8px 14px' }}>📁 Fichier .csv<input type="file" accept=".csv,text/csv,text/plain" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} /></label>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ padding: '9px 16px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Annuler</button>
          <button onClick={build} style={{ padding: '9px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 800 }}>Générer</button>
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

interface Store {
  list(): Promise<Meta[]>;
  get(id: string): Promise<Project | null>;
  create(p: Project): Promise<string>;
  save(id: string, p: Project): Promise<void>;
  remove(id: string): Promise<void>;
}

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
//  ÉDITEUR (STUDIO)
// ──────────────────────────────────────────────────────────────────────

function Studio({ project, setProject, onBack, saving, mode }: {
  project: Project; setProject: (fn: (p: Project) => Project) => void;
  onBack: () => void; saving: string; mode: 'server' | 'local';
}) {
  const [selLabel, setSelLabel] = useState<string | null>(null);
  const [selEl, setSelEl] = useState<string | null>(null);
  const [editing, setEditing] = useState(true);
  const [scale, setScale] = useState(0.6);
  const [showImport, setShowImport] = useState(false);
  const drag = useRef<DragState | null>(null);

  const L = layout(project);
  useEffect(() => {
    const fit = () => { const availH = window.innerHeight - 130, availW = window.innerWidth - 340 - 80; setScale(Math.min(0.9, Math.max(0.25, Math.min(availH / L.PH, availW / L.PW)))); };
    fit(); window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit);
  }, [L.PH, L.PW]);

  const current = project.labels.find(l => l.id === selLabel) || null;
  const currentEl: El | null = current && selEl ? resolveEls(current).find(e => e.id === selEl) || null : null;
  const overflow = project.labels.length > L.capacity;

  const updateLabel = useCallback((id: string, fn: (l: Label) => Label) => setProject(p => ({ ...p, labels: p.labels.map(l => l.id === id ? fn(l) : l) })), [setProject]);
  const setData = (k: keyof LabelData, v: string) => { if (current) updateLabel(current.id, l => ({ ...l, data: { ...l.data, [k]: v } })); };
  const patchEl = (patch: Partial<El>) => {
    if (!current || !selEl) return; const id = selEl;
    updateLabel(current.id, l => isBound(l, id) ? { ...l, overrides: { ...l.overrides, [id]: { ...l.overrides[id], ...patch } } } : { ...l, extra: l.extra.map(e => e.id === id ? { ...e, ...patch } : e) });
  };
  const delEl = (id: string) => { if (current) { updateLabel(current.id, l => ({ ...l, extra: l.extra.filter(e => e.id !== id) })); if (selEl === id) setSelEl(null); } };
  const changeType = (t: PromoType) => { if (current) { updateLabel(current.id, l => ({ ...l, type: t, accent: accentOf(t), overrides: {} })); setSelEl(null); } };
  const setAccent = (c: string) => { if (current) updateLabel(current.id, l => ({ ...l, accent: c })); };
  const setBg = (c: string) => { if (current) updateLabel(current.id, l => ({ ...l, bg: c })); };
  const addLabel = () => { const t = current?.type || 'prix-promo'; const nl = newLabel(t); setProject(p => ({ ...p, labels: [...p.labels, nl] })); setSelLabel(nl.id); setSelEl(null); };
  const duplicateLabel = () => { if (!current) return; const copy: Label = { ...current, id: uid(), overrides: { ...current.overrides }, extra: current.extra.map(e => ({ ...e })) }; setProject(p => ({ ...p, labels: [...p.labels, copy] })); setSelLabel(copy.id); };
  const deleteLabel = () => { if (!current) return; setProject(p => ({ ...p, labels: p.labels.filter(l => l.id !== current.id) })); setSelLabel(null); setSelEl(null); };
  const addBadge = (t: string, bg: string) => { if (!current) return; const e: El = { id: 'b' + uid(), kind: 'pill', text: t, x: 8, y: 8, size: 0.08, font: SYS, color: '#fff', bg, weight: 900, align: 'center', rot: -8, radius: 6, removable: true }; updateLabel(current.id, l => ({ ...l, extra: [...l.extra, e] })); setSelEl(e.id); };
  const uploadBrandLogo = (file: File) => { if (!current) return; const r = new FileReader(); r.onload = () => { const e: El = { id: 'logo' + uid(), kind: 'image', src: r.result as string, x: 66, y: 6, w: 28, size: 0, font: SYS, color: '#000', weight: 400, align: 'left', rot: 0, removable: true }; updateLabel(current.id, l => ({ ...l, extra: [...l.extra, e] })); setSelEl(e.id); }; r.readAsDataURL(file); };
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
      const nx = Math.max(-5, Math.min(98, ((ev.clientX - r.left) / r.width) * 100 - ds.offX));
      const ny = Math.max(-5, Math.min(98, ((ev.clientY - r.top) / r.height) * 100 - ds.offY));
      updateLabel(ds.labelId, l => isBound(l, ds.elId) ? { ...l, overrides: { ...l.overrides, [ds.elId]: { ...l.overrides[ds.elId], x: nx, y: ny } } } : { ...l, extra: l.extra.map(e => e.id === ds.elId ? { ...e, x: nx, y: ny } : e) });
    };
    const up = () => { drag.current = null; };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [updateLabel]);

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: SYS, overflow: 'hidden' }}>
      <div id="studio" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <main style={{ flex: 1, background: '#0b1220', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Barre supérieure */}
          <div style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap' }}>
            <button onClick={onBack} title="Bibliothèque" style={{ padding: '7px 12px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>← Bibliothèque</button>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>{project.pharmacy} <span style={{ color: '#475569', fontWeight: 400 }}>· {project.plan}</span></div>
            <div style={{ fontSize: 11, color: saving === 'Enregistré' ? '#4ade80' : '#fbbf24' }}>{saving}</div>
            <div style={{ width: 1, height: 24, background: '#1e293b' }} />
            {/* Format de page */}
            <div style={{ display: 'flex', gap: 4 }}>
              {PAGE_FORMATS.map(f => { const on = project.pageFormat === f.id; return <button key={f.id} onClick={() => setProject(p => ({ ...p, pageFormat: f.id }))} style={{ padding: '5px 9px', background: on ? '#16a34a' : '#1e293b', color: on ? '#fff' : '#94a3b8', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>{f.name}</button>; })}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setEditing(e => !e)} style={{ padding: '7px 12px', background: editing ? '#16a34a22' : '#1e293b', color: editing ? '#4ade80' : '#94a3b8', border: `1px solid ${editing ? '#16a34a' : '#334155'}`, borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>{editing ? '✓ Édition' : 'Aperçu'}</button>
              <button onClick={() => setShowImport(true)} style={{ padding: '7px 12px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>⬆ Importer</button>
              <button onClick={addLabel} style={{ padding: '7px 12px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>＋ Étiquette</button>
              <button onClick={() => window.print()} style={{ padding: '7px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 800, boxShadow: '0 2px 10px #16a34a66' }}>🖨 Imprimer / PDF</button>
            </div>
          </div>
          {overflow && <div style={{ background: '#7c2d12', color: '#fed7aa', fontSize: 12, padding: '6px 16px', fontFamily: SYS }}>⚠ {project.labels.length} étiquettes pour {L.capacity} emplacements sur cette page — réduisez la taille des étiquettes ou changez de format.</div>}
          <div style={{ flex: 1, overflow: 'auto', padding: 28, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            <Planche project={project} scale={scale} editing={editing} selLabel={selLabel} selEl={selEl} setSelLabel={(id) => { setSelLabel(id); setSelEl(null); }} setSelEl={setSelEl} onAdd={addLabel} dragStart={dragStart} delEl={delEl} />
          </div>
        </main>

        {/* Panneau latéral */}
        <aside style={{ width: 340, flexShrink: 0, background: '#0f172a', borderLeft: '1px solid #1e293b', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
            {!current ? (
              <>
                <SectionTitle>Réglages de la planche</SectionTitle>
                <TextInp label="Nom de l'officine" value={project.pharmacy} onChange={v => setProject(p => ({ ...p, pharmacy: v }))} />
                <TextInp label="Intitulé du plan / période" value={project.plan} onChange={v => setProject(p => ({ ...p, plan: v }))} />
                <Field label="Logo de l'officine (global)">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <label style={{ ...inp, cursor: 'pointer', textAlign: 'center', flex: 1 }}>{project.logo ? 'Changer le logo' : '⬆ Téléverser'}<input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadPharmaLogo(e.target.files[0])} /></label>
                    {project.logo && <button onClick={() => setProject(p => ({ ...p, logo: null }))} style={{ padding: '7px 10px', background: '#7f1d1d', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>✕</button>}
                  </div>
                </Field>
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: 12, marginTop: 6 }}>
                  <SectionTitle>Dimensions des étiquettes</SectionTitle>
                  <Field label="Modèles courants (mm)">
                    <select value={`${project.labelWmm}x${project.labelHmm}`} onChange={e => { const [w, h] = e.target.value.split('x').map(Number); setProject(p => ({ ...p, labelWmm: w, labelHmm: h })); }} style={{ ...inp, cursor: 'pointer' }}>
                      <option value={`${project.labelWmm}x${project.labelHmm}`}>{project.labelWmm}×{project.labelHmm} (actuel)</option>
                      {LABEL_PRESETS.map(p => <option key={p.name} value={`${p.w}x${p.h}`}>{p.name}</option>)}
                    </select>
                  </Field>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <NumMm label="Largeur (mm)" value={project.labelWmm} onChange={v => setProject(p => ({ ...p, labelWmm: v }))} />
                    <NumMm label="Hauteur (mm)" value={project.labelHmm} onChange={v => setProject(p => ({ ...p, labelHmm: v }))} />
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{L.capacity} étiquette{L.capacity > 1 ? 's' : ''} par page · {project.labels.length} créée{project.labels.length > 1 ? 's' : ''}</div>
                </div>
                <div style={{ marginTop: 16, padding: 12, background: '#0b1220', borderRadius: 8, border: '1px solid #1e293b', fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                  👉 Cliquez une <strong style={{ color: '#e2e8f0' }}>étiquette</strong> pour l&apos;éditer, puis un <strong style={{ color: '#e2e8f0' }}>élément</strong> pour le déplacer/personnaliser. Tout s&apos;adapte à la taille en mm.
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <SectionTitle>Étiquette sélectionnée</SectionTitle>
                  <button onClick={() => { setSelLabel(null); setSelEl(null); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16 }}>✕</button>
                </div>
                <Field label="Type de promotion">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                    {TYPES.map(t => { const on = current.type === t.id; return <button key={t.id} onClick={() => changeType(t.id)} style={{ padding: '7px 6px', background: on ? `${t.color}22` : '#1e293b', border: `1px solid ${on ? t.color : '#334155'}`, borderRadius: 6, cursor: 'pointer', fontSize: 10.5, fontWeight: 700, color: on ? '#f8fafc' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 5 }}><span>{t.icon}</span>{t.label}</button>; })}
                  </div>
                </Field>
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: 12, marginTop: 6 }}><SectionTitle>Contenu</SectionTitle><ContentForm l={current} set={setData} /></div>
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: 12 }}>
                  <SectionTitle>Couleurs de l&apos;étiquette</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><ColorRow label="Accent" value={current.accent} onChange={setAccent} /><ColorRow label="Fond" value={current.bg} onChange={setBg} /></div>
                </div>
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: 12 }}>
                  <SectionTitle>Logo marque & pictos</SectionTitle>
                  <label style={{ ...inp, cursor: 'pointer', textAlign: 'center', display: 'block', marginBottom: 10 }}>⬆ Logo de marque / labo<input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadBrandLogo(e.target.files[0])} /></label>
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
            <span style={{ fontSize: 10, color: '#475569' }}>{mode === 'server' ? 'Bibliothèque d\'équipe (cloud)' : 'Local (backend non configuré)'}</span>
          </div>
        </aside>
      </div>

      {/* Zone d'impression */}
      <div id="print-root" style={{ display: 'none' }}>
        <Planche project={project} scale={1} editing={false} selLabel={null} selEl={null} setSelLabel={() => {}} setSelEl={() => {}} onAdd={() => {}} dragStart={() => {}} delEl={() => {}} forPrint />
      </div>

      {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={(labels) => { setProject(p => ({ ...p, labels: [...p.labels, ...labels] })); setShowImport(false); }} />}

      <style>{`
        @media print {
          @page { size: ${L.pageWmm}mm ${L.pageHmm}mm; margin: 0; }
          #studio { display: none !important; }
          #print-root { display: block !important; }
        }
        input[type=range] { accent-color: #16a34a; }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
//  BIBLIOTHÈQUE
// ──────────────────────────────────────────────────────────────────────

function Library({ metas, mode, onOpen, onNew, onDelete, onLogout }: {
  metas: Meta[]; mode: 'server' | 'local';
  onOpen: (id: string) => void; onNew: () => void; onDelete: (id: string) => void; onLogout: () => void;
}) {
  return (
    <div style={{ minHeight: '100vh', background: '#0b1220', fontFamily: SYS, color: '#e2e8f0' }}>
      <div style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#16a34a,#15803d)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 18 }}>✚</div>
        <div><div style={{ fontSize: 16, fontWeight: 800 }}>PharmaPROMO <span style={{ color: '#16a34a' }}>Studio</span></div><div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.06em' }}>BIBLIOTHÈQUE D&apos;ÉQUIPE</div></div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: mode === 'server' ? '#4ade80' : '#f59e0b' }}>● {mode === 'server' ? 'Cloud partagé' : 'Local'}</span>
          {mode === 'server' && <button onClick={onLogout} style={{ padding: '6px 12px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Déconnexion</button>}
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Planches promotionnelles</h1>
          <button onClick={onNew} style={{ marginLeft: 'auto', padding: '10px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 800, boxShadow: '0 2px 12px #16a34a55' }}>＋ Nouvelle planche</button>
        </div>
        {metas.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#475569', border: '2px dashed #1e293b', borderRadius: 12 }}>Aucune planche pour l&apos;instant. Cliquez sur <strong style={{ color: '#94a3b8' }}>Nouvelle planche</strong> pour démarrer.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
            {metas.map(m => (
              <div key={m.id} onClick={() => onOpen(m.id)} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 18, cursor: 'pointer', transition: 'border-color .15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#16a34a')} onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e293b')}>
                <div style={{ height: 80, background: 'linear-gradient(135deg,#1e293b,#0b1220)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, marginBottom: 12 }}>🏷️</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>{m.pharmacy}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{m.plan}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, color: '#475569' }}>{m.updatedAt ? new Date(m.updatedAt).toLocaleDateString('fr-FR') : ''}</span>
                  <button onClick={e => { e.stopPropagation(); if (confirm('Supprimer cette planche ?')) onDelete(m.id); }} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 13 }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
//  LOGIN (mot de passe d'équipe)
// ──────────────────────────────────────────────────────────────────────

function Login({ onSubmit, error }: { onSubmit: (key: string) => void; error: string }) {
  const [k, setK] = useState('');
  return (
    <div style={{ minHeight: '100vh', background: '#0b1220', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SYS }}>
      <form onSubmit={e => { e.preventDefault(); onSubmit(k); }} style={{ width: 360, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 32, color: '#e2e8f0' }}>
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

// ──────────────────────────────────────────────────────────────────────
//  ORCHESTRATION
// ──────────────────────────────────────────────────────────────────────

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
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshList = useCallback(async (s: Store) => { try { setMetas(await s.list()); } catch { /* 401 */ } }, []);

  // Détection backend au démarrage
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/health', { cache: 'no-store' });
        const h = await r.json();
        if (h.configured) {
          setMode('server'); setStore(() => serverStore);
          if (h.keyRequired && !localStorage.getItem(KEY_LS)) { setView('login'); return; }
          try { setMetas(await serverStore.list()); setView('library'); }
          catch { setView('login'); }
        } else { setMode('local'); setStore(() => localStore); setMetas(await localStore.list()); setView('library'); }
      } catch { setMode('local'); setStore(() => localStore); setMetas(await localStore.list()); setView('library'); }
    })();
  }, []);

  const doLogin = async (key: string) => {
    localStorage.setItem(KEY_LS, key);
    try { setMetas(await serverStore.list()); setLoginErr(''); setView('library'); }
    catch { localStorage.removeItem(KEY_LS); setLoginErr('Mot de passe incorrect.'); }
  };
  const logout = () => { localStorage.removeItem(KEY_LS); setView('login'); };

  const openPlanche = async (id: string) => { const p = await store.get(id); if (p) { setProjectState(migrate(p)); setCurrentId(id); setSaving('Enregistré'); setView('studio'); } };
  const newPlanche = async () => { const id = await store.create(defaultProject()); await openPlanche(id); refreshList(store); };
  const deletePlanche = async (id: string) => { await store.remove(id); refreshList(store); };
  const backToLibrary = async () => { if (saveTimer.current) { clearTimeout(saveTimer.current); if (currentId && project) await store.save(currentId, project); } setView('library'); setCurrentId(null); setProjectState(null); refreshList(store); };

  // setProject avec sauvegarde différée
  const setProject = useCallback((fn: (p: Project) => Project) => {
    setProjectState(prev => {
      if (!prev) return prev;
      const next = fn(prev);
      setSaving('Enregistrement…');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => { if (currentId) { await store.save(currentId, next); setSaving('Enregistré'); } }, 700);
      return next;
    });
  }, [currentId, store]);

  if (view === 'loading') return <div style={{ minHeight: '100vh', background: '#0b1220', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontFamily: SYS }}>Chargement…</div>;
  if (view === 'login') return <Login onSubmit={doLogin} error={loginErr} />;
  if (view === 'studio' && project) return <Studio project={project} setProject={setProject} onBack={backToLibrary} saving={saving} mode={mode} />;
  return <Library metas={metas} mode={mode} onOpen={openPlanche} onNew={newPlanche} onDelete={deletePlanche} onLogout={logout} />;
}
