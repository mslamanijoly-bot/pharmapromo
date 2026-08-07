import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { findLab, normalise, LOGOS, logoUrl, orphanBrands } from './logos';
import { PRODUCT_BRANDS } from './logos.brands';
import { AUTO_TEMPLATE } from './templates';

describe('normalise', () => {
  it('aplatit accents, apostrophes et ponctuation', () => {
    expect(normalise('Avène')).toBe('avene');
    expect(normalise("L'Oréal Dermatological Beauty")).toBe('l_oreal_dermatological_beauty');
    expect(normalise('La Roche-Posay')).toBe('la_roche_posay');
    expect(normalise('René Furterer')).toBe('rene_furterer');
    expect(normalise('Procter & Gamble')).toBe('procter_et_gamble');
    expect(normalise('  Bion 3 !! ')).toBe('bion_3');
  });

  it("traite l'apostrophe typographique comme l'apostrophe droite", () => {
    expect(normalise('L’Oréal')).toBe(normalise("L'Oréal"));
  });
});

describe('findLab — cellule entière', () => {
  it('reconnaît le nom exact', () => {
    const m = findLab('Bioderma');
    expect(m.status).toBe('found');
    expect(m.key).toBe('bioderma');
    expect(m.method).toBe('exact');
  });

  it('reconnaît un alias exact', () => {
    expect(findLab('Eau Thermale Avène').key).toBe('avene');
    expect(findLab('LRP').key).toBe('la_roche_posay');
    expect(findLab('Pierre Fabre').key).toBe('laboratoires_pierre_fabre');
  });
});

describe('findLab — dans un libellé produit', () => {
  it('retrouve la marque noyée dans le texte', () => {
    expect(findLab('Crème hydratante AVÈNE Hydrance').key).toBe('avene');
    expect(findLab('Shampooing KLORANE Ortie').key).toBe('klorane');
    expect(findLab('Spray solaire BIODERMA SPF50+').key).toBe('bioderma');
    expect(findLab('Chondro-Aid Fort ARKOPHARMA').key).toBe('arkopharma');
    expect(findLab('Lingettes MUSTELA').key).toBe('mustela');
    expect(findLab('Vitamine C 1g effervescent Upsa').key).toBe('upsa');
  });

  it('LE PLUS LONG GAGNE : « La Roche-Posay » ne doit pas devenir « Roche »', () => {
    const m = findLab('Sérum La Roche-Posay Hyalu B5');
    expect(m.key).toBe('la_roche_posay');
    expect(m.key).not.toBe('roche');
  });

  it('respecte les frontières de mots', () => {
    // « Nivea » ne doit pas sortir de « ...nivéale », ni « ACM » d'un code produit collé.
    expect(findLab('Crème nivéale maison').status).toBe('not_found');
    expect(findLab('Réf. XACMY-12').status).toBe('not_found');
  });

  it('rend not_found sur un libellé sans marque connue', () => {
    const m = findLab('Sérum physiologique dosettes');
    expect(m.status).toBe('not_found');
    expect(m.image).toBeNull();
    expect(m.method).toBe('none');
  });

  it('ne rend jamais de logo quand le résultat est ambigu', () => {
    for (const e of LOGOS) {
      const m = findLab(e.name);
      if (m.status === 'ambiguous') {
        expect(m.image).toBeNull();
        expect(m.key).toBeNull();
        expect(m.candidates!.length).toBeGreaterThan(1);
      }
    }
  });
});

// Le fichier des marques produit est le seul que l'on édite à la main : c'est donc le seul
// où une faute de frappe est probable. On la fait tomber ici, pas en rayon.
describe('marques produit (logos.brands.ts)', () => {
  it('ne vise que des clés existantes du catalogue', () => {
    expect(orphanBrands()).toEqual([]);
  });

  it('mène le libellé produit jusqu\'au laboratoire', () => {
    expect(findLab('Bain de bouche ELUDRIL').key).toBe('laboratoires_pierre_fabre');
    expect(findLab('Vitamine C AZINC').key).toBe('arkopharma');
    expect(findLab('Lait solaire ANTHELIOS SPF50+').key).toBe('la_roche_posay');
    expect(findLab('Probiotiques LACTIBIANE Référence').key).toBe('pileje');
    expect(findLab('Bain de bouche LISTERINE').key).toBe('kenvue');
    expect(findLab('Couches PAMPERS Baby-Dry T4').key).toBe('procter_et_gamble');
  });

  // Le vrai danger de ce fichier n'est pas la faute de frappe, c'est le mot trop générique :
  // « Karité », « Minéral », « Aspirine » traînent dans des dizaines de libellés et
  // colleraient un logo de labo sur des produits qui n'ont rien à voir.
  it('ne contient aucun terme générique du rayon', () => {
    const generiques = ['karite', 'karité', 'mineral', 'minéral', 'capital', 'ambre', 'tolerance',
      'tolérance', 'cystine', 'node', 'aspirine', 'magne', 'bio', 'nature', 'soleil', 'creme', 'crème'];
    const fautifs = Object.keys(PRODUCT_BRANDS).filter(b => generiques.includes(b.toLowerCase()));
    expect(fautifs).toEqual([]);
  });

  it('chaque marque déclarée se retrouve seule dans un libellé', () => {
    for (const [brand, key] of Object.entries(PRODUCT_BRANDS)) {
      const m = findLab(`Promo ${brand} 200 ml`);
      expect(m.status, `${brand} → ${key}`).toBe('found');
      expect(m.key, `${brand} → ${key}`).toBe(key);
    }
  });
});

describe('catalogue', () => {
  it('a des clés uniques et un visuel par entrée', () => {
    expect(new Set(LOGOS.map(e => e.key)).size).toBe(LOGOS.length);
    // Le fichier est choisi par le manifeste : logo réel (n'importe quelle extension) ou
    // vignette de repli. On vérifie la forme du chemin, pas une extension figée — c'est
    // précisément le fait de supposer « toujours .svg » qui a fait écraser les logos récupérés.
    for (const e of LOGOS) expect(e.image).toMatch(new RegExp(`^logos_jpeg/${e.key}\\.(svg|png|jpe?g|webp|gif|vignette\\.svg)$`));
  });

  it('ne sert que des fichiers réellement présents dans public/', () => {
    const dir = join(process.cwd(), 'public', 'logos_jpeg');
    const manquants = LOGOS.filter(e => !existsSync(join(dir, e.image.replace('logos_jpeg/', ''))));
    expect(manquants.map(e => e.key)).toEqual([]);
  });

  it('rend un chemin servi depuis public/', () => {
    expect(logoUrl('logos_jpeg/avene.svg')).toBe('/logos_jpeg/avene.svg');
  });

  it('chaque entrée se retrouve elle-même par son propre nom', () => {
    const rates = LOGOS.map(e => findLab(e.name).key === e.key || findLab(e.name).status === 'ambiguous');
    expect(rates.every(Boolean)).toBe(true);
  });
});

// Le vrai juge de paix : le classeur livré avec le dépôt. On mesure la couverture réelle
// et on VERROUILLE le fait qu'aucune ligne ne reçoive un logo faux.
describe('couverture du classeur de test', () => {
  const produits = AUTO_TEMPLATE.rows.map(r => r[2]);

  it('associe une marque à une bonne part des produits', () => {
    const trouves = produits.filter(p => findLab(p).status === 'found');
    expect(trouves.length).toBeGreaterThanOrEqual(10);
  });

  it('aucune ligne ne reçoit un logo ambigu', () => {
    for (const p of produits) expect(findLab(p).status).not.toBe('ambiguous');
  });
});
