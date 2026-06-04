import { describe, it, expect } from 'vitest';
import { pf, ff, fitSize, priceParts, paginate, parseTable, chunk } from './calc';

describe('pf / ff', () => {
  it('parse les prix français', () => {
    expect(pf('12,50')).toBe(12.5);
    expect(pf('31,90')).toBeCloseTo(31.9);
    expect(pf('')).toBe(0);
    expect(pf('abc')).toBe(0);
  });
  it('formate en français', () => {
    expect(ff(8.7)).toBe('8,70');
    expect(ff(5)).toBe('5,00');
  });
});

describe('priceParts', () => {
  it('décompose et calcule la remise immédiate', () => {
    const p = priceParts('31,90', '26,90');
    expect(p.intp).toBe('26');
    expect(p.cents).toBe('90');
    expect(p.remise).toBe('5');
  });
  it('pas de remise si promo >= normal', () => {
    expect(priceParts('10', '10').remise).toBe('');
    expect(priceParts('10', '12').remise).toBe('');
  });
  it('centimes à zéro paddés', () => {
    expect(priceParts('5', '4').cents).toBe('00');
  });
});

describe('fitSize', () => {
  it('garde la taille de base pour un texte court', () => {
    expect(fitSize('Doliprane', 0.88, 0.7, 0.05)).toBe(0.05);
  });
  it('réduit pour un texte long', () => {
    const long = 'Complement Articulations Chondro-haid Fort ARKOPHARMA Glucosamine';
    expect(fitSize(long, 0.88, 0.7, 0.05)).toBeLessThan(0.05);
  });
  it('ne descend jamais sous le plancher', () => {
    const huge = 'x'.repeat(500);
    expect(fitSize(huge, 0.88, 0.7, 0.05, 2, 0.03)).toBe(0.03);
  });
});

describe('paginate', () => {
  it('réglette 200x80 → 3 par feuille A4', () => {
    const r = paginate(200, 80, 210, 297, 0, 3);
    expect(r.cols).toBe(1);
    expect(r.rows).toBe(3);
    expect(r.perPage).toBe(3);
  });
  it('A4 plein format → 1 par feuille', () => {
    expect(paginate(210, 297, 210, 297, 0, 3).perPage).toBe(1);
  });
  it('petite étiquette → plusieurs colonnes', () => {
    const r = paginate(48, 45, 210, 297, 0, 3);
    expect(r.cols).toBeGreaterThan(1);
    expect(r.perPage).toBeGreaterThan(4);
  });
});

describe('parseTable', () => {
  it('détecte le point-virgule (Excel FR)', () => {
    const rows = parseTable('Produit;Prix\nDoliprane;5,90');
    expect(rows.length).toBe(2);
    expect(rows[1]).toEqual(['Doliprane', '5,90']);
  });
  it('détecte la tabulation (collage Excel)', () => {
    expect(parseTable('A\tB\tC')[0]).toEqual(['A', 'B', 'C']);
  });
  it('ignore les lignes vides et les guillemets', () => {
    const rows = parseTable('"a","b"\n\n"c","d"');
    expect(rows).toEqual([['a', 'b'], ['c', 'd']]);
  });
});

describe('chunk', () => {
  it('découpe par pages', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});
