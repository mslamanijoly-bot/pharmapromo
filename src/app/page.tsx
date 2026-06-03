'use client';
import { useState, useEffect, useRef, useCallback, CSSProperties } from 'react';

/* ════════════════════════════════════════════════════════════════════
   PHARMAPROMO STUDIO — Atelier d'étiquettes promotionnelles
   Planche A4 · contrôle total par élément · logos · pictos · import CSV
   ════════════════════════════════════════════════════════════════════ */

// ──────────────────────────────────────────────────────────────────────
//  MODÈLE
// ──────────────────────────────────────────────────────────────────────

type PromoType = 'prix-promo' | 'remise-marque' | 'bon-reduction' | 'remise-lot' | 'multi-achat';
type Align = 'left' | 'center' | 'right';
type ElKind = 'text' | 'pill' | 'box' | 'image';

interface El {
  id: string;
  kind: ElKind;
  text?: string;
  src?: string;          // image dataURL
  x: number; y: number;  // % position (coin haut-gauche) dans l'étiquette
  w?: number;            // % largeur (text/box/image)
  h?: number;            // % hauteur (box)
  size: number;          // taille de police = fraction de la hauteur d'étiquette
  font: string;
  color: string;
  bg?: string;           // fond (pill/box)
  weight: number;        // 400 / 700 / 900
  align: Align;
  rot: number;           // rotation deg
  strike?: boolean;
  radius?: number;       // % radius pour pill/box
  hidden?: boolean;
  removable?: boolean;   // badge / logo supprimable
}

interface LabelData {
  product: string; sku: string; brand: string;
  normalPrice: string; promoPrice: string;
  brandDiscount: string;
  couponValue: string; couponExpiry: string; couponConditions: string;
  lotQty: string; lotFree: string; lotPrice: string; unitPrice: string;
  t1q: string; t1p: string; t2q: string; t2p: string; t3q: string; t3p: string;
}

interface Label {
  id: string;
  type: PromoType;
  accent: string;
  bg: string;
  data: LabelData;
  overrides: Record<string, Partial<El>>;  // surcharges des éléments structurels
  extra: El[];                              // badges + logos ajoutés
}

interface Project {
  pharmacy: string;
  plan: string;
  logo: string | null;
  cols: number;
  rows: number;
  labels: Label[];
}

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

const FORMATS = [
  { id: '1x1', cols: 1, rows: 1, label: '1 / page',  dim: '~A5' },
  { id: '2x2', cols: 2, rows: 2, label: '4 / page',  dim: '99×135' },
  { id: '2x3', cols: 2, rows: 3, label: '6 / page',  dim: '99×85' },
  { id: '3x4', cols: 3, rows: 4, label: '12 / page', dim: '63×72' },
  { id: '4x6', cols: 4, rows: 6, label: '24 / page', dim: '48×45' },
];

// Page A4 en px @96dpi (210×297 mm)
const A4_W = 794, A4_H = 1123;
const MARGIN = 24, HEADER = 50, GAP = 10;

const newData = (): LabelData => ({
  product: 'Nom du produit', sku: '', brand: 'Marque',
  normalPrice: '12,50', promoPrice: '8,75', brandDiscount: '20',
  couponValue: '2,00', couponExpiry: '31/12/2026',
  couponConditions: 'Valable sur présentation. Non cumulable.',
  lotQty: '3', lotFree: '1', lotPrice: '19,98', unitPrice: '9,99',
  t1q: '1', t1p: '9,90', t2q: '2', t2p: '8,50', t3q: '3', t3p: '7,90',
});

// ──────────────────────────────────────────────────────────────────────
//  HELPERS
// ──────────────────────────────────────────────────────────────────────

const pf = (s: string) => parseFloat((s || '').replace(',', '.')) || 0;
const ff = (n: number) => n.toFixed(2).replace('.', ',');
const uid = () => Math.random().toString(36).slice(2, 9);
const SYS = FONTS[0].css;

function accentOf(type: PromoType) {
  return TYPES.find(t => t.id === type)!.color;
}

function newLabel(type: PromoType = 'prix-promo', data?: Partial<LabelData>): Label {
  return {
    id: uid(), type, accent: accentOf(type), bg: '#ffffff',
    data: { ...newData(), ...data }, overrides: {}, extra: [],
  };
}

// ──────────────────────────────────────────────────────────────────────
//  ÉLÉMENTS STRUCTURELS PAR TYPE (gabarits)
//  size = fraction de la hauteur d'étiquette · x,y,w,h = %
// ──────────────────────────────────────────────────────────────────────

