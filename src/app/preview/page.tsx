'use client';
/* Page d'audit visuel (dev) : rend chaque format × type × thème pour capture Playwright.
   Cas piège volontaire : nom de produit long + litrage, et remise -3,99 €. */
import { LabelView, optsFor, newLabel, FORMATS, type Project, type PromoType } from '../page';

const TYPES: PromoType[] = ['prix-promo', 'bon-reduction', 'remise-lot', 'multi-achat', 'remise-2eme'];
const THEMES = ['promo', 'officine'] as const;

const SAMPLE = {
  category: 'HYGIÈNE BUCCO-DENTAIRE',
  product: 'Bain de bouche Listerine',
  qtyLabel: '500 ml',
  normalPrice: '9,89', promoPrice: '5,90', // remise = -3,99 €
  couponValue: '2,00', couponExpiry: '31/12/2026',
  lotQty: '3', lotFree: '1', lotPrice: '19,98',
  t1q: '1', t1p: '9,90', t2q: '2', t2p: '8,50', t3q: '3', t3p: '7,90',
};

function proj(theme: string): Project {
  return {
    pharmacy: 'Pharmacie Test', plan: '', logo: null,
    disclaimer: '*Dans la limite des stocks disponibles.',
    pageFormat: 'A4', labelWmm: 210, labelHmm: 297, theme,
    dateStart: '01/07/2026', dateEnd: '31/07/2026', labels: [],
  };
}

export default function Preview() {
  const noop = () => {};
  return (
    <div style={{ padding: 16, background: '#475569', fontFamily: 'system-ui', display: 'flex', flexDirection: 'column', gap: 28 }}>
      {THEMES.map(theme => {
        const p = proj(theme);
        return (
          <div key={theme} data-theme={theme}>
            <h2 style={{ color: '#fff', margin: '4px 0 10px' }}>Thème {theme}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {FORMATS.map(f => (
                <div key={f.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ width: 90, color: '#e2e8f0', fontSize: 12, paddingTop: 8 }}>{f.name}<br />{f.w}×{f.h}</div>
                  {TYPES.map(t => {
                    const label = newLabel(t, SAMPLE, { w: f.w, h: f.h });
                    const scale = 240 / Math.max(f.w, f.h);
                    const W = f.w * scale, H = f.h * scale;
                    return (
                      <div key={t} data-cell={`${theme}-${f.id}-${t}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ color: '#cbd5e1', fontSize: 10 }}>{t}</div>
                        <LabelView label={label} W={W} H={H} editing={false} opts={optsFor(label, p, false)}
                          selectedLabel={false} selectedEl={null} onSelectLabel={noop} onSelectEl={noop}
                          onDragStart={noop} onDelEl={noop} />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
