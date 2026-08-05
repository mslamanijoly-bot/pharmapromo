// ──────────────────────────────────────────────────────────────────────
//  MODÈLES D'IMPORT — données pures, SOURCE UNIQUE
//
//  Servent à la fois :
//   • au bouton « Télécharger le modèle » de l'application ;
//   • au script scripts/gen-test-xlsx.ts qui écrit le .xlsx de test livré avec le dépôt.
//  Un seul endroit à corriger, donc aucun risque que le fichier de test et l'application
//  divergent (c'est exactement ce que vérifie import.test.ts).
//
//  `import type` uniquement : ce module reste exécutable par Node sans alias ni React.
// ──────────────────────────────────────────────────────────────────────
import type { PromoType } from '../app/page';

export type Template = { headers: string[]; rows: string[][] };

// Modèles « parfaits » par type : en-têtes reconnus automatiquement + exemples.
export const TEMPLATES: Record<PromoType, Template> = {
  'prix-promo': {
    headers: ['Catégorie', 'Produit', 'Prix normal €', 'Prix promo €', 'Descriptif', 'Format'],
    rows: [
      ['COMPLÉMENT ALIMENTAIRE', 'Chondro-Aid Fort ARKOPHARMA', '31,90', '26,90', 'Lot de 3 x 60 gélules', 'A4'],
      ['SOIN VISAGE', 'Crème hydratante AVÈNE', '19,90', '14,90', 'Tube 40 ml', 'Vitrine'],
      ['HYGIÈNE BUCCO-DENTAIRE', 'Bain de bouche ELUDRIL', '8,50', '5,90', 'Flacon 500 ml', 'Rayon'],
    ],
  },
  'bon-reduction': {
    headers: ['Catégorie', 'Produit', 'Valeur bon €', 'Validité', 'Format'],
    rows: [
      ['HYGIÈNE', 'Dentifrice SENSODYNE', '2,00', '31/12/2026', 'Vitrine'],
      ['BÉBÉ', 'Lingettes MUSTELA', '1,50', '30/09/2026', 'Rayon'],
    ],
  },
  'remise-lot': {
    headers: ['Catégorie', 'Produit', 'Qté totale', 'Offert(s)', "Prix à l'unité €", 'Prix du lot €', 'Descriptif', 'Format'],
    rows: [
      ['COMPLÉMENT ALIMENTAIRE', 'Magnésium B6', '2', '0', '12,90', '19,98', 'Lot de 2 boîtes', 'A4'],
      ['SOLAIRE', 'Spray solaire SPF50+', '2', '0', '15,90', '24,90', 'Lot de 2 sprays', 'Réglette'],
    ],
  },
  'multi-achat': {
    headers: ['Catégorie', 'Produit', 'Qté 1', 'Prix 1', 'Qté 2', 'Prix 2', 'Qté 3', 'Prix 3', 'Format'],
    rows: [
      ['SOLAIRE', 'Spray solaire SPF50', '1', '12,90', '2', '22,90', '3', '29,90', 'Petite'],
    ],
  },
  'remise-2eme': {
    headers: ['Catégorie', 'Produit', "Prix à l'unité €", 'Remise 2ᵉ (%)', 'Descriptif', 'Format'],
    rows: [
      ['HYGIÈNE BUCCO-DENTAIRE', 'Bain de bouche LISTERINE', '6,50', '60', 'Flacon 500 ml', 'A4'],
      ['DERMO-COSMÉTIQUE', 'Crème mains NEUTROGENA', '4,95', '50', 'Tube 75 ml', 'Vitrine'],
    ],
  },
};

