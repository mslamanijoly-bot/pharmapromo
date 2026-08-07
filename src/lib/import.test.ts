import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import readXlsxFile from 'read-excel-file/node';
import { normalizeRows, importRows, matchPromoType } from './import';
import { AUTO_TEMPLATE, TEMPLATES, TEMPLATE_NUMERIC_HEADERS } from './templates';
import type { PromoType } from '../app/page';
import { pf } from './calc';

// Le classeur de test livré avec le dépôt, celui qu'on n'a « plus qu'à importer ».
// Régénérable par `npm run gen:xlsx` depuis AUTO_TEMPLATE.
const XLSX = join(__dirname, '..', '..', 'pharmapromo-import.xlsx');

// Relit le .xlsx exactement comme le fait l'application (readXlsx dans page.tsx) :
// même bibliothèque, même normalisation des cellules.
async function readAsApp(): Promise<string[][]> {
  const result = (await readXlsxFile(await readFile(XLSX))) as unknown;
  let rows: unknown[] = Array.isArray(result) ? result : [];
  if (rows.length && !Array.isArray(rows[0]) && typeof rows[0] === 'object' && rows[0] !== null && 'data' in (rows[0] as object)) {
    rows = ((rows[0] as { data?: unknown[] }).data) || [];
  }
  return normalizeRows(rows);
}

describe('classeur de test pharmapromo-import.xlsx', () => {
  it('correspond au modèle de l\'application (aucune dérive)', async () => {
    const rows = await readAsApp();
    expect(rows[0]).toEqual(AUTO_TEMPLATE.headers);
    expect(rows.length - 1).toBe(AUTO_TEMPLATE.rows.length);
    // Cellule à cellule : les colonnes numériques sont comparées en VALEUR (le tableur
    // stocke 12.9, le modèle écrit « 12,90 »), les autres à l'identique.
    rows.slice(1).forEach((row, i) => {
      AUTO_TEMPLATE.rows[i].forEach((expected, c) => {
        const got = row[c] || '';
        if (TEMPLATE_NUMERIC_HEADERS.has(AUTO_TEMPLATE.headers[c])) expect(pf(got)).toBe(pf(expected));
        else expect(got).toBe(expected);
      });
    });
  });

  it('couvre les 5 mécaniques, 40 produits et 27 catégories', async () => {
    const rows = await readAsApp();
    const body = rows.slice(1);
    expect(body).toHaveLength(40);
    expect(new Set(body.map(r => r[1])).size).toBe(27);
    expect(new Set(body.map(r => r[2])).size).toBe(40); // aucun produit en double
    const types = new Set(body.map(r => matchPromoType(r[0])));
    expect(types).toEqual(new Set(['prix-promo', 'bon-reduction', 'remise-lot', 'multi-achat', 'remise-2eme']));
  });
});

