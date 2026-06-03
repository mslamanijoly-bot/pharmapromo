'use client';
import { useState, useRef, CSSProperties } from 'react';

// ═══════════════════════════════════════════════════════════
//  TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════

type PromoType = 'prix-promo' | 'remise-marque' | 'bon-reduction' | 'remise-lot' | 'multi-achat';

interface SizeDef {
  id: string; name: string; dim: string;
  pw: number; ph: number;   // physical px at 96dpi
  scale: number;            // screen preview scale factor
  printW: string; printH: string;
}

const SIZES: SizeDef[] = [
  { id: 'S',  name: 'S',  dim: '5×3 cm',   pw: 190, ph: 114, scale: 2.1,  printW: '5cm',  printH: '3cm'  },
  { id: 'M',  name: 'M',  dim: '9×5 cm',   pw: 341, ph: 189, scale: 1.35, printW: '9cm',  printH: '5cm'  },
  { id: 'L',  name: 'L',  dim: '13×7 cm',  pw: 492, ph: 265, scale: 1.05, printW: '13cm', printH: '7cm'  },
  { id: 'XL', name: 'XL', dim: '20×10 cm', pw: 756, ph: 378, scale: 0.78, printW: '20cm', printH: '10cm' },
];

const TYPES = [
  { id: 'prix-promo'    as PromoType, label: 'Prix Promo',       icon: '🏷️', color: '#dc2626', bg: '#fee2e2', desc: 'Prix barré + nouveau prix' },
  { id: 'remise-marque' as PromoType, label: 'Remise Marque',    icon: '🎯', color: '#1d4ed8', bg: '#dbeafe', desc: 'Remise accordée par le fabricant' },
  { id: 'bon-reduction' as PromoType, label: 'Bon de Réduction', icon: '✂️', color: '#15803d', bg: '#dcfce7', desc: 'Coupon détachable avec valeur' },
  { id: 'remise-lot'    as PromoType, label: 'Remise Lot',       icon: '📦', color: '#c2410c', bg: '#ffedd5', desc: '2+1 gratuit ou pack multi-unités' },
  { id: 'multi-achat'   as PromoType, label: 'Multi-Achat',      icon: '📊', color: '#6d28d9', bg: '#ede9fe', desc: 'Tarification dégressive par palier' },
];

interface Data {
  product: string; sku: string; brand: string;
  normalPrice: string; promoPrice: string;
  brandDiscount: string; brandColor: string;
  couponValue: string; couponExpiry: string; couponConditions: string;
  lotQty: string; lotFree: string; lotPrice: string; unitPrice: string;
  t1q: string; t1p: string; t2q: string; t2p: string; t3q: string; t3p: string;
}

const DEF: Data = {
  product: 'Doliprane 1000mg', sku: '3400935959755', brand: 'Sanofi',
  normalPrice: '12,50', promoPrice: '8,75',
  brandDiscount: '20', brandColor: '#1d4ed8',
  couponValue: '2,00', couponExpiry: '31/12/2026',
  couponConditions: 'Valable sur présentation. Non cumulable.',
  lotQty: '3', lotFree: '1', lotPrice: '19,98', unitPrice: '9,99',
  t1q: '1', t1p: '9,90', t2q: '2', t2p: '8,50', t3q: '3', t3p: '7,90',
};

// ═══════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════

const pf = (s: string) => parseFloat(s.replace(',', '.')) || 0;
const ff = (n: number) => n.toFixed(2).replace('.', ',');

// ═══════════════════════════════════════════════════════════
//  BARCODE VISUAL
// ═══════════════════════════════════════════════════════════

