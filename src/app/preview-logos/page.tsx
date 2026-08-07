'use client';
/* Page d'audit visuel (dev), pendant de /preview pour le logo du laboratoire.
   Le croisement qui compte : 5 formats × des logos de FORMES très différentes (carré comme
   Sanofi, long et plat comme Roger & Gallet) × des noms de produit de 1, 2 et 3 lignes.
   Ce sont les cas qui faisaient déborder l'ancienne pose en surimpression — le logo tombait
   sur le bandeau, sur le prix ou sur le prix barré selon la longueur du nom.
   Les laboratoires sont pris dans le vrai catalogue, via findLab, pas simulés. */
import { LabelView, optsFor, newLabel, FORMATS, type Project, type PromoType } from '../page';
import { findLab, logoUrl } from '@/lib/logos';

// Choisis pour leurs FORMES de logo, pas pour leur notoriété.
const CAS: { produit: string; note: string }[] = [
  { produit: 'Doliprane', note: 'nom court · logo Opella' },
  { produit: 'Eau Thermale AVÈNE Hydrance légère', note: '2 lignes · logo large' },
  { produit: 'Magnésium B6 SANOFI', note: 'logo CARRÉ — le cas qui débordait' },
  { produit: 'Gel douche ROGER & GALLET Bois d’Orange fraîcheur', note: '3 lignes · logo très plat' },
  { produit: 'Crème mains NEUTROGENA concentrée sans parfum tube', note: '3 lignes' },
  { produit: 'Shampooing KLORANE à l’ortie blanche cheveux gras', note: '3 lignes · logo plat' },
  { produit: 'Couches PAMPERS Baby-Dry T4', note: 'marque produit' },
  { produit: 'Protections TENA Lady Discreet', note: 'marque produit' },
];

const P: Project = {
  pharmacy: 'Pharmacie Test', plan: '', logo: null,
  disclaimer: '*Dans la limite des stocks disponibles.',
  pageFormat: 'A4', labelWmm: 210, labelHmm: 297, theme: 'hdf',
  dateStart: '15/07/2026', dateEnd: '31/07/2026', labels: [],
};

const DATA = {
  category: 'DERMO-COSMÉTIQUE', qtyLabel: 'Flacon 250 ml',
  normalPrice: '19,90', promoPrice: '14,90',
};

export default function PreviewLogos() {
  const noop = () => {};
  return (
    <div style={{ padding: 16, background: '#475569', fontFamily: 'system-ui' }} data-theme="hdf">
      <h2 style={{ color: '#fff', margin: '4px 0 12px', fontSize: 18 }}>
        Logo du laboratoire — 5 formats × formes de logo × longueur du nom
      </h2>
      {CAS.map(cas => {
        const m = findLab(cas.produit);
        return (
          <div key={cas.produit} style={{ marginBottom: 22 }}>
            <div style={{ color: '#e2e8f0', fontSize: 12, marginBottom: 6 }}>
              <strong>{cas.produit}</strong>
              <span style={{ color: m.status === 'found' ? '#4ade80' : '#fca5a5', marginLeft: 10 }}>
                {m.status === 'found' ? `🏷 ${m.name}` : '— aucun logo —'}
              </span>
              <span style={{ color: '#94a3b8', marginLeft: 10 }}>{cas.note}</span>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {FORMATS.map(f => {
                const type: PromoType = 'prix-promo';
                const label = newLabel(type, {
                  ...DATA, product: cas.produit,
                  labLogo: m.status === 'found' && m.image ? logoUrl(m.image) : '',
                }, { w: f.w, h: f.h });
                const scale = 250 / Math.max(f.w, f.h);
                return (
                  <div key={f.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ color: '#cbd5e1', fontSize: 10 }}>{f.name}</div>
                    <LabelView label={label} W={f.w * scale} H={f.h * scale} editing={false}
                      opts={optsFor(label, P, false)} selectedLabel={false} selectedEl={null}
                      onSelectLabel={noop} onSelectEl={noop} onDragStart={noop} onDelEl={noop} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
