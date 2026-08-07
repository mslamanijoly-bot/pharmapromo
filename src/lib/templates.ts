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
// Les marques sont celles de l'officine : un modèle qu'on télécharge sert d'exemple à recopier,
// il ne doit donc montrer que des produits qu'on a réellement en rayon.
export const TEMPLATES: Record<PromoType, Template> = {
  'prix-promo': {
    headers: ['Catégorie', 'Produit', 'Prix normal €', 'Prix promo €', 'Descriptif', 'Format'],
    rows: [
      ['SOIN VISAGE', 'Eau Thermale AVÈNE Hydrance légère', '19,90', '14,90', 'Tube 40 ml', 'A4'],
      ['CAPILLAIRE', 'Shampooing KLORANE à l’ortie blanche', '9,90', '6,90', 'Flacon 400 ml', 'Vitrine'],
      ['HYGIÈNE BUCCO-DENTAIRE', 'Dentifrice ELMEX Anti-caries', '5,50', '3,90', 'Tube 75 ml', 'Rayon'],
    ],
  },
  'bon-reduction': {
    headers: ['Catégorie', 'Produit', 'Valeur bon €', 'Validité', 'Format'],
    rows: [
      ['HYGIÈNE BUCCO-DENTAIRE', 'Bain de bouche MERIDOL protection gencives', '2,00', '31/12/2026', 'Vitrine'],
      ['BÉBÉ', 'BIOLANE Lingettes à l’eau', '1,50', '30/09/2026', 'Rayon'],
    ],
  },
  'remise-lot': {
    headers: ['Catégorie', 'Produit', 'Qté totale', 'Offert(s)', "Prix à l'unité €", 'Prix du lot €', 'Descriptif', 'Format'],
    rows: [
      ['HYGIÈNE INTIME', 'Gel lavant SAFORELLE soin doux', '2', '0', '8,90', '13,90', 'Lot de 2 flacons', 'A4'],
      ['SOLAIRE', 'DAYLONG Spray solaire SPF30', '2', '0', '15,90', '24,90', 'Lot de 2 sprays', 'Réglette'],
    ],
  },
  'multi-achat': {
    // Les prix sont des TOTAUX par palier : « 3 = 14,90 € », et non le prix d'une unité.
    headers: ['Catégorie', 'Produit', 'Qté 1', 'Prix 1', 'Qté 2', 'Prix 2', 'Qté 3', 'Prix 3', 'Format'],
    rows: [
      ['PROTECTION AUDITIVE', 'QUIES Boules Quies cire naturelle', '1', '5,90', '2', '10,90', '3', '14,90', 'Petite'],
    ],
  },
  'remise-2eme': {
    headers: ['Catégorie', 'Produit', "Prix à l'unité €", 'Remise 2ᵉ (%)', 'Descriptif', 'Format'],
    rows: [
      ['HYGIÈNE BUCCO-DENTAIRE', 'Bain de bouche CB12 haleine fraîche', '12,50', '50', 'Flacon 250 ml', 'A4'],
      ['DERMO-COSMÉTIQUE', 'ROC Retinol Correxion crème nuit', '32,00', '50', 'Pot 30 ml', 'Vitrine'],
    ],
  },
};