function Barcode({ width, height }: { width: number; height: number }) {
  const bars = [1,0,1,1,0,1,0,1,1,0,1,0,1,0,0,1,1,0,1,0,1,1,0,1,0,1,1,0,0,1,1,0,1,0,1,1,0];
  const bw = width / bars.length;
  return (
    <div style={{ width, height, display: 'flex', flexShrink: 0 }}>
      {bars.map((v, i) => (
        <div key={i} style={{ width: bw, height: '100%', background: v ? '#1f2937' : 'transparent' }} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  LABEL: PRIX PROMO
// ═══════════════════════════════════════════════════════════

function PrixPromoLabel({ d, s }: { d: Data; s: SizeDef }) {
  const { pw: w, ph: h } = s;
  const normal = pf(d.normalPrice);
  const promo  = pf(d.promoPrice);
  const pct    = normal > 0 ? Math.round((1 - promo / normal) * 100) : 0;
  const saving = normal > promo ? ff(normal - promo) : null;

  return (
    <div style={{ width: w, height: h, background: '#fff', border: '2px solid #dc2626', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      {/* Header rouge */}
      <div style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', height: h * 0.26, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${w * 0.05}px`, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: h * 0.14, fontWeight: 900, letterSpacing: '0.12em' }}>PROMO</div>
          <div style={{ fontSize: h * 0.07, opacity: 0.85, letterSpacing: '0.05em' }}>PRIX SPÉCIAL</div>
        </div>
        {pct > 0 && (
          <div style={{ background: '#fff', color: '#dc2626', fontWeight: 900, fontSize: h * 0.13, borderRadius: '50%', width: h * 0.26, height: h * 0.26, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontSize: h * 0.08 }}>-</span>
            <span style={{ fontSize: h * 0.11 }}>{pct}%</span>
          </div>
        )}
      </div>

      {/* Corps */}
      <div style={{ flex: 1, padding: `${h * 0.05}px ${w * 0.05}px`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: h * 0.12, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>{d.product || 'Nom du produit'}</div>
          {d.sku && <div style={{ fontSize: h * 0.07, color: '#9ca3af', marginTop: h * 0.02 }}>Réf : {d.sku}</div>}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: w * 0.04, marginTop: h * 0.03 }}>
          {normal > 0 && (
            <span style={{ fontSize: h * 0.11, color: '#d1d5db', textDecoration: 'line-through', fontWeight: 500 }}>
              {d.normalPrice} €
            </span>
          )}
          <span style={{ fontSize: h * 0.3, fontWeight: 900, color: '#dc2626', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {d.promoPrice} €
          </span>
        </div>

        {saving && (
          <div style={{ display: 'flex', alignItems: 'center', gap: w * 0.02 }}>
            <div style={{ width: w * 0.02, height: h * 0.05, background: '#15803d', borderRadius: 2, flexShrink: 0 }} />
            <span style={{ fontSize: h * 0.08, color: '#15803d', fontWeight: 700 }}>Économisez {saving} €</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  LABEL: REMISE MARQUE
// ═══════════════════════════════════════════════════════════

function RemiseMarqueLabel({ d, s }: { d: Data; s: SizeDef }) {
  const { pw: w, ph: h } = s;
  const color   = d.brandColor || '#1d4ed8';
  const normal  = pf(d.normalPrice);
  const disc    = pf(d.brandDiscount);
  const newPrice = (normal > 0 && disc > 0) ? ff(normal * (1 - disc / 100)) : null;

  return (
    <div style={{ width: w, height: h, background: '#fff', border: `2px solid ${color}`, borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      {/* Header marque */}
      <div style={{ background: `linear-gradient(135deg,${color},${color}cc)`, color: '#fff', height: h * 0.26, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: `0 ${w * 0.05}px`, flexShrink: 0 }}>
        <div style={{ fontSize: h * 0.14, fontWeight: 900, letterSpacing: '0.05em' }}>{d.brand || 'MARQUE'}</div>
        <div style={{ fontSize: h * 0.07, opacity: 0.85, letterSpacing: '0.08em' }}>REMISE FABRICANT</div>
      </div>

      {/* Zone remise */}
      <div style={{ flex: 1, background: `${color}0d`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: h * 0.02 }}>
        <div style={{ fontSize: h * 0.38, fontWeight: 900, color, lineHeight: 1 }}>
          -{d.brandDiscount || '0'}%
        </div>
        <div style={{ fontSize: h * 0.09, color: '#374151', textAlign: 'center', padding: `0 ${w * 0.06}px`, lineHeight: 1.3 }}>
          {d.product || 'Sur le produit sélectionné'}
        </div>
      </div>

      {/* Comparatif prix */}
      {newPrice && normal > 0 && (
        <div style={{ height: h * 0.24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-evenly', borderTop: `2px solid ${color}25`, background: '#fff' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: h * 0.07, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avant</div>
            <div style={{ fontSize: h * 0.12, color: '#9ca3af', textDecoration: 'line-through' }}>{d.normalPrice} €</div>
          </div>
          <div style={{ fontSize: h * 0.16, color, fontWeight: 900 }}>→</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: h * 0.07, color, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Après</div>
            <div style={{ fontSize: h * 0.16, fontWeight: 900, color }}>{newPrice} €</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  LABEL: BON DE RÉDUCTION
// ═══════════════════════════════════════════════════════════

function BonReductionLabel({ d, s }: { d: Data; s: SizeDef }) {
  const { pw: w, ph: h } = s;
  const green = '#15803d';

  return (
    <div style={{ width: w, height: h, background: '#fff', border: `2.5px dashed ${green}`, borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      {/* Ligne de découpe */}
      <div style={{ height: h * 0.1, flexShrink: 0, display: 'flex', alignItems: 'center', padding: `0 ${w * 0.04}px`, gap: w * 0.02, borderBottom: `1px dashed ${green}50` }}>
        <span style={{ fontSize: h * 0.1, userSelect: 'none', lineHeight: 1 }}>✂</span>
        <div style={{ flex: 1, height: 1, backgroundImage: `repeating-linear-gradient(to right, ${green}60 0, ${green}60 4px, transparent 4px, transparent 8px)` }} />
        <span style={{ fontSize: h * 0.07, color: green, fontWeight: 600, fontStyle: 'italic' }}>découpez ici</span>
      </div>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg,${green},#166534)`, color: '#fff', height: h * 0.2, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: h * 0.12, fontWeight: 900, letterSpacing: '0.08em' }}>BON DE RÉDUCTION</span>
      </div>

      {/* Valeur */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: w * 0.01 }}>
        <span style={{ fontSize: h * 0.42, fontWeight: 900, color: green, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{d.couponValue}</span>
        <span style={{ fontSize: h * 0.22, fontWeight: 700, color: green, alignSelf: 'flex-start', marginTop: h * 0.06 }}>€</span>
      </div>

      {/* Produit */}
      <div style={{ padding: `0 ${w * 0.05}px`, fontSize: h * 0.09, fontWeight: 600, color: '#374151', textAlign: 'center', marginBottom: h * 0.02 }}>
        Sur : {d.product || 'le produit'}
      </div>

      {/* Footer */}
      <div style={{ padding: `${h * 0.03}px ${w * 0.04}px`, borderTop: `1px dashed ${green}40`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: w * 0.02 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: h * 0.065, color: '#6b7280', lineHeight: 1.4 }}>{d.couponConditions}</div>
          <div style={{ fontSize: h * 0.07, color: green, fontWeight: 700, marginTop: h * 0.01 }}>
            Valable jusqu'au {d.couponExpiry}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Barcode width={w * 0.28} height={h * 0.1} />
          <span style={{ fontSize: h * 0.055, color: '#9ca3af', letterSpacing: '0.05em' }}>1234567890</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  LABEL: REMISE LOT
// ═══════════════════════════════════════════════════════════

function RemiseLotLabel({ d, s }: { d: Data; s: SizeDef }) {
  const { pw: w, ph: h } = s;
  const orange = '#c2410c';
  const qty    = Math.max(2, parseInt(d.lotQty) || 3);
  const free   = Math.max(1, parseInt(d.lotFree) || 1);
  const paid   = Math.max(1, qty - free);
  const unit   = pf(d.unitPrice);
  const totalN = unit > 0 ? ff(unit * qty) : null;
  const saving = unit > 0 ? ff(unit * free) : null;

  const boxes = Array.from({ length: Math.min(qty, 6) });

  return (
    <div style={{ width: w, height: h, background: '#fff', border: `2px solid ${orange}`, borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg,${orange},#9a3412)`, color: '#fff', height: h * 0.24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${w * 0.05}px` }}>
        <div>
          <div style={{ fontSize: h * 0.14, fontWeight: 900 }}>LOT ÉCONOMIQUE</div>
          <div style={{ fontSize: h * 0.075, opacity: 0.9 }}>
            {paid} acheté{paid > 1 ? 's' : ''} + {free} offert{free > 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ background: '#fff', color: orange, fontWeight: 900, fontSize: h * 0.1, padding: `${h * 0.04}px ${w * 0.04}px`, borderRadius: 5, textAlign: 'center', lineHeight: 1.2 }}>
          <div style={{ fontSize: h * 0.07 }}>LOT</div>
          <div>×{qty}</div>
        </div>
      </div>

      {/* Produit */}
      <div style={{ padding: `${h * 0.04}px ${w * 0.05}px 0`, fontSize: h * 0.1, fontWeight: 700, color: '#111827' }}>
        {d.product || 'Nom du produit'}
      </div>

      {/* Visuel unités */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: w * 0.025, padding: `0 ${w * 0.05}px` }}>
        {boxes.map((_, i) => {
          const isOffer = i >= paid;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: h * 0.02 }}>
              <div style={{ width: h * 0.19, height: h * 0.22, border: `2px solid ${isOffer ? '#15803d' : orange}`, borderRadius: 4, background: isOffer ? '#dcfce7' : `${orange}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: h * 0.13 }}>
                {isOffer ? '🎁' : '📦'}
              </div>
              <div style={{ fontSize: h * 0.07, fontWeight: 700, color: isOffer ? '#15803d' : orange }}>
                {isOffer ? 'OFFERT' : (unit > 0 ? `${d.unitPrice}€` : '···')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Prix */}
      <div style={{ padding: `${h * 0.03}px ${w * 0.05}px`, borderTop: `1px solid ${orange}25`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {totalN && <div style={{ fontSize: h * 0.07, color: '#9ca3af', textDecoration: 'line-through' }}>Au lieu de {totalN} €</div>}
          <div style={{ fontSize: h * 0.2, fontWeight: 900, color: orange, lineHeight: 1.1 }}>
            {d.lotPrice} € <span style={{ fontSize: h * 0.08, fontWeight: 400 }}>le lot</span>
          </div>
        </div>
        {saving && (
          <div style={{ background: '#dcfce7', color: '#15803d', fontSize: h * 0.08, fontWeight: 700, padding: `${h * 0.04}px ${w * 0.04}px`, borderRadius: 6, textAlign: 'center', border: '1px solid #86efac' }}>
            <div>Économie</div>
            <div style={{ fontSize: h * 0.12 }}>{saving} €</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  LABEL: MULTI-ACHAT
// ═══════════════════════════════════════════════════════════

function MultiAchatLabel({ d, s }: { d: Data; s: SizeDef }) {
  const { pw: w, ph: h } = s;
  const purple = '#6d28d9';

  const tiers = [
    { qty: d.t1q, price: d.t1p, last: false },
    { qty: d.t2q, price: d.t2p, last: false },
    { qty: d.t3q, price: d.t3p, last: true  },
  ];

  const p1   = pf(d.t1p);
  const pMin = Math.min(pf(d.t2p), pf(d.t3p));
  const savMax = (p1 > 0 && pMin > 0 && p1 > pMin) ? ff(p1 - pMin) : null;

  return (
    <div style={{ width: w, height: h, background: '#fff', border: `2px solid ${purple}`, borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg,${purple},#5b21b6)`, color: '#fff', height: h * 0.24, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: `0 ${w * 0.05}px` }}>
        <div style={{ fontSize: h * 0.13, fontWeight: 900 }}>OFFRE MULTI-ACHAT</div>
        <div style={{ fontSize: h * 0.07, opacity: 0.85 }}>Plus vous achetez, plus vous économisez</div>
      </div>

      {/* Produit */}
      <div style={{ padding: `${h * 0.04}px ${w * 0.05}px ${h * 0.02}px`, fontSize: h * 0.1, fontWeight: 700, color: '#111827' }}>
        {d.product || 'Nom du produit'}
      </div>

      {/* Tableau paliers */}
      <div style={{ flex: 1, display: 'flex', margin: `0 ${w * 0.04}px`, border: `1.5px solid ${purple}35`, borderRadius: 5, overflow: 'hidden' }}>
        {tiers.map((t, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: i < 2 ? `1px solid ${purple}25` : 'none' }}>
            <div style={{ background: t.last ? purple : `${purple}${i === 0 ? '20' : '38'}`, color: t.last ? '#fff' : purple, padding: `${h * 0.04}px 0`, textAlign: 'center', fontWeight: 700, fontSize: h * 0.09 }}>
              {t.qty} pce{parseInt(t.qty) > 1 ? 's' : ''}
              {t.last && <div style={{ fontSize: h * 0.065, opacity: 0.85 }}>et +</div>}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: t.last ? `${purple}10` : '#fff', gap: 2 }}>
              <div style={{ fontSize: h * 0.2, fontWeight: 900, color: purple, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {t.price}€
              </div>
              <div style={{ fontSize: h * 0.07, color: '#9ca3af' }}>/ pièce</div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: `${h * 0.03}px ${w * 0.05}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {savMax ? (
          <div style={{ fontSize: h * 0.08, color: '#15803d', fontWeight: 700, textAlign: 'center' }}>
            ✓ Économisez jusqu'à {savMax} € par pièce
          </div>
        ) : (
          <div style={{ fontSize: h * 0.075, color: '#9ca3af', textAlign: 'center' }}>
            Offre valable en pharmacie
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  FORM HELPERS
// ═══════════════════════════════════════════════════════════

const inputStyle: CSSProperties = {
  width: '100%', padding: '7px 10px',
  background: '#1e293b', color: '#e2e8f0',
  border: '1px solid #334155', borderRadius: 5,
  fontSize: 13, boxSizing: 'border-box',
};
const labelStyle: CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 700,
  color: '#64748b', marginBottom: 4,
  textTransform: 'uppercase', letterSpacing: '0.07em',
};
const fieldStyle: CSSProperties = { marginBottom: 10 };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function Inp({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <Field label={label}>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </Field>
  );
}

function Col({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: 38, height: 28, border: '1px solid #334155', borderRadius: 4, background: 'none', cursor: 'pointer', padding: 2 }} />
        <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{value}</span>
      </div>
    </Field>
  );
}

// ═══════════════════════════════════════════════════════════
//  FORMS
// ═══════════════════════════════════════════════════════════

type Setter = (k: keyof Data, v: string) => void;

function FormPrixPromo({ d, set }: { d: Data; set: Setter }) {
  return <>
    <Inp label="Nom du produit" value={d.product} onChange={v => set('product', v)} placeholder="Ex: Doliprane 1000mg" />
    <Inp label="Référence / Code-barres" value={d.sku} onChange={v => set('sku', v)} placeholder="3400935959755" />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <Inp label="Prix normal (€)" value={d.normalPrice} onChange={v => set('normalPrice', v)} placeholder="12,50" />
      <Inp label="Prix promo (€)" value={d.promoPrice} onChange={v => set('promoPrice', v)} placeholder="8,75" />
    </div>
    {pf(d.normalPrice) > 0 && pf(d.promoPrice) > 0 && (
      <div style={{ background: '#0d2137', border: '1px solid #1e3a5f', borderRadius: 5, padding: '8px 10px', fontSize: 12, color: '#38bdf8' }}>
        📊 Remise : {Math.round((1 - pf(d.promoPrice)/pf(d.normalPrice))*100)}% — Économie : {ff(pf(d.normalPrice)-pf(d.promoPrice))} €
      </div>
    )}
  </>;
}

function FormRemiseMarque({ d, set }: { d: Data; set: Setter }) {
  return <>
    <Inp label="Marque" value={d.brand} onChange={v => set('brand', v)} placeholder="Ex: Sanofi, Boiron..." />
    <Inp label="Nom du produit" value={d.product} onChange={v => set('product', v)} />
    <Inp label="Remise fabricant (%)" value={d.brandDiscount} onChange={v => set('brandDiscount', v)} placeholder="20" />
    <Inp label="Prix normal (€)" value={d.normalPrice} onChange={v => set('normalPrice', v)} placeholder="12,50" />
    <Col label="Couleur de la marque" value={d.brandColor} onChange={v => set('brandColor', v)} />
  </>;
}

function FormBonReduction({ d, set }: { d: Data; set: Setter }) {
  return <>
    <Inp label="Nom du produit" value={d.product} onChange={v => set('product', v)} />
    <Inp label="Valeur du bon (€)" value={d.couponValue} onChange={v => set('couponValue', v)} placeholder="2,00" />
    <Inp label="Date de validité" value={d.couponExpiry} onChange={v => set('couponExpiry', v)} placeholder="31/12/2026" />
    <Field label="Conditions d'utilisation">
      <textarea value={d.couponConditions} onChange={e => set('couponConditions', e.target.value)} rows={2}
        style={{ ...inputStyle, resize: 'none' }} />
    </Field>
  </>;
}

function FormRemiseLot({ d, set }: { d: Data; set: Setter }) {
  return <>
    <Inp label="Nom du produit" value={d.product} onChange={v => set('product', v)} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <Inp label="Quantité totale" value={d.lotQty} onChange={v => set('lotQty', v)} placeholder="3" />
      <Inp label="Dont offert(s)" value={d.lotFree} onChange={v => set('lotFree', v)} placeholder="1" />
      <Inp label="Prix unitaire (€)" value={d.unitPrice} onChange={v => set('unitPrice', v)} placeholder="9,99" />
      <Inp label="Prix du lot (€)" value={d.lotPrice} onChange={v => set('lotPrice', v)} placeholder="19,98" />
    </div>
  </>;
}

function FormMultiAchat({ d, set }: { d: Data; set: Setter }) {
  return <>
    <Inp label="Nom du produit" value={d.product} onChange={v => set('product', v)} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <Inp label="Palier 1 — Qté" value={d.t1q} onChange={v => set('t1q', v)} placeholder="1" />
      <Inp label="Palier 1 — Prix" value={d.t1p} onChange={v => set('t1p', v)} placeholder="9,90" />
      <Inp label="Palier 2 — Qté" value={d.t2q} onChange={v => set('t2q', v)} placeholder="2" />
      <Inp label="Palier 2 — Prix" value={d.t2p} onChange={v => set('t2p', v)} placeholder="8,50" />
      <Inp label="Palier 3 — Qté" value={d.t3q} onChange={v => set('t3q', v)} placeholder="3" />
      <Inp label="Palier 3 — Prix" value={d.t3p} onChange={v => set('t3p', v)} placeholder="7,90" />
    </div>
  </>;
}

// ═══════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════

export default function Home() {
  const [type, setType] = useState<PromoType>('prix-promo');
  const [sizeId, setSizeId] = useState('M');
  const [data, setData] = useState<Data>(DEF);
  const printRef = useRef<HTMLDivElement>(null);

  const size     = SIZES.find(s => s.id === sizeId)!;
  const typeConf = TYPES.find(t => t.id === type)!;
  const set: Setter = (k, v) => setData(prev => ({ ...prev, [k]: v }));

  function renderLabel(overrideSize?: SizeDef) {
    const s = overrideSize ?? size;
    switch (type) {
      case 'prix-promo':    return <PrixPromoLabel    d={data} s={s} />;
      case 'remise-marque': return <RemiseMarqueLabel d={data} s={s} />;
      case 'bon-reduction': return <BonReductionLabel d={data} s={s} />;
      case 'remise-lot':    return <RemiseLotLabel    d={data} s={s} />;
      case 'multi-achat':   return <MultiAchatLabel   d={data} s={s} />;
    }
  }

  function renderForm() {
    switch (type) {
      case 'prix-promo':    return <FormPrixPromo    d={data} set={set} />;
      case 'remise-marque': return <FormRemiseMarque d={data} set={set} />;
      case 'bon-reduction': return <FormBonReduction d={data} set={set} />;
      case 'remise-lot':    return <FormRemiseLot    d={data} set={set} />;
      case 'multi-achat':   return <FormMultiAchat   d={data} set={set} />;
    }
  }

  function handlePrint() {
    window.print();
  }

  const printSize = size;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui,-apple-system,sans-serif', overflow: 'hidden' }}>

      {/* ──────────────────────────────────────────────── */}
      {/* ZONE D'IMPRESSION (invisible à l'écran)         */}
      {/* ──────────────────────────────────────────────── */}
      <div id="print-label" style={{ display: 'none', position: 'fixed', top: 0, left: 0 }}>
        <div style={{ width: printSize.pw, height: printSize.ph }}>
          {renderLabel(printSize)}
        </div>
      </div>

      {/* ──────────────────────────────────────────────── */}
      {/* SIDEBAR                                          */}
      {/* ──────────────────────────────────────────────── */}
      <aside style={{ width: 308, flexShrink: 0, background: '#0f172a', display: 'flex', flexDirection: 'column', borderRight: '1px solid #1e293b', overflow: 'hidden' }}>

        {/* Logo */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#16a34a,#15803d)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, color: '#fff', fontWeight: 900 }}>✚</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.01em' }}>PharmaPROMO</div>
            <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.05em' }}>CRÉATEUR D'ÉTIQUETTES</div>
          </div>
        </div>

        {/* Scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>

          {/* Types */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              TYPE DE PROMOTION
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {TYPES.map(t => {
                const active = type === t.id;
                return (
                  <button key={t.id} onClick={() => setType(t.id)}
                    style={{ padding: '8px 12px', background: active ? `${t.color}22` : 'transparent', border: `1px solid ${active ? t.color : '#1e293b'}`, borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', transition: 'all 0.12s' }}>
                    <span style={{ fontSize: 18, lineHeight: 1 }}>{t.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: active ? '#f8fafc' : '#94a3b8' }}>{t.label}</div>
                      <div style={{ fontSize: 10, color: active ? `${t.color}cc` : '#475569' }}>{t.desc}</div>
                    </div>
                    {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.color, flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Formulaire */}
          <div style={{ borderTop: '1px solid #1e293b', paddingTop: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              INFORMATIONS
            </div>
            {renderForm()}
          </div>
        </div>

        {/* Footer sidebar */}
        <div style={{ padding: '10px 18px', borderTop: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 10, color: '#475569' }}>Aperçu en temps réel</span>
        </div>
      </aside>

      {/* ──────────────────────────────────────────────── */}
      {/* ZONE PRINCIPALE                                  */}
      {/* ──────────────────────────────────────────────── */}
      <main style={{ flex: 1, background: '#f1f5f9', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Barre du haut */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#94a3b8', marginRight: 4, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Taille</span>
            {SIZES.map(sz => {
              const active = sizeId === sz.id;
              return (
                <button key={sz.id} onClick={() => setSizeId(sz.id)}
                  style={{ padding: '5px 12px', background: active ? '#0f172a' : '#fff', color: active ? '#fff' : '#374151', border: `1px solid ${active ? '#0f172a' : '#d1d5db'}`, borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2 }}>
                  <span>{sz.name}</span>
                  <span style={{ fontSize: 9, fontWeight: 400, opacity: 0.6 }}>{sz.dim}</span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handlePrint}
              style={{ padding: '8px 20px', background: typeConf.color, color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, boxShadow: `0 2px 8px ${typeConf.color}60` }}>
              🖨️ Imprimer / PDF
            </button>
          </div>
        </div>

        {/* Aperçu centré */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: 40, background: 'radial-gradient(circle at 50% 50%, #e2e8f0 0%, #f1f5f9 70%)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            {/* Ombre + étiquette */}
            <div ref={printRef} style={{ transform: `scale(${size.scale})`, transformOrigin: 'center center', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.18))' }}>
              {renderLabel()}
            </div>
            {/* Dimensions réelles */}
            <div style={{ marginTop: size.scale > 1.5 ? size.ph * (size.scale - 1) * 0.6 : 0, fontSize: 11, color: '#94a3b8', background: '#fff', padding: '4px 12px', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              Taille réelle : <strong style={{ color: '#475569' }}>{size.printW} × {size.printH}</strong>
            </div>
          </div>
        </div>

        {/* Barre de statut */}
        <div style={{ background: '#fff', borderTop: '1px solid #e2e8f0', padding: '8px 24px', display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: typeConf.color, display: 'inline-block' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: typeConf.color }}>{typeConf.label}</span>
          </div>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Format : {size.name} — {size.printW} × {size.printH}</span>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Résolution : 96 dpi</span>
          <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 'auto' }}>
            💡 Cliquez sur <strong>Imprimer / PDF</strong> pour exporter
          </span>
        </div>
      </main>

      {/* Print CSS dynamique */}
      <style>{`
        @media print {
          @page { size: ${size.printW} ${size.printH}; margin: 0; }
          #print-label {
            display: block !important;
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: ${size.printW} !important;
            height: ${size.printH} !important;
          }
          #print-label > div {
            width: ${size.pw}px !important;
            height: ${size.ph}px !important;
            transform: scale(1) !important;
          }
        }
      `}</style>
    </div>
  );
}