// Modèle « tout-en-un » = jeu de test complet : une seule feuille pour TOUTES les promos
// (1 ligne = 1 étiquette). Le « Type » est lu ligne par ligne ; chaque ligne ne remplit que
// ses colonnes utiles. 40 produits · 30 catégories · les 5 types · les 5 formats.
export const AUTO_HEADERS = ['Type', 'Catégorie', 'Produit', "Prix normal / à l'unité €", 'Prix promo €', 'Valeur bon €', 'Validité', 'Qté totale', 'Offert(s)', 'Prix du lot €', 'Qté 1', 'Prix 1', 'Qté 2', 'Prix 2', 'Qté 3', 'Prix 3', 'Remise 2ᵉ (%)', 'Descriptif', 'Format'];
const _E = '';
const _pp = (c: string, p: string, n: string, pr: string, d: string, f: string) => ['Prix promo', c, p, n, pr, _E, _E, _E, _E, _E, _E, _E, _E, _E, _E, _E, _E, d, f];
const _bon = (c: string, p: string, v: string, val: string, f: string) => ['Bon', c, p, _E, _E, v, val, _E, _E, _E, _E, _E, _E, _E, _E, _E, _E, _E, f];
const _lot = (c: string, p: string, u: string, q: string, o: string, px: string, d: string, f: string) => ['Lot', c, p, u, _E, _E, _E, q, o, px, _E, _E, _E, _E, _E, _E, _E, d, f];
const _multi = (c: string, p: string, q1: string, p1: string, q2: string, p2: string, q3: string, p3: string, f: string) => ['Multi', c, p, _E, _E, _E, _E, _E, _E, _E, q1, p1, q2, p2, q3, p3, _E, _E, f];
const _deux = (c: string, p: string, u: string, r: string, d: string, f: string) => ['2ᵉ produit', c, p, u, _E, _E, _E, _E, _E, _E, _E, _E, _E, _E, _E, _E, r, d, f];