// Modèle « tout-en-un » = jeu de test complet : une seule feuille pour TOUTES les promos
// (1 ligne = 1 étiquette). Le « Type » est lu ligne par ligne ; chaque ligne ne remplit que
// ses colonnes utiles. Les 5 types · les 5 formats · les 5 mécaniques de prix.
//
// LES MARQUES SONT CELLES DE L'OFFICINE, prises dans le catalogue du site (logos.officine.ts).
// Pas de Garnier, de Sanex ni de Listerine : ce sont des marques de grande surface, absentes
// du rayon. Un jeu de test qui ne ressemble pas au linéaire ne teste pas grand-chose.
//
// Les longueurs de libellé sont voulues : des noms sur une, deux et trois lignes, pour que
// le logo du laboratoire — qui se pose dans un bloc SOUS le nom — soit éprouvé dans les trois cas.
//
// Les prix de paliers du multi-achat sont des TOTAUX (« 3 = 14,90 € »), jamais des prix
// unitaires : c'est la convention que lit mechOf, et l'affichage en dépend.
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
    _pp('SOIN VISAGE', 'Eau Thermale AVÈNE Hydrance légère', '19,90', '14,90', 'Tube 40 ml', 'A4'),
    _pp('CAPILLAIRE', 'Shampooing KLORANE à l’ortie blanche', '9,90', '6,90', 'Flacon 400 ml', 'Vitrine'),
    _pp('HYGIÈNE BUCCO-DENTAIRE', 'Dentifrice ELMEX Anti-caries', '5,50', '3,90', 'Tube 75 ml', 'Rayon'),
    _pp('PHYTOTHÉRAPIE', 'Aboca Sollievo transit', '15,50', '11,90', '90 comprimés', 'Petite'),
    _pp('DRAINAGE', 'HERBESAN Draineur bio agrumes', '18,90', '13,90', 'Flacon 500 ml', 'Réglette'),
    _pp('CAPILLAIRE', 'LUXÉOL Cheveux croissance et vitalité', '24,90', '19,90', '60 gélules', 'Rayon'),
    _pp('SOIN VISAGE', 'ROGER & GALLET Bois d’Orange gel douche', '12,50', '8,90', 'Flacon 200 ml', 'A4'),
    _pp('DIGESTION', 'PROBIOLOG Fort équilibre intestinal', '24,90', '18,90', '30 gélules', 'Vitrine'),
    _pp('SOMMEIL', 'SANTAROME Bio nuit tranquille', '14,90', '10,90', '20 ampoules', 'Petite'),
    _pp('MINCEUR', 'STC NUTRITION Draineur 5 actions', '22,90', '17,50', 'Flacon 500 ml', 'Rayon'),
    _pp('CIRCULATION', 'LES 3 CHÊNES Jambes légères confort', '17,90', '13,50', '60 comprimés', 'Réglette'),
    _pp('PREMIERS SOINS', 'Pansements ELASTOPLAST résistants', '5,90', '3,90', 'Boîte de 20', 'Petite'),
    // Cas piège volontaire : le litrage est collé au nom (« .../400ML ») — l'import doit
    // le détacher tout seul sur la ligne descriptive.
    _pp('CORPS', 'Huile de soin BI-OIL F/200ML', '16,90', '12,90', _E, 'Vitrine'),
    _pp('SOLAIRE', 'DAYLONG Sensitive lait solaire SPF50+', '24,50', '19,90', 'Flacon 200 ml', 'A4'),
    // ── Bons de réduction : valeur + date de validité ───────────────────────────
    _bon('HYGIÈNE BUCCO-DENTAIRE', 'Bain de bouche MERIDOL protection gencives', '2,00', '31/12/2026', 'Vitrine'),
    _bon('BÉBÉ', 'BIOLANE Lingettes à l’eau', '1,50', '30/09/2026', 'Rayon'),
    _bon('VÉTÉRINAIRE', 'CLÉMENT THÉKAN antiparasitaire chien', '5,00', '15/11/2026', 'A4'),
    _bon('ANTI-POUX', 'POUXIT Lotion traitante', '3,00', '31/12/2026', 'Vitrine'),
    _bon('INCONTINENCE', 'Protections TENA Lady Discreet', '2,50', '31/10/2026', 'Rayon'),
    _bon('AUTODIAGNOSTIC', 'CLEARBLUE test de grossesse digital', '4,00', '31/12/2026', 'A4'),
    // ── Lots : lots de 2, prix à l'unité renseigné (→ prix barré + économie affichée) ──
    _lot('HYGIÈNE INTIME', 'Gel lavant SAFORELLE soin doux', '8,90', '2', '0', '13,90', 'Lot de 2 flacons', 'A4'),
    _lot('SOLAIRE', 'DAYLONG Spray solaire SPF30', '15,90', '2', '0', '24,90', 'Lot de 2 sprays', 'Réglette'),
    _lot('CORPS', 'NEUTRADERM Gel douche surgras', '5,90', '2', '0', '9,80', 'Lot de 2 flacons', 'Rayon'),
    _lot('IMMUNITÉ', 'SANTÉ VERTE Vitamine C acérola', '9,90', '2', '0', '15,90', 'Lot de 2 tubes', 'Petite'),
    _lot('HYGIÈNE INTIME', 'HYDRALIN Quotidien gel lavant', '9,50', '2', '0', '14,90', 'Lot de 2 flacons', 'Vitrine'),
    _lot('CAPILLAIRE', 'Shampooing DUCRAY Kertyol état pelliculaire', '13,50', '2', '0', '21,90', 'Lot de 2 flacons', 'A4'),
    _lot('SOINS DES LÈVRES', 'LAINO Stick lèvres karité', '3,50', '2', '0', '5,50', 'Lot de 2 sticks', 'Petite'),
    // Un seul lot en « acheté + offert » : la mécanique reste supportée et doit être testée.
    // Le descriptif dit le CONDITIONNEMENT, pas la mécanique — « 1 acheté + 1 offert » est
    // déjà écrit en gros sur la flèche, le répéter sous le nom ne fait que charger l'étiquette.
    _lot('MICRONUTRITION', 'THALAMAG Magnésium marin fatigue', '19,90', '2', '1', '19,90', '30 comprimés', 'Réglette'),
    // ── Multi-achat : paliers de quantité. Les prix sont des TOTAUX, pas des unitaires. ──
    _multi('PROTECTION AUDITIVE', 'QUIES Boules Quies cire naturelle', '1', '5,90', '2', '10,90', '3', '14,90', 'Petite'),
    _multi('HYGIÈNE BUCCO-DENTAIRE', 'TEPE Brossettes interdentaires', '1', '5,50', '3', '14,50', '5', '21,90', 'Rayon'),
    _multi('ANTI-MOUSTIQUES', 'PARAKITO Recharges bracelet répulsif', '1', '9,90', '2', '17,90', '3', '24,90', 'Réglette'),
    _multi('SOIN DES ONGLES', 'MAVALA Vernis à ongles couleur', '1', '6,50', '2', '11,90', '3', '16,50', 'Vitrine'),
    _multi('BÉBÉ', 'PAMPERS Baby-Dry taille 4 mégapack', '1', '11,90', '2', '21,90', '3', '29,90', 'A4'),
    _multi('PHYTOTHÉRAPIE', 'IPHYM Tisane digestion bio', '1', '4,20', '2', '7,50', '4', '13,90', 'Petite'),
    // ── 2ᵉ produit à −X% : prix à l'unité + pourcentage sur le second ───────────
    _deux('DERMO-COSMÉTIQUE', 'ROC Retinol Correxion crème nuit', '32,00', '50', 'Pot 30 ml', 'A4'),
    _deux('HYGIÈNE BUCCO-DENTAIRE', 'Bain de bouche CB12 haleine fraîche', '12,50', '50', 'Flacon 250 ml', 'Vitrine'),
    _deux('CORPS', 'ELANCYL Slim Design fermeté', '28,90', '40', 'Tube 200 ml', 'Rayon'),
    _deux('PIEDS', 'Crème anti-callosités AKILÉÏNE', '8,90', '40', 'Tube 75 ml', 'Petite'),
    _deux('SOIN VISAGE', 'JOWAÉ Crème lissante hydratante', '18,50', '50', 'Pot 40 ml', 'Réglette'),
    _deux('HOMME', 'EAU PRÉCIEUSE Lotion soin visage', '5,40', '30', 'Flacon 375 ml', 'Rayon'),
  ],
};

// Colonnes écrites en NOMBRES dans le .xlsx (Excel les aligne et les calcule).
// La « Validité » reste du TEXTE : l'import la lit telle quelle, ce qui évite le décalage
// d'un jour qu'introduit la sérialisation des dates Excel selon le fuseau horaire.
export const TEMPLATE_NUMERIC_HEADERS = new Set([
  'Prix normal €', "Prix normal / à l'unité €", "Prix à l'unité €", 'Prix promo €', 'Valeur bon €', 'Qté totale', 'Offert(s)', 'Prix du lot €',
  'Qté 1', 'Prix 1', 'Qté 2', 'Prix 2', 'Qté 3', 'Prix 3', 'Remise 2ᵉ (%)',
]);