describe('import du classeur → étiquettes prêtes', () => {
  it('mappe toutes les colonnes sans intervention', async () => {
    const { hasHeader, mapping, typeCol, formatCol } = importRows(await readAsApp());
    expect(hasHeader).toBe(true);
    // « Type » et « Format » sont des colonnes de service, repérées à part.
    expect(typeCol).toBe(0);
    expect(formatCol).toBe(AUTO_TEMPLATE.headers.length - 1);
    // Chaque champ tombe sur sa colonne d'en-tête : c'est ce qui évite le réglage manuel.
    const col = (h: string) => AUTO_TEMPLATE.headers.indexOf(h);
    expect(mapping.category).toBe(col('Catégorie'));
    expect(mapping.product).toBe(col('Produit'));
    expect(mapping.normalPrice).toBe(col("Prix normal / à l'unité €"));
    expect(mapping.promoPrice).toBe(col('Prix promo €'));
    expect(mapping.couponValue).toBe(col('Valeur bon €'));
    expect(mapping.couponExpiry).toBe(col('Validité'));
    expect(mapping.lotQty).toBe(col('Qté totale'));
    expect(mapping.lotFree).toBe(col('Offert(s)'));
    expect(mapping.lotPrice).toBe(col('Prix du lot €'));
    expect(mapping.t1q).toBe(col('Qté 1'));
    expect(mapping.t1p).toBe(col('Prix 1'));
    expect(mapping.t2q).toBe(col('Qté 2'));
    expect(mapping.t2p).toBe(col('Prix 2'));
    expect(mapping.t3q).toBe(col('Qté 3'));
    expect(mapping.t3p).toBe(col('Prix 3'));
    expect(mapping.remiseManual).toBe(col('Remise 2ᵉ (%)'));
    expect(mapping.qtyLabel).toBe(col('Descriptif'));
  });

  it('retient les 40 lignes, chacune avec son type et sa catégorie', async () => {
    const { prepared } = importRows(await readAsApp());
    expect(prepared).toHaveLength(40); // aucune ligne perdue faute de prix
    for (const { d } of prepared) {
      expect((d.product || '').trim()).not.toBe('');
      expect((d.category || '').trim()).not.toBe('');
    }
    const byType = prepared.reduce<Record<string, number>>((a, { rt }) => ({ ...a, [rt]: (a[rt] || 0) + 1 }), {});
    expect(byType).toEqual({ 'prix-promo': 14, 'bon-reduction': 6, 'remise-lot': 8, 'multi-achat': 6, 'remise-2eme': 6 });
  });

  it('remplit les champs utiles de chaque mécanique', async () => {
    const { prepared } = importRows(await readAsApp());
    const find = (p: string) => prepared.find(x => (x.d.product || '').startsWith(p))!;

    const promo = find('Eau Thermale AVÈNE');
    expect(promo.rt).toBe('prix-promo');
    expect([pf(promo.d.normalPrice!), pf(promo.d.promoPrice!)]).toEqual([19.9, 14.9]);
    expect(promo.d.category).toBe('SOIN VISAGE');
    expect(promo.d.qtyLabel).toBe('Tube 40 ml');

    const bon = find('Bain de bouche MERIDOL');
    expect(bon.rt).toBe('bon-reduction');
    expect(pf(bon.d.couponValue!)).toBe(2);
    expect(bon.d.couponExpiry).toBe('31/12/2026'); // texte, pas une date décalée d'un jour

    // Lot de 2 à prix fixe : le prix à l'unité doit arriver, sinon pas de prix barré.
    const lot = find('Gel lavant SAFORELLE');
    expect(lot.rt).toBe('remise-lot');
    expect(lot.d.lotQty).toBe('2');
    expect(lot.d.lotFree).toBe('0');
    expect(pf(lot.d.normalPrice!)).toBe(8.9);
    expect(pf(lot.d.lotPrice!)).toBe(13.9);

    const multi = find('QUIES Boules');
    expect(multi.rt).toBe('multi-achat');
    expect([multi.d.t1q, multi.d.t2q, multi.d.t3q]).toEqual(['1', '2', '3']);
    // Des TOTAUX par palier, pas des prix unitaires — c'est ce que lit mechOf.
    expect([pf(multi.d.t1p!), pf(multi.d.t2p!), pf(multi.d.t3p!)]).toEqual([5.9, 10.9, 14.9]);

    const deux = find('ROC Retinol');
    expect(deux.rt).toBe('remise-2eme');
    expect(pf(deux.d.normalPrice!)).toBe(32);
    expect(deux.d.remiseManual).toBe('50');
  });

  it('tous les lots sont des lots de 2', async () => {
    const { prepared } = importRows(await readAsApp());
    const lots = prepared.filter(x => x.rt === 'remise-lot');
    expect(lots.length).toBeGreaterThan(0);
    for (const { d } of lots) expect(d.lotQty).toBe('2');
  });

  it('détache le litrage collé au nom du produit', async () => {
    const { prepared } = importRows(await readAsApp());
    // « Huile de soin BI-OIL F/200ML » sans descriptif → le format part sur la petite ligne.
    const bioil = prepared.find(x => (x.d.product || '').includes('BI-OIL'))!;
    expect(bioil.d.product).not.toMatch(/200/);
    expect(bioil.d.qtyLabel).toMatch(/200/);
  });

  // Les modèles mono-type (un fichier par mécanique) doivent se mapper aussi bien.
  it.each(Object.keys(TEMPLATES) as PromoType[])('modèle « %s » : toutes les lignes passent', (type) => {
    const t = TEMPLATES[type];
    const { prepared } = importRows([t.headers, ...t.rows], type);
    expect(prepared).toHaveLength(t.rows.length);
    for (const { d, rt } of prepared) {
      expect(rt).toBe(type);
      expect((d.category || '').trim()).not.toBe('');
      expect((d.product || '').trim()).not.toBe('');
    }
    // Le lot mono-type doit lui aussi ramener le prix à l'unité (source du prix barré).
    if (type === 'remise-lot') for (const { d } of prepared) {
      expect(d.lotQty).toBe('2');
      expect(pf(d.normalPrice || '')).toBeGreaterThan(0);
      expect(pf(d.lotPrice || '')).toBeGreaterThan(0);
    }
  });

  it('ignore les lignes sans prix (titres, séparateurs)', async () => {
    const rows = await readAsApp();
    const polluted = [rows[0], ['', 'PROMOTIONS DE L\'ÉTÉ', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''], ...rows.slice(1)];
    expect(importRows(polluted).prepared).toHaveLength(40);
  });
});