function seedEls(l: Label): El[] {
  const a = l.accent;
  const d = l.data;
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
  const cols = [
    { q: d.t1q, p: d.t1p }, { q: d.t2q, p: d.t2p }, { q: d.t3q, p: d.t3p },
  ];
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
function isBound(l: Label, id: string): boolean {
  return seedEls(l).some(e => e.id === id);
}

// ──────────────────────────────────────────────────────────────────────
//  RENDU D'UN ÉLÉMENT
// ──────────────────────────────────────────────────────────────────────

function renderEl(e: El, H: number): CSSProperties {
  const fs = e.size * H;
  const st: CSSProperties = {
    position: 'absolute', left: `${e.x}%`, top: `${e.y}%`,
    transform: e.rot ? `rotate(${e.rot}deg)` : undefined,
    transformOrigin: 'top left',
    fontFamily: e.font, fontWeight: e.weight, color: e.color,
    textAlign: e.align, lineHeight: 1.05,
    width: e.w != null ? `${e.w}%` : undefined,
    whiteSpace: e.w != null ? 'normal' : 'nowrap',
    textDecoration: e.strike ? 'line-through' : undefined,
  };
  if (e.kind === 'box') {
    st.height = `${e.h ?? 10}%`;
    st.background = e.bg;
    st.borderRadius = e.radius ? `${e.radius}px` : undefined;
    st.fontSize = 0;
  } else {
    st.fontSize = fs;
  }
  if (e.kind === 'pill') {
    st.background = e.bg;
    st.padding = `${fs * 0.3}px ${fs * 0.6}px`;
    st.borderRadius = e.radius != null ? (e.radius >= 50 ? '999px' : `${e.radius}px`) : '6px';
    st.display = 'inline-block';
    st.width = 'auto';
  }
  return st;
}

// ──────────────────────────────────────────────────────────────────────
//  VUE ÉTIQUETTE
// ──────────────────────────────────────────────────────────────────────

interface DragState { labelId: string; elId: string; offX: number; offY: number; box: HTMLElement; }

function LabelView({
  label, W, H, editing, selectedLabel, selectedEl, onSelectLabel, onSelectEl, onDragStart, onDelEl,
}: {
  label: Label; W: number; H: number; editing: boolean;
  selectedLabel: boolean; selectedEl: string | null;
  onSelectLabel: () => void;
  onSelectEl: (id: string) => void;
  onDragStart: (e: React.PointerEvent, labelId: string, elId: string, el: El) => void;
  onDelEl: (id: string) => void;
}) {
  const els = resolveEls(label).filter(e => !e.hidden);
  return (
    <div
      data-labelbox
      onClick={(ev) => { ev.stopPropagation(); onSelectLabel(); }}
      style={{
        position: 'relative', width: W, height: H, background: label.bg,
        border: `2px solid ${selectedLabel && editing ? label.accent : '#e5e7eb'}`,
        borderRadius: 8, overflow: 'hidden', cursor: editing ? 'pointer' : 'default',
        boxShadow: selectedLabel && editing ? `0 0 0 3px ${label.accent}33` : 'none',
        flexShrink: 0,
      }}
    >
      {els.map(e => {
        const sel = editing && selectedEl === e.id;
        return (
          <div
            key={e.id}
            onPointerDown={(ev) => { if (editing) { ev.stopPropagation(); onSelectEl(e.id); onDragStart(ev, label.id, e.id, e); } }}
            style={{
              ...renderEl(e, H),
              outline: sel ? `1.5px solid ${label.accent}` : 'none',
              outlineOffset: 2, cursor: editing ? 'move' : 'default',
              userSelect: 'none', touchAction: 'none',
            }}
          >
            {e.kind === 'image'
              ? <img src={e.src} alt="" style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none' }} />
              : (e.kind === 'box' ? null : e.text)}
            {sel && e.removable && (
              <button
                onPointerDown={(ev) => { ev.stopPropagation(); ev.preventDefault(); onDelEl(e.id); }}
                style={{ position: 'absolute', top: -10, right: -10, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', color: '#fff', border: '2px solid #fff', fontSize: 11, cursor: 'pointer', lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >×</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
//  VUE PLANCHE A4
// ──────────────────────────────────────────────────────────────────────

function Planche({
  project, scale, editing, selLabel, selEl, setSelLabel, setSelEl, onAdd, dragStart, delEl, forPrint,
}: {
  project: Project; scale: number; editing: boolean;
  selLabel: string | null; selEl: string | null;
  setSelLabel: (id: string | null) => void;
  setSelEl: (id: string | null) => void;
  onAdd: () => void;
  dragStart: (e: React.PointerEvent, labelId: string, elId: string, el: El) => void;
  delEl: (id: string) => void;
  forPrint?: boolean;
}) {
  const { cols, rows } = project;
  const usableW = A4_W - MARGIN * 2;
  const usableH = A4_H - MARGIN * 2 - HEADER;
  const cellW = (usableW - GAP * (cols - 1)) / cols;
  const cellH = (usableH - GAP * (rows - 1)) / rows;
  const slots = cols * rows;

  return (
    <div
      style={{
        width: A4_W, height: A4_H, background: '#fff',
        transform: forPrint ? undefined : `scale(${scale})`,
        transformOrigin: 'top center',
        boxShadow: forPrint ? 'none' : '0 10px 40px rgba(0,0,0,0.18)',
        position: 'relative', flexShrink: 0,
      }}
      onClick={() => { if (editing) { setSelLabel(null); setSelEl(null); } }}
    >
      {/* En-tête de planche (officine) */}
      <div style={{ position: 'absolute', top: MARGIN, left: MARGIN, right: MARGIN, height: HEADER - 12, display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid #e5e7eb', paddingBottom: 8 }}>
        {project.logo && <img src={project.logo} alt="" style={{ height: 34, width: 'auto', objectFit: 'contain' }} />}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', fontFamily: SYS }}>{project.pharmacy}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: SYS }}>{project.plan}</div>
        </div>
        <div style={{ fontSize: 10, color: '#cbd5e1', fontFamily: SYS }}>Format A4 · {cols * rows} étiquettes</div>
      </div>

      {/* Grille */}
      <div style={{ position: 'absolute', top: MARGIN + HEADER, left: MARGIN, width: usableW, display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cellW}px)`, gap: GAP }}>
        {Array.from({ length: slots }).map((_, i) => {
          const label = project.labels[i];
          if (label) {
            return (
              <LabelView
                key={label.id} label={label} W={cellW} H={cellH} editing={editing && !forPrint}
                selectedLabel={selLabel === label.id} selectedEl={selLabel === label.id ? selEl : null}
                onSelectLabel={() => { setSelLabel(label.id); }}
                onSelectEl={(id) => { setSelLabel(label.id); setSelEl(id); }}
                onDragStart={dragStart} onDelEl={delEl}
              />
            );
          }
          if (forPrint) return <div key={i} style={{ width: cellW, height: cellH }} />;
          return (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); onAdd(); }}
              style={{ width: cellW, height: cellH, border: '2px dashed #cbd5e1', borderRadius: 8, background: '#f8fafc', color: '#94a3b8', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: SYS, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}
            >
              <span style={{ fontSize: 22 }}>＋</span>
              Ajouter
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
//  PETITS CONTRÔLES UI
// ──────────────────────────────────────────────────────────────────────

const inp: CSSProperties = { width: '100%', padding: '7px 9px', background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 5, fontSize: 13, boxSizing: 'border-box', fontFamily: SYS };
const lbl: CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: SYS };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 10 }}><label style={lbl}>{label}</label>{children}</div>;
}
function TextInp({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <Field label={label}><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inp} /></Field>;
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '4px 0 10px', fontFamily: SYS }}>{children}</div>;
}

// ──────────────────────────────────────────────────────────────────────
//  FORMULAIRE DE CONTENU PAR TYPE
// ──────────────────────────────────────────────────────────────────────

function ContentForm({ l, set }: { l: Label; set: (k: keyof LabelData, v: string) => void }) {
  const d = l.data;
  const G = (a: React.ReactNode, b: React.ReactNode) => <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>{a}{b}</div>;
  switch (l.type) {
    case 'prix-promo': return <>
      <TextInp label="Produit" value={d.product} onChange={v => set('product', v)} />
      <TextInp label="Référence / code-barres" value={d.sku} onChange={v => set('sku', v)} />
      {G(<TextInp label="Prix normal €" value={d.normalPrice} onChange={v => set('normalPrice', v)} />,
         <TextInp label="Prix promo €" value={d.promoPrice} onChange={v => set('promoPrice', v)} />)}
    </>;
    case 'remise-marque': return <>
      <TextInp label="Marque" value={d.brand} onChange={v => set('brand', v)} />
      <TextInp label="Produit" value={d.product} onChange={v => set('product', v)} />
      {G(<TextInp label="Remise %" value={d.brandDiscount} onChange={v => set('brandDiscount', v)} />,
         <TextInp label="Prix normal €" value={d.normalPrice} onChange={v => set('normalPrice', v)} />)}
    </>;
    case 'bon-reduction': return <>
      <TextInp label="Produit" value={d.product} onChange={v => set('product', v)} />
      {G(<TextInp label="Valeur bon €" value={d.couponValue} onChange={v => set('couponValue', v)} />,
         <TextInp label="Validité" value={d.couponExpiry} onChange={v => set('couponExpiry', v)} />)}
      <Field label="Conditions"><textarea value={d.couponConditions} onChange={e => set('couponConditions', e.target.value)} rows={2} style={{ ...inp, resize: 'none' }} /></Field>
    </>;
    case 'remise-lot': return <>
      <TextInp label="Produit" value={d.product} onChange={v => set('product', v)} />
      {G(<TextInp label="Qté totale" value={d.lotQty} onChange={v => set('lotQty', v)} />,
         <TextInp label="Dont offert(s)" value={d.lotFree} onChange={v => set('lotFree', v)} />)}
      {G(<TextInp label="Prix unitaire €" value={d.unitPrice} onChange={v => set('unitPrice', v)} />,
         <TextInp label="Prix du lot €" value={d.lotPrice} onChange={v => set('lotPrice', v)} />)}
    </>;
    case 'multi-achat': return <>
      <TextInp label="Produit" value={d.product} onChange={v => set('product', v)} />
      {G(<TextInp label="Palier 1 — qté" value={d.t1q} onChange={v => set('t1q', v)} />,
         <TextInp label="Palier 1 — prix" value={d.t1p} onChange={v => set('t1p', v)} />)}
      {G(<TextInp label="Palier 2 — qté" value={d.t2q} onChange={v => set('t2q', v)} />,
         <TextInp label="Palier 2 — prix" value={d.t2p} onChange={v => set('t2p', v)} />)}
      {G(<TextInp label="Palier 3 — qté" value={d.t3q} onChange={v => set('t3q', v)} />,
         <TextInp label="Palier 3 — prix" value={d.t3p} onChange={v => set('t3p', v)} />)}
    </>;
  }
}

// ──────────────────────────────────────────────────────────────────────
//  PAGE PRINCIPALE
// ──────────────────────────────────────────────────────────────────────

const STORE_KEY = 'pharmapromo:v2';

function defaultProject(): Project {
  return {
    pharmacy: 'Pharmacie du Centre', plan: 'Plan promotionnel', logo: null,
    cols: 3, rows: 4,
    labels: [
      newLabel('prix-promo', { product: 'Doliprane 1000mg', sku: '3400935959755', normalPrice: '5,90', promoPrice: '4,20' }),
      newLabel('remise-marque', { brand: 'Avène', product: 'Crème hydratante', brandDiscount: '25', normalPrice: '18,90' }),
      newLabel('multi-achat', { product: 'Compléments Magnésium' }),
    ],
  };
}

export default function Home() {
  const [project, setProject] = useState<Project>(defaultProject);
  const [selLabel, setSelLabel] = useState<string | null>(null);
  const [selEl, setSelEl] = useState<string | null>(null);
  const [editing, setEditing] = useState(true);
  const [scale, setScale] = useState(0.62);
  const [showImport, setShowImport] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const drag = useRef<DragState | null>(null);

  // Chargement / sauvegarde locale
  useEffect(() => {
    try { const r = localStorage.getItem(STORE_KEY); if (r) setProject(JSON.parse(r)); } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) try { localStorage.setItem(STORE_KEY, JSON.stringify(project)); } catch {}
  }, [project, loaded]);

  // Adapter le zoom à la fenêtre
  useEffect(() => {
    const fit = () => {
      const avail = window.innerHeight - 130;
      setScale(Math.min(0.85, Math.max(0.3, avail / A4_H)));
    };
    fit(); window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const current = project.labels.find(l => l.id === selLabel) || null;
  const currentEl: El | null = current && selEl ? resolveEls(current).find(e => e.id === selEl) || null : null;

  // ---- Mutations ----
  const updateLabel = useCallback((id: string, fn: (l: Label) => Label) => {
    setProject(p => ({ ...p, labels: p.labels.map(l => l.id === id ? fn(l) : l) }));
  }, []);

  const setData = (k: keyof LabelData, v: string) => {
    if (!current) return;
    updateLabel(current.id, l => ({ ...l, data: { ...l.data, [k]: v } }));
  };

  const patchEl = (patch: Partial<El>) => {
    if (!current || !selEl) return;
    const id = selEl;
    updateLabel(current.id, l => {
      if (isBound(l, id)) return { ...l, overrides: { ...l.overrides, [id]: { ...l.overrides[id], ...patch } } };
      return { ...l, extra: l.extra.map(e => e.id === id ? { ...e, ...patch } : e) };
    });
  };

  const delEl = (id: string) => {
    if (!current) return;
    updateLabel(current.id, l => ({ ...l, extra: l.extra.filter(e => e.id !== id) }));
    if (selEl === id) setSelEl(null);
  };

  const changeType = (t: PromoType) => {
    if (!current) return;
    updateLabel(current.id, l => ({ ...l, type: t, accent: accentOf(t), overrides: {} }));
    setSelEl(null);
  };

  const setAccent = (c: string) => { if (current) updateLabel(current.id, l => ({ ...l, accent: c })); };
  const setBg = (c: string) => { if (current) updateLabel(current.id, l => ({ ...l, bg: c })); };

  const addLabel = () => {
    if (project.labels.length >= project.cols * project.rows) return;
    const t = current?.type || 'prix-promo';
    const nl = newLabel(t);
    setProject(p => ({ ...p, labels: [...p.labels, nl] }));
    setSelLabel(nl.id); setSelEl(null);
  };

  const duplicateLabel = () => {
    if (!current) return;
    if (project.labels.length >= project.cols * project.rows) return;
    const copy: Label = { ...current, id: uid(), overrides: { ...current.overrides }, extra: current.extra.map(e => ({ ...e })) };
    setProject(p => ({ ...p, labels: [...p.labels, copy] }));
    setSelLabel(copy.id);
  };

  const deleteLabel = () => {
    if (!current) return;
    setProject(p => ({ ...p, labels: p.labels.filter(l => l.id !== current.id) }));
    setSelLabel(null); setSelEl(null);
  };

  const addBadge = (t: string, bg: string) => {
    if (!current) return;
    const e: El = { id: 'b' + uid(), kind: 'pill', text: t, x: 8, y: 8, size: 0.08, font: SYS, color: '#fff', bg, weight: 900, align: 'center', rot: -8, radius: 6, removable: true };
    updateLabel(current.id, l => ({ ...l, extra: [...l.extra, e] }));
    setSelEl(e.id);
  };

  const uploadBrandLogo = (file: File) => {
    if (!current) return;
    const r = new FileReader();
    r.onload = () => {
      const src = r.result as string;
      const e: El = { id: 'logo' + uid(), kind: 'image', src, x: 66, y: 6, w: 28, size: 0, font: SYS, color: '#000', weight: 400, align: 'left', rot: 0, removable: true };
      updateLabel(current.id, l => ({ ...l, extra: [...l.extra, e] }));
      setSelEl(e.id);
    };
    r.readAsDataURL(file);
  };

  const uploadPharmaLogo = (file: File) => {
    const r = new FileReader();
    r.onload = () => setProject(p => ({ ...p, logo: r.result as string }));
    r.readAsDataURL(file);
  };

  const setFormat = (cols: number, rows: number) => setProject(p => ({ ...p, cols, rows }));

  // ---- Glisser-déposer d'éléments ----
  const dragStart = (ev: React.PointerEvent, labelId: string, elId: string, el: El) => {
    const box = (ev.currentTarget as HTMLElement).closest('[data-labelbox]') as HTMLElement;
    if (!box) return;
    const r = box.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * 100;
    const py = ((ev.clientY - r.top) / r.height) * 100;
    drag.current = { labelId, elId, offX: px - el.x, offY: py - el.y, box };
    (ev.currentTarget as HTMLElement).setPointerCapture?.(ev.pointerId);
  };
  useEffect(() => {
    const move = (ev: PointerEvent) => {
      const ds = drag.current; if (!ds) return;
      const r = ds.box.getBoundingClientRect();
      const nx = Math.max(-5, Math.min(98, ((ev.clientX - r.left) / r.width) * 100 - ds.offX));
      const ny = Math.max(-5, Math.min(98, ((ev.clientY - r.top) / r.height) * 100 - ds.offY));
      updateLabel(ds.labelId, l => {
        if (isBound(l, ds.elId)) return { ...l, overrides: { ...l.overrides, [ds.elId]: { ...l.overrides[ds.elId], x: nx, y: ny } } };
        return { ...l, extra: l.extra.map(e => e.id === ds.elId ? { ...e, x: nx, y: ny } : e) };
      });
    };
    const up = () => { drag.current = null; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [updateLabel]);

  const doPrint = () => window.print();

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: SYS, overflow: 'hidden' }}>

      {/* ════════ STUDIO (écran) ════════ */}
      <div id="studio" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Zone planche ── */}
        <main style={{ flex: 1, background: '#0b1220', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Barre supérieure */}
          <div style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg,#16a34a,#15803d)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 17 }}>✚</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>PharmaPROMO <span style={{ color: '#16a34a' }}>Studio</span></div>
                <div style={{ fontSize: 9, color: '#475569', letterSpacing: '0.06em' }}>ATELIER D&apos;ÉTIQUETTES</div>
              </div>
            </div>

            <div style={{ width: 1, height: 28, background: '#1e293b' }} />

            {/* Formats */}
            <div style={{ display: 'flex', gap: 4 }}>
              {FORMATS.map(f => {
                const on = project.cols === f.cols && project.rows === f.rows;
                return (
                  <button key={f.id} onClick={() => setFormat(f.cols, f.rows)} title={f.dim + ' mm'}
                    style={{ padding: '5px 9px', background: on ? '#16a34a' : '#1e293b', color: on ? '#fff' : '#94a3b8', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                    {f.label}
                  </button>
                );
              })}
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setEditing(e => !e)}
                style={{ padding: '7px 12px', background: editing ? '#16a34a22' : '#1e293b', color: editing ? '#4ade80' : '#94a3b8', border: `1px solid ${editing ? '#16a34a' : '#334155'}`, borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                {editing ? '✓ Mode édition' : 'Aperçu'}
              </button>
              <button onClick={() => setShowImport(true)}
                style={{ padding: '7px 12px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                ⬆ Importer CSV/Excel
              </button>
              <button onClick={addLabel}
                style={{ padding: '7px 12px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                ＋ Étiquette
              </button>
              <button onClick={doPrint}
                style={{ padding: '7px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 800, boxShadow: '0 2px 10px #16a34a66' }}>
                🖨 Imprimer / PDF
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div style={{ flex: 1, overflow: 'auto', padding: 28, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            <Planche
              project={project} scale={scale} editing={editing}
              selLabel={selLabel} selEl={selEl}
              setSelLabel={(id) => { setSelLabel(id); setSelEl(null); }}
              setSelEl={setSelEl} onAdd={addLabel}
              dragStart={dragStart} delEl={delEl}
            />
          </div>
        </main>

        {/* ── Panneau latéral ── */}
        <aside style={{ width: 340, flexShrink: 0, background: '#0f172a', borderLeft: '1px solid #1e293b', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
            {!current ? (
              /* ===== Réglages planche ===== */
              <>
                <SectionTitle>Réglages de la planche</SectionTitle>
                <TextInp label="Nom de l'officine" value={project.pharmacy} onChange={v => setProject(p => ({ ...p, pharmacy: v }))} />
                <TextInp label="Intitulé du plan / période" value={project.plan} onChange={v => setProject(p => ({ ...p, plan: v }))} />
                <Field label="Logo de l'officine (global)">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <label style={{ ...inp, cursor: 'pointer', textAlign: 'center', flex: 1 }}>
                      {project.logo ? 'Changer le logo' : '⬆ Téléverser un logo'}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadPharmaLogo(e.target.files[0])} />
                    </label>
                    {project.logo && <button onClick={() => setProject(p => ({ ...p, logo: null }))} style={{ padding: '7px 10px', background: '#7f1d1d', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>✕</button>}
                  </div>
                </Field>
                <div style={{ marginTop: 20, padding: 12, background: '#0b1220', borderRadius: 8, border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                    👉 Cliquez sur une <strong style={{ color: '#e2e8f0' }}>étiquette</strong> pour l&apos;éditer, puis sur un <strong style={{ color: '#e2e8f0' }}>élément</strong> (texte, prix, badge) pour le déplacer et le personnaliser.
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <button onClick={() => { if (confirm('Réinitialiser toute la planche ?')) setProject(defaultProject()); }}
                    style={{ width: '100%', padding: '8px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    ↺ Réinitialiser la planche
                  </button>
                </div>
              </>
            ) : (
              /* ===== Éditeur d'étiquette ===== */
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <SectionTitle>Étiquette sélectionnée</SectionTitle>
                  <button onClick={() => { setSelLabel(null); setSelEl(null); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16 }}>✕</button>
                </div>

                {/* Type */}
                <Field label="Type de promotion">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                    {TYPES.map(t => {
                      const on = current.type === t.id;
                      return (
                        <button key={t.id} onClick={() => changeType(t.id)}
                          style={{ padding: '7px 6px', background: on ? `${t.color}22` : '#1e293b', border: `1px solid ${on ? t.color : '#334155'}`, borderRadius: 6, cursor: 'pointer', fontSize: 10.5, fontWeight: 700, color: on ? '#f8fafc' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span>{t.icon}</span>{t.label}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                {/* Contenu */}
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: 12, marginTop: 6 }}>
                  <SectionTitle>Contenu</SectionTitle>
                  <ContentForm l={current} set={setData} />
                </div>

                {/* Couleurs label */}
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: 12 }}>
                  <SectionTitle>Couleurs de l&apos;étiquette</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <ColorRow label="Accent" value={current.accent} onChange={setAccent} />
                    <ColorRow label="Fond" value={current.bg} onChange={setBg} />
                  </div>
                </div>

                {/* Logo marque + pictos */}
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: 12 }}>
                  <SectionTitle>Logo marque & pictos</SectionTitle>
                  <label style={{ ...inp, cursor: 'pointer', textAlign: 'center', display: 'block', marginBottom: 10 }}>
                    ⬆ Logo de marque / labo
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadBrandLogo(e.target.files[0])} />
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {BADGES.map(b => (
                      <button key={b.t} onClick={() => addBadge(b.t, b.bg)}
                        style={{ padding: '4px 8px', background: b.bg, color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 9.5, fontWeight: 800 }}>
                        {b.t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style élément sélectionné */}
                {currentEl && (
                  <div style={{ borderTop: '1px solid #1e293b', paddingTop: 12, marginTop: 4 }}>
                    <SectionTitle>✦ Élément : {currentEl.kind === 'image' ? 'logo / image' : (currentEl.text ? `« ${currentEl.text.slice(0, 18)} »` : currentEl.kind)}</SectionTitle>
                    <ElementEditor el={currentEl} patch={patchEl} />
                  </div>
                )}

                {/* Actions étiquette */}
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: 12, marginTop: 6, display: 'flex', gap: 8 }}>
                  <button onClick={duplicateLabel} style={{ flex: 1, padding: '8px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>⧉ Dupliquer</button>
                  <button onClick={deleteLabel} style={{ flex: 1, padding: '8px', background: '#7f1d1d', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>🗑 Supprimer</button>
                </div>
              </>
            )}
          </div>
          <div style={{ padding: '8px 18px', borderTop: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontSize: 10, color: '#475569' }}>Sauvegarde automatique locale</span>
          </div>
        </aside>
      </div>

      {/* ════════ ZONE D'IMPRESSION ════════ */}
      <div id="print-root" style={{ display: 'none' }}>
        <Planche
          project={project} scale={1} editing={false}
          selLabel={null} selEl={null} setSelLabel={() => {}} setSelEl={() => {}}
          onAdd={() => {}} dragStart={() => {}} delEl={() => {}} forPrint
        />
      </div>

      {/* ════════ MODALE IMPORT ════════ */}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={(labels) => {
        setProject(p => ({ ...p, labels: [...p.labels, ...labels].slice(0, p.cols * p.rows) }));
        setShowImport(false);
      }} />}

      {/* CSS impression */}
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          #studio { display: none !important; }
          #print-root { display: block !important; }
        }
        input[type=range] { accent-color: #16a34a; }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
//  ÉDITEUR D'ÉLÉMENT (contrôle total)
// ──────────────────────────────────────────────────────────────────────

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input type="color" value={value.length === 7 ? value : '#000000'} onChange={e => onChange(e.target.value)}
          style={{ width: 34, height: 28, border: '1px solid #334155', borderRadius: 4, background: 'none', cursor: 'pointer', padding: 2 }} />
        <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>{value}</span>
      </div>
    </Field>
  );
}

function Slider({ label, value, min, max, step, onChange, suffix }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <Field label={`${label} : ${value}${suffix || ''}`}>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} style={{ width: '100%' }} />
    </Field>
  );
}

function ElementEditor({ el, patch }: { el: El; patch: (p: Partial<El>) => void }) {
  return (
    <>
      {el.kind === 'text' || el.kind === 'pill' ? (
        <>
          <Field label="Texte">
            <input value={el.text || ''} onChange={e => patch({ text: e.target.value })} style={inp} />
          </Field>
          <Field label="Police">
            <select value={el.font} onChange={e => patch({ font: e.target.value })} style={{ ...inp, cursor: 'pointer' }}>
              {FONTS.map(f => <option key={f.name} value={f.css}>{f.name}</option>)}
            </select>
          </Field>
          <Slider label="Taille" value={Math.round(el.size * 1000) / 10} min={2} max={55} step={0.5} suffix="%" onChange={v => patch({ size: v / 100 })} />
          <Field label="Graisse">
            <div style={{ display: 'flex', gap: 5 }}>
              {[{ v: 400, t: 'Normal' }, { v: 700, t: 'Gras' }, { v: 900, t: 'Extra' }].map(g => (
                <button key={g.v} onClick={() => patch({ weight: g.v })}
                  style={{ flex: 1, padding: '6px', background: el.weight === g.v ? '#16a34a' : '#1e293b', color: el.weight === g.v ? '#fff' : '#94a3b8', border: '1px solid #334155', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: g.v }}>{g.t}</button>
              ))}
            </div>
          </Field>
          <Field label="Alignement">
            <div style={{ display: 'flex', gap: 5 }}>
              {(['left', 'center', 'right'] as Align[]).map(al => (
                <button key={al} onClick={() => patch({ align: al })}
                  style={{ flex: 1, padding: '6px', background: el.align === al ? '#16a34a' : '#1e293b', color: el.align === al ? '#fff' : '#94a3b8', border: '1px solid #334155', borderRadius: 5, cursor: 'pointer', fontSize: 13 }}>
                  {al === 'left' ? '⬅' : al === 'center' ? '↔' : '➡'}
                </button>
              ))}
            </div>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <ColorRow label="Couleur texte" value={el.color} onChange={c => patch({ color: c })} />
            {el.kind === 'pill' && <ColorRow label="Fond pastille" value={el.bg || '#000000'} onChange={c => patch({ bg: c })} />}
          </div>
        </>
      ) : null}

      {el.kind === 'box' && (
        <ColorRow label="Couleur de la bande" value={el.bg || '#000000'} onChange={c => patch({ bg: c })} />
      )}

      {el.kind === 'image' && (
        <Slider label="Largeur" value={Math.round(el.w || 28)} min={8} max={90} step={1} suffix="%" onChange={v => patch({ w: v })} />
      )}

      <Slider label="Rotation" value={el.rot} min={-30} max={30} step={1} suffix="°" onChange={v => patch({ rot: v })} />

      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <span style={{ fontSize: 10, color: '#64748b', alignSelf: 'center', fontFamily: SYS }}>Position : glissez l&apos;élément sur l&apos;étiquette ✋</span>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────
//  IMPORT CSV / EXCEL (collage)
// ──────────────────────────────────────────────────────────────────────

function parseTable(text: string): string[][] {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim().length);
  // détecte le séparateur : tab (Excel collé), point-virgule (Excel FR), virgule
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
    if (rows.length < 1) return;
    // 1re ligne = en-têtes (si non numérique en 2e colonne)
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

  const onFile = (f: File) => {
    const r = new FileReader();
    r.onload = () => setText(r.result as string);
    r.readAsText(f);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SYS }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 560, maxWidth: '92vw', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 24, color: '#e2e8f0' }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Importer des produits</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>Collez directement depuis Excel (Ctrl+V), ou importez un fichier <strong>.csv</strong>. Séparateur virgule, point-virgule ou tabulation détecté automatiquement.</div>

        <Field label="Type d'étiquette à générer">
          <select value={type} onChange={e => setType(e.target.value as PromoType)} style={{ ...inp, cursor: 'pointer' }}>
            {TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </Field>

        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6, fontFamily: 'monospace' }}>
          Colonnes attendues : {
            type === 'prix-promo' ? 'Produit ; Prix normal ; Prix promo ; Réf' :
            type === 'remise-marque' ? 'Produit ; Marque ; Remise% ; Prix normal' :
            type === 'remise-lot' ? 'Produit ; Qté ; Offerts ; Prix unit. ; Prix lot' :
            type === 'bon-reduction' ? 'Produit ; Valeur ; Validité' :
            'Produit ; Q1 ; P1 ; Q2 ; P2 ; Q3 ; P3'
          }
        </div>

        <textarea value={text} onChange={e => setText(e.target.value)} placeholder={example} rows={7}
          style={{ ...inp, resize: 'vertical', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5 }} />

        <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center' }}>
          <label style={{ ...inp, width: 'auto', cursor: 'pointer', padding: '8px 14px' }}>
            📁 Fichier .csv
            <input type="file" accept=".csv,text/csv,text/plain" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ padding: '9px 16px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Annuler</button>
          <button onClick={build} style={{ padding: '9px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 800 }}>Générer les étiquettes</button>
        </div>
      </div>
    </div>
  );
}
