import { describe, it, expect } from 'vitest';
import { pf, ff, fitSize, priceParts, paginate, parseTable, chunk, stackColumnBlocks, splitSize } from './calc';

describe('splitSize', () => {
  it('détache le litrage d\'une désignation pharmacie', () => {
    expect(splitSize('Bain de bouche Listerine F/500ML')).toEqual({ product: 'Bain de bouche Listerine', size: '500 ml' });
    expect(splitSize('Crème mains Neutrogena 75ml')).toEqual({ product: 'Crème mains Neutrogena', size: '75 ml' });
    expect(splitSize('Forcapil 60 gélules')).toEqual({ product: 'Forcapil', size: '60 gélules' });
    expect(splitSize('Eau thermale Avène B/300ML')).toEqual({ product: 'Eau thermale Avène', size: '300 ml' });
  });
  it('ne casse pas un nom sans litrage', () => {
    expect(splitSize('Magné B6')).toEqual({ product: 'Magné B6', size: '' });
    expect(splitSize('Oméga 3')).toEqual({ product: 'Oméga 3', size: '' });
    expect(splitSize('')).toEqual({ product: '', size: '' });
  });
});

describe('stackColumnBlocks', () => {
  it('empile deux tableaux côte à côte séparés par une colonne vide', () => {
    const rows = [
      ['juin-26', 'Prix Promo', 'Prix Vente', 'baisse', '', 'juin-26', 'Prix Promo', 'Prix Vente', 'baisse'],
      ['Bateau 1', '', '', '', '', 'Bateau 1', '', '', ''],
      ['Sporteine', '9,95', '11,95', '2,00', '', 'GHA gel', '9,98', '10,98', '1,00'],
    ];
    const out = stackColumnBlocks(rows);
    expect(out.length).toBe(6); // 3 lignes gauche + 3 lignes droite
    expect(out[0]).toEqual(['juin-26', 'Prix Promo', 'Prix Vente', 'baisse']);
    expect(out[2]).toEqual(['Sporteine', '9,95', '11,95', '2,00']);
    expect(out[5]).toEqual(['GHA gel', '9,98', '10,98', '1,00']);
  });
  it('laisse un tableau simple inchangé', () => {
    const rows = [['Produit', 'Prix'], ['Doliprane', '2,90']];
    expect(stackColumnBlocks(rows)).toEqual(rows);
  });
});

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
  it('respecte les virgules et retours-ligne dans les guillemets', () => {
    const rows = parseTable('Nom,Prix\n"Doliprane, fort",5,90');
    expect(rows[1][0]).toBe('Doliprane, fort');
  });
  it('gère les guillemets échappés', () => {
    expect(parseTable('"a ""b"" c";d')[0]).toEqual(['a "b" c', 'd']);
  });
  it('retire le BOM', () => {
    expect(parseTable('﻿a;b')[0]).toEqual(['a', 'b']);
  });
});

describe('chunk', () => {
  it('découpe par pages', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});
