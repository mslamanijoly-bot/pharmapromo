// Ce que l'étiquette AFFICHE, pas ce qu'elle contient.
//
// Un prix faux imprimé en série coûte plus cher que n'importe quel bug : le multi-achat
// annonçait « 13,50 € l'unité » pour un savon à 3,50 €, parce qu'il prenait le TOTAL du
// dernier palier pour un prix unitaire. Ces tests verrouillent la lecture de chaque mécanique.
import { describe, it, expect } from 'vitest';
import { newLabel, mechOf } from '../app/page';

describe('multi-achat — les paliers sont des TOTAUX', () => {
  // « 1 = 3,50 € · 3 = 9,00 € · 5 = 13,50 € » : le savon vaut 3,50 € pièce,
  // et 2,70 € pièce si l'on en prend cinq.
  const savon = newLabel('multi-achat', {
    product: 'Savon de Marseille', t1q: '1', t1p: '3,50', t2q: '3', t2p: '9,00', t3q: '5', t3p: '13,50',
  });

  it("affiche le prix À L'UNITÉ, jamais le total du palier", () => {
    const m = mechOf(savon);
    expect(m.price).toBe('2,70');        // 13,50 / 5 — et surtout PAS 13,50
    expect(m.price).not.toBe('13,50');
  });

  it('compare au prix unitaire de référence', () => {
    expect(mechOf(savon).old).toBe('3,50 €');
  });

  it('calcule la remise sur les prix unitaires', () => {
    expect(mechOf(savon).big).toBe('-23%');   // 1 - 2,70/3,50
  });

  it('garde les paliers tels quels en pied, en totaux', () => {
    expect(mechOf(savon).foot).toBe('1 = 3,50 €   ·   3 = 9,00 €   ·   5 = 13,50 €');
  });

  it('dit à partir de quelle quantité le prix s’applique', () => {
    expect(mechOf(savon).sub).toBe('dès 5 achetés');
  });

  it('retient le palier le plus avantageux, pas le dernier saisi', () => {
    // Palier 3 volontairement MOINS bon que le palier 2 : c'est le 2 qui doit gagner.
    const m = mechOf(newLabel('multi-achat', {
      t1q: '1', t1p: '10,00', t2q: '2', t2p: '14,00', t3q: '3', t3p: '27,00',
    }));
    expect(m.price).toBe('7,00');       // 14/2 = 7,00 contre 27/3 = 9,00
    expect(m.sub).toBe('dès 2 achetés');
  });

  it('ne casse pas quand un seul palier est renseigné', () => {
    const m = mechOf(newLabel('multi-achat', { t1q: '1', t1p: '4,00', t2q: '', t2p: '', t3q: '', t3p: '' }));
    expect(m.price).toBe('4,00');
    expect(m.old).toBe('');             // aucune remise à annoncer
  });
});

describe('lot — le prix affiché est celui du lot', () => {
  it('annonce le lot et son prix unitaire en pied', () => {
    const m = mechOf(newLabel('remise-lot', {
      product: 'Gel douche', lotQty: '2', lotFree: '0', normalPrice: '5,90', lotPrice: '9,80',
    }));
    expect(m.price).toBe('9,80');
    expect(m.note).toBe('le lot de 2');
    expect(m.foot).toBe("soit 4,90 € l'unité");   // 9,80 / 2
  });

  it('bascule sur « acheté + offert » quand il y a un offert', () => {
    const m = mechOf(newLabel('remise-lot', {
      lotQty: '2', lotFree: '1', normalPrice: '19,90', lotPrice: '19,90',
    }));
    expect(m.big).toBe('+1 OFFERT');
    expect(m.sub).toBe('1 acheté + 1 offert');
  });
});

describe('2ᵉ produit — le prix affiché est celui d’UN produit', () => {
  it("montre le prix à l'unité et le total des deux en pied", () => {
    const m = mechOf(newLabel('remise-2eme', { normalPrice: '4,95', remiseManual: '50' }));
    expect(m.big).toBe('-50%');
    expect(m.price).toBe('4,95');
    expect(m.note).toBe("l'unité");
    expect(m.foot).toBe('soit 7,43 € les 2 produits');   // 4,95 + 4,95/2
  });
});

describe('bon de réduction', () => {
  it('annonce la valeur du bon, pas un prix', () => {
    const m = mechOf(newLabel('bon-reduction', { couponValue: '2,00', couponExpiry: '31/12/2026' }));
    expect(m.big).toBe('-2€');
    expect(m.price).toBe('');
    expect(m.foot).toBe("Valable jusqu'au 31/12/2026");
  });
});