export const AUTO_TEMPLATE: Template = {
  headers: AUTO_HEADERS,
  rows: [
    // ── Prix promo : le cas le plus courant, prix barré + prix net ──────────────
    _pp('COMPLÉMENT ALIMENTAIRE', 'Chondro-Aid Fort ARKOPHARMA', '31,90', '26,90', 'Lot de 3 x 60 gélules', 'A4'),
    _pp('SOIN VISAGE', 'Crème hydratante AVÈNE Hydrance', '19,90', '14,90', 'Tube 40 ml', 'Vitrine'),
    _pp('HYGIÈNE BUCCO-DENTAIRE', 'Bain de bouche ELUDRIL', '8,50', '5,90', 'Flacon 500 ml', 'Rayon'),
    _pp('CAPILLAIRE', 'Shampooing KLORANE Ortie', '9,90', '6,90', 'Flacon 400 ml', 'Petite'),
    _pp('MINCEUR', 'Draineur ARKOFLUIDE Bio', '15,50', '11,90', 'Flacon 500 ml', 'Réglette'),
    _pp('VITAMINES', 'Magnésium Marin BIANE', '13,20', '9,90', '60 comprimés', 'Rayon'),
    _pp('DERMO-COSMÉTIQUE', 'Sérum La Roche-Posay Hyalu B5', '39,90', '31,90', 'Flacon 30 ml', 'A4'),
    _pp('DIGESTION', 'Probiotiques LACTIBIANE Référence', '24,90', '18,90', '30 gélules', 'Vitrine'),
    _pp('SOMMEIL', 'Mélatonine 1,9 mg NUTRISANTÉ', '12,90', '8,90', '30 comprimés', 'Petite'),
    _pp('ARTICULATIONS', 'Flexofytol PHYSIOMANCE', '29,90', '23,90', '60 capsules', 'Rayon'),
    _pp('CIRCULATION', 'Veinotonique CIRKAN', '17,90', '13,50', '60 comprimés', 'Réglette'),
    _pp('PREMIERS SOINS', 'Pansements URGO Waterproof', '5,90', '3,90', 'Boîte de 20', 'Petite'),
    // Cas piège volontaire : le litrage est collé au nom (« .../500ML ») — l'import doit
    // le détacher tout seul sur la ligne descriptive.
    _pp('CORPS', 'Lait hydratant CERAVE F/473ML', '16,90', '12,90', _E, 'Vitrine'),
    _pp('SOLAIRE', 'Lait solaire ANTHELIOS SPF50+', '24,50', '19,90', 'Flacon 250 ml', 'A4'),
    // ── Bons de réduction : valeur + date de validité ───────────────────────────
    _bon('HYGIÈNE', 'Dentifrice SENSODYNE Répare & Protège', '2,00', '31/12/2026', 'Vitrine'),
    _bon('BÉBÉ', 'Lingettes MUSTELA', '1,50', '30/09/2026', 'Rayon'),
    _bon('VÉTÉRINAIRE', 'Antiparasitaire FRONTLINE Combo', '5,00', '15/11/2026', 'A4'),
    _bon('SEVRAGE TABAGIQUE', 'Patchs NICORETTE 25 mg', '3,00', '31/12/2026', 'Vitrine'),
    _bon('INCONTINENCE', 'Protections TENA Lady', '2,50', '31/10/2026', 'Rayon'),
    _bon('ORTHOPÉDIE', 'Ceinture lombaire THUASNE', '10,00', '31/12/2026', 'A4'),
    // ── Lots : TOUJOURS des lots de 2, prix à l'unité renseigné (→ prix barré + économie) ──
    _lot('COMPLÉMENT ALIMENTAIRE', 'Magnésium B6 SANOFI', '12,90', '2', '0', '19,98', 'Lot de 2 boîtes', 'A4'),
    _lot('SOLAIRE', 'Spray solaire BIODERMA SPF50+', '15,90', '2', '0', '24,90', 'Lot de 2 sprays', 'Réglette'),
    _lot('CORPS', 'Gel douche SANEX Zéro%', '5,90', '2', '0', '9,80', 'Lot de 2 flacons', 'Rayon'),
    _lot('IMMUNITÉ', 'Vitamine C AZINC', '9,90', '2', '0', '15,90', 'Lot de 2 tubes', 'Petite'),
    _lot('HYGIÈNE INTIME', 'Gel lavant SAFORELLE', '8,90', '2', '0', '13,90', 'Lot de 2 flacons', 'Vitrine'),
    _lot('CAPILLAIRE', 'Shampooing DUCRAY Kertyol', '13,50', '2', '0', '21,90', 'Lot de 2 flacons', 'A4'),
    _lot('SOINS DES LÈVRES', 'Stick lèvres LABELLO', '3,50', '2', '0', '5,50', 'Lot de 2 sticks', 'Petite'),
    // Un seul lot en « acheté + offert » : la mécanique reste supportée et doit être testée.
    _lot('NUTRITION SPORTIVE', 'Shaker protéiné EAFIT', '19,90', '2', '1', '19,90', '1 acheté + 1 offert', 'Réglette'),
    // ── Multi-achat : paliers de quantité ──────────────────────────────────────
    _multi('SOLAIRE', 'Spray solaire GARNIER SPF50', '1', '12,90', '2', '22,90', '3', '29,90', 'Petite'),
    _multi('HYGIÈNE', 'Savon de Marseille LE PETIT MARSEILLAIS', '1', '3,50', '3', '9,00', '5', '13,50', 'Rayon'),
    _multi('NUTRITION SPORTIVE', 'Barre protéinée EAFIT', '1', '2,50', '3', '6,00', '6', '10,00', 'Réglette'),
    _multi('YEUX', 'Sérum physiologique dosettes', '1', '3,90', '2', '6,90', '3', '8,90', 'Vitrine'),
    _multi('BÉBÉ', 'Couches PAMPERS Baby-Dry T4', '1', '11,90', '2', '21,90', '3', '29,90', 'A4'),
    _multi('DIÉTÉTIQUE', 'Infusion detox BIO', '1', '4,20', '2', '7,50', '4', '13,90', 'Petite'),
    // ── 2ᵉ produit à −X% : prix à l'unité + pourcentage sur le second ───────────
    _deux('DERMO-COSMÉTIQUE', 'Crème mains NEUTROGENA', '4,95', '50', 'Tube 75 ml', 'A4'),
    _deux('HYGIÈNE BUCCO-DENTAIRE', 'Bain de bouche LISTERINE', '6,50', '60', 'Flacon 500 ml', 'Vitrine'),
    _deux('CONTOUR DES YEUX', 'Soin anti-âge CAUDALIE Resvératrol', '32,00', '50', 'Pot 15 ml', 'Rayon'),
    _deux('PIEDS', 'Crème anti-callosités AKILEÏNE', '8,90', '40', 'Tube 75 ml', 'Petite'),
    _deux('MAQUILLAGE', 'Fond de teint AVÈNE Couvrance', '18,50', '50', 'Flacon 30 ml', 'Réglette'),
    _deux('HOMME', 'Gel de rasage GILLETTE Series', '5,40', '30', 'Tube 200 ml', 'Rayon'),
  ],
};

// Colonnes écrites en NOMBRES dans le .xlsx (Excel les aligne et les calcule).
// La « Validité » reste du TEXTE : l'import la lit telle quelle, ce qui évite le décalage
// d'un jour qu'introduit la sérialisation des dates Excel selon le fuseau horaire.
export const TEMPLATE_NUMERIC_HEADERS = new Set([
  'Prix normal €', "Prix normal / à l'unité €", "Prix à l'unité €", 'Prix promo €', 'Valeur bon €', 'Qté totale', 'Offert(s)', 'Prix du lot €',
  'Qté 1', 'Prix 1', 'Qté 2', 'Prix 2', 'Qté 3', 'Prix 3', 'Remise 2ᵉ (%)',
]);
