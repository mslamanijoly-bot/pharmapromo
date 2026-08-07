// ──────────────────────────────────────────────────────────────────────
//  CATALOGUE DES LABORATOIRES — DONNÉES GÉNÉRÉES, NE PAS ÉDITER À LA MAIN
//
//  126 laboratoires, marques et groupes, avec leurs alias de reconnaissance.
//  Les alias qui désignent une AUTRE entrée (la maison mère, typiquement) ont été retirés :
//  sans ça « Laboratoires Pierre Fabre » ferait matcher Avène, Ducray et Klorane à la fois.
//
//  Le champ `image` pointe un fichier de public/. Déposer le logo officiel sous ce nom
//  suffit à remplacer la vignette typographique — aucune modification de code.
// ──────────────────────────────────────────────────────────────────────

export interface CatalogEntry {
  key: string;
  name: string;
  group: string;
  category: string;
  aliases: string[];
  image: string;
}

export const BASE_PATH = 'logos_jpeg';

export const CATALOG: CatalogEntry[] = [
  {
    "key": "avene",
    "name": "Avène",
    "group": "Laboratoires Pierre Fabre",
    "category": "Dermocosmétique",
    "aliases": [
      "Avène",
      "Avene",
      "Eau Thermale Avène"
    ],
    "image": "logos_jpeg/avene.svg"
  },
  {
    "key": "la_roche_posay",
    "name": "La Roche-Posay",
    "group": "L'Oréal Dermatological Beauty",
    "category": "Dermocosmétique",
    "aliases": [
      "La Roche-Posay",
      "La Roche Posay",
      "LRP"
    ],
    "image": "logos_jpeg/la_roche_posay.svg"
  },
  {
    "key": "bioderma",
    "name": "Bioderma",
    "group": "NAOS",
    "category": "Dermocosmétique",
    "aliases": [
      "Bioderma",
      "Laboratoire Bioderma",
      "BIODERMA"
    ],
    "image": "logos_jpeg/bioderma.svg"
  },
  {
    "key": "vichy",
    "name": "Vichy",
    "group": "L'Oréal Dermatological Beauty",
    "category": "Dermocosmétique",
    "aliases": [
      "Vichy",
      "Vichy Laboratoires",
      "Laboratoires Vichy"
    ],
    "image": "logos_jpeg/vichy.svg"
  },
  {
    "key": "uriage",
    "name": "Uriage",
    "group": "Puig",
    "category": "Dermocosmétique",
    "aliases": [
      "Uriage",
      "Puig",
      "Laboratoires Dermatologiques d'Uriage",
      "URIAGE"
    ],
    "image": "logos_jpeg/uriage.svg"
  },
  {
    "key": "svr",
    "name": "SVR",
    "group": "Laboratoire SVR",
    "category": "Dermocosmétique",
    "aliases": [
      "SVR",
      "Laboratoire SVR",
      "SVR Laboratoire Dermatologique"
    ],
    "image": "logos_jpeg/svr.svg"
  },
  {
    "key": "ducray",
    "name": "Ducray",
    "group": "Laboratoires Pierre Fabre",
    "category": "Dermocosmétique",
    "aliases": [
      "Ducray",
      "Laboratoires Ducray"
    ],
    "image": "logos_jpeg/ducray.svg"
  },
  {
    "key": "a_derma",
    "name": "A-Derma",
    "group": "Laboratoires Pierre Fabre",
    "category": "Dermocosmétique",
    "aliases": [
      "A-Derma",
      "Aderma",
      "A Derma"
    ],
    "image": "logos_jpeg/a_derma.svg"
  },
  {
    "key": "klorane",
    "name": "Klorane",
    "group": "Laboratoires Pierre Fabre",
    "category": "Dermocosmétique",
    "aliases": [
      "Klorane",
      "Laboratoires Klorane"
    ],
    "image": "logos_jpeg/klorane.svg"
  },
  {
    "key": "rene_furterer",
    "name": "René Furterer",
    "group": "Laboratoires Pierre Fabre",
    "category": "Capillaire",
    "aliases": [
      "René Furterer",
      "Rene Furterer",
      "Furterer"
    ],
    "image": "logos_jpeg/rene_furterer.svg"
  },
  {
    "key": "eucerin",
    "name": "Eucerin",
    "group": "Beiersdorf",
    "category": "Dermocosmétique",
    "aliases": [
      "Eucerin",
      "Eucerin Dermatological Skincare"
    ],
    "image": "logos_jpeg/eucerin.svg"
  },
  {
    "key": "cerave",
    "name": "CeraVe",
    "group": "L'Oréal Dermatological Beauty",
    "category": "Dermocosmétique",
    "aliases": [
      "CeraVe",
      "Cerave",
      "Cera Ve"
    ],
    "image": "logos_jpeg/cerave.svg"
  },
  {
    "key": "cetaphil",
    "name": "Cetaphil",
    "group": "Galderma",
    "category": "Dermocosmétique",
    "aliases": [
      "Cetaphil",
      "CETAPHIL"
    ],
    "image": "logos_jpeg/cetaphil.svg"
  },
  {
    "key": "mustela",
    "name": "Mustela",
    "group": "Laboratoires Expanscience",
    "category": "Bébé / maternité",
    "aliases": [
      "Mustela",
      "Expanscience Mustela"
    ],
    "image": "logos_jpeg/mustela.svg"
  },
  {
    "key": "topicrem",
    "name": "Topicrem",
    "group": "Mayoly",
    "category": "Dermocosmétique",
    "aliases": [
      "Topicrem",
      "Laboratoires Topicrem"
    ],
    "image": "logos_jpeg/topicrem.svg"
  },
  {
    "key": "embryolisse",
    "name": "Embryolisse",
    "group": "Embryolisse",
    "category": "Dermocosmétique",
    "aliases": [
      "Embryolisse",
      "Embryolisse Laboratoires"
    ],
    "image": "logos_jpeg/embryolisse.svg"
  },
  {
    "key": "filorga",
    "name": "Filorga",
    "group": "Laboratoires Filorga",
    "category": "Dermocosmétique",
    "aliases": [
      "Filorga",
      "Laboratoires Filorga",
      "FILORGA"
    ],
    "image": "logos_jpeg/filorga.svg"
  },
  {
    "key": "nuxe",
    "name": "Nuxe",
    "group": "Groupe Nuxe",
    "category": "Dermocosmétique",
    "aliases": [
      "Nuxe",
      "NUXE Paris"
    ],
    "image": "logos_jpeg/nuxe.svg"
  },
  {
    "key": "caudalie",
    "name": "Caudalie",
    "group": "Caudalie",
    "category": "Dermocosmétique",
    "aliases": [
      "Caudalie",
      "Caudalie Paris"
    ],
    "image": "logos_jpeg/caudalie.svg"
  },
  {
    "key": "lierac",
    "name": "Lierac",
    "group": "Laboratoire Native",
    "category": "Dermocosmétique",
    "aliases": [
      "Lierac",
      "Lierac Paris",
      "LIERAC"
    ],
    "image": "logos_jpeg/lierac.svg"
  },
  {
    "key": "garancia",
    "name": "Garancia",
    "group": "Laboratoire Garancia",
    "category": "Dermocosmétique",
    "aliases": [
      "Garancia",
      "Laboratoire Garancia"
    ],
    "image": "logos_jpeg/garancia.svg"
  },
  {
    "key": "cattier",
    "name": "Cattier",
    "group": "Kneipp",
    "category": "Cosmétique naturelle",
    "aliases": [
      "Cattier",
      "Kneipp",
      "Cattier Paris"
    ],
    "image": "logos_jpeg/cattier.svg"
  },
  {
    "key": "melvita",
    "name": "Melvita",
    "group": "L'Occitane Groupe",
    "category": "Cosmétique naturelle",
    "aliases": [
      "Melvita",
      "L'Occitane Groupe",
      "Melvita France"
    ],
    "image": "logos_jpeg/melvita.svg"
  },
  {
    "key": "sanoflore",
    "name": "Sanoflore",
    "group": "L'Oréal",
    "category": "Cosmétique naturelle",
    "aliases": [
      "Sanoflore",
      "Laboratoire Sanoflore"
    ],
    "image": "logos_jpeg/sanoflore.svg"
  },
  {
    "key": "weleda",
    "name": "Weleda",
    "group": "Weleda",
    "category": "Cosmétique naturelle",
    "aliases": [
      "Weleda",
      "Weleda France"
    ],
    "image": "logos_jpeg/weleda.svg"
  },
  {
    "key": "la_rosee",
    "name": "La Rosée",
    "group": "La Rosée",
    "category": "Dermocosmétique",
    "aliases": [
      "La Rosée",
      "La Rosee"
    ],
    "image": "logos_jpeg/la_rosee.svg"
  },
  {
    "key": "laboratoires_de_biarritz",
    "name": "Laboratoires de Biarritz",
    "group": "Laboratoires de Biarritz",
    "category": "Dermocosmétique",
    "aliases": [
      "Laboratoires de Biarritz",
      "Biarritz Laboratoires"
    ],
    "image": "logos_jpeg/laboratoires_de_biarritz.svg"
  },
  {
    "key": "dermaceutic",
    "name": "Dermaceutic",
    "group": "Dermaceutic Laboratoire",
    "category": "Dermocosmétique",
    "aliases": [
      "Dermaceutic",
      "Dermaceutic Laboratoire"
    ],
    "image": "logos_jpeg/dermaceutic.svg"
  },
  {
    "key": "acm",
    "name": "ACM",
    "group": "Laboratoire ACM",
    "category": "Dermocosmétique",
    "aliases": [
      "ACM",
      "Laboratoire ACM",
      "Laboratoire Dermatologique ACM"
    ],
    "image": "logos_jpeg/acm.svg"
  },
  {
    "key": "isispharma",
    "name": "Isispharma",
    "group": "Isispharma",
    "category": "Dermocosmétique",
    "aliases": [
      "Isispharma",
      "ISISPHARMA",
      "Isis Pharma"
    ],
    "image": "logos_jpeg/isispharma.svg"
  },
  {
    "key": "patyka",
    "name": "Patyka",
    "group": "Patyka",
    "category": "Cosmétique naturelle",
    "aliases": [
      "Patyka",
      "PATYKA"
    ],
    "image": "logos_jpeg/patyka.svg"
  },
  {
    "key": "neutrogena",
    "name": "Neutrogena",
    "group": "Kenvue",
    "category": "Dermocosmétique",
    "aliases": [
      "Neutrogena",
      "Neutrogena France"
    ],
    "image": "logos_jpeg/neutrogena.svg"
  },
  {
    "key": "nivea",
    "name": "Nivea",
    "group": "Beiersdorf",
    "category": "Dermocosmétique",
    "aliases": [
      "Nivea",
      "NIVEA"
    ],
    "image": "logos_jpeg/nivea.svg"
  },
  {
    "key": "dove",
    "name": "Dove",
    "group": "Unilever",
    "category": "Hygiène / soin",
    "aliases": [
      "Dove",
      "DOVE"
    ],
    "image": "logos_jpeg/dove.svg"
  },
  {
    "key": "mixa",
    "name": "Mixa",
    "group": "L'Oréal",
    "category": "Dermocosmétique",
    "aliases": [
      "Mixa",
      "MIXA"
    ],
    "image": "logos_jpeg/mixa.svg"
  },
  {
    "key": "arkopharma",
    "name": "Arkopharma",
    "group": "Arkopharma",
    "category": "Phytothérapie",
    "aliases": [
      "Arkopharma",
      "Laboratoires Arkopharma",
      "Arko Pharma"
    ],
    "image": "logos_jpeg/arkopharma.svg"
  },
  {
    "key": "puressentiel",
    "name": "Puressentiel",
    "group": "Puressentiel",
    "category": "Aromathérapie",
    "aliases": [
      "Puressentiel",
      "Laboratoire Puressentiel"
    ],
    "image": "logos_jpeg/puressentiel.svg"
  },
  {
    "key": "pranarom",
    "name": "Pranarôm",
    "group": "Inula",
    "category": "Aromathérapie",
    "aliases": [
      "Pranarôm",
      "Inula",
      "Pranarom",
      "Laboratoire Pranarôm"
    ],
    "image": "logos_jpeg/pranarom.svg"
  },
  {
    "key": "pileje",
    "name": "PiLeJe",
    "group": "Groupe PiLeJe",
    "category": "Micronutrition",
    "aliases": [
      "PiLeJe",
      "Groupe PiLeJe",
      "Pileje",
      "Laboratoire PiLeJe"
    ],
    "image": "logos_jpeg/pileje.svg"
  },
  {
    "key": "nutergia",
    "name": "Nutergia",
    "group": "Laboratoire Nutergia",
    "category": "Micronutrition",
    "aliases": [
      "Nutergia",
      "Laboratoire Nutergia"
    ],
    "image": "logos_jpeg/nutergia.svg"
  },
  {
    "key": "nhco_nutrition",
    "name": "NHCO Nutrition",
    "group": "Chiesi",
    "category": "Compléments alimentaires",
    "aliases": [
      "NHCO Nutrition",
      "NHCO",
      "Laboratoires NHCO"
    ],
    "image": "logos_jpeg/nhco_nutrition.svg"
  },
  {
    "key": "oenobiol",
    "name": "Oenobiol",
    "group": "Oenobiol",
    "category": "Compléments alimentaires",
    "aliases": [
      "Oenobiol",
      "Oenobiol Paris"
    ],
    "image": "logos_jpeg/oenobiol.svg"
  },
  {
    "key": "ineldea",
    "name": "Ineldea",
    "group": "Laboratoires Ineldea",
    "category": "Compléments alimentaires",
    "aliases": [
      "Ineldea",
      "Laboratoires Ineldea"
    ],
    "image": "logos_jpeg/ineldea.svg"
  },
  {
    "key": "granions",
    "name": "Granions",
    "group": "EA Pharma",
    "category": "Compléments alimentaires",
    "aliases": [
      "Granions",
      "EA Pharma",
      "Laboratoire des Granions",
      "Granions Laboratoire"
    ],
    "image": "logos_jpeg/granions.svg"
  },
  {
    "key": "solgar",
    "name": "Solgar",
    "group": "Nestlé Health Science",
    "category": "Compléments alimentaires",
    "aliases": [
      "Solgar",
      "Nestlé Health Science",
      "Solgar France"
    ],
    "image": "logos_jpeg/solgar.svg"
  },
  {
    "key": "forte_pharma",
    "name": "Forté Pharma",
    "group": "Reig Jofre",
    "category": "Compléments alimentaires",
    "aliases": [
      "Forté Pharma",
      "Reig Jofre",
      "Forte Pharma",
      "Laboratoires Forté Pharma"
    ],
    "image": "logos_jpeg/forte_pharma.svg"
  },
  {
    "key": "biocyte",
    "name": "Biocyte",
    "group": "Biocyte",
    "category": "Compléments alimentaires",
    "aliases": [
      "Biocyte",
      "Laboratoire Biocyte"
    ],
    "image": "logos_jpeg/biocyte.svg"
  },
  {
    "key": "eric_favre",
    "name": "Eric Favre",
    "group": "Laboratoire Eric Favre",
    "category": "Nutrition / sport",
    "aliases": [
      "Eric Favre",
      "Laboratoire Eric Favre",
      "Laboratoire Éric Favre"
    ],
    "image": "logos_jpeg/eric_favre.svg"
  },
  {
    "key": "laboratoire_lescuyer",
    "name": "Laboratoire Lescuyer",
    "group": "Laboratoire Lescuyer",
    "category": "Micronutrition",
    "aliases": [
      "Laboratoire Lescuyer",
      "Lescuyer"
    ],
    "image": "logos_jpeg/laboratoire_lescuyer.svg"
  },
  {
    "key": "super_diet",
    "name": "Super Diet",
    "group": "Urgo Group",
    "category": "Phytothérapie",
    "aliases": [
      "Super Diet",
      "Urgo Group",
      "Superdiet",
      "Laboratoires Super Diet"
    ],
    "image": "logos_jpeg/super_diet.svg"
  },
  {
    "key": "naturactive",
    "name": "Naturactive",
    "group": "Laboratoires Pierre Fabre",
    "category": "Phytothérapie",
    "aliases": [
      "Naturactive",
      "Natur'Active",
      "Natur Active"
    ],
    "image": "logos_jpeg/naturactive.svg"
  },
  {
    "key": "d_plantes",
    "name": "D.Plantes",
    "group": "D.Plantes",
    "category": "Compléments alimentaires",
    "aliases": [
      "D.Plantes",
      "D Plantes",
      "Laboratoire D.Plantes"
    ],
    "image": "logos_jpeg/d_plantes.svg"
  },
  {
    "key": "bion3",
    "name": "Bion3",
    "group": "Opella",
    "category": "Compléments alimentaires",
    "aliases": [
      "Bion3",
      "Bion 3"
    ],
    "image": "logos_jpeg/bion3.svg"
  },
  {
    "key": "berocca",
    "name": "Berocca",
    "group": "Bayer Consumer Health",
    "category": "Vitamines",
    "aliases": [
      "Berocca",
      "Bayer Consumer Health",
      "BEROCCA"
    ],
    "image": "logos_jpeg/berocca.svg"
  },
  {
    "key": "alvityl",
    "name": "Alvityl",
    "group": "Urgo Healthcare",
    "category": "Vitamines",
    "aliases": [
      "Alvityl",
      "ALVITYL"
    ],
    "image": "logos_jpeg/alvityl.svg"
  },
  {
    "key": "juvamine",
    "name": "Juvamine",
    "group": "Urgo Group",
    "category": "Compléments alimentaires",
    "aliases": [
      "Juvamine",
      "Urgo Group",
      "Laboratoires Juvamine"
    ],
    "image": "logos_jpeg/juvamine.svg"
  },
  {
    "key": "vitavea",
    "name": "Vitavea",
    "group": "Vitavea",
    "category": "Compléments alimentaires",
    "aliases": [
      "Vitavea",
      "Laboratoires Vitavea"
    ],
    "image": "logos_jpeg/vitavea.svg"
  },
  {
    "key": "pediakid",
    "name": "Pediakid",
    "group": "Ineldea",
    "category": "Compléments enfants",
    "aliases": [
      "Pediakid",
      "PEDIAKID"
    ],
    "image": "logos_jpeg/pediakid.svg"
  },
  {
    "key": "eafit",
    "name": "Eafit",
    "group": "EA Pharma",
    "category": "Nutrition / sport",
    "aliases": [
      "Eafit",
      "EA Pharma",
      "EAFIT"
    ],
    "image": "logos_jpeg/eafit.svg"
  },
  {
    "key": "novoma",
    "name": "Novoma",
    "group": "Novoma",
    "category": "Compléments alimentaires",
    "aliases": [
      "Novoma",
      "NOVOMA"
    ],
    "image": "logos_jpeg/novoma.svg"
  },
  {
    "key": "upsa",
    "name": "UPSA",
    "group": "UPSA",
    "category": "Pharmaceutique / OTC",
    "aliases": [
      "UPSA",
      "UPSA Laboratoires",
      "Laboratoires UPSA"
    ],
    "image": "logos_jpeg/upsa.svg"
  },
  {
    "key": "sanofi",
    "name": "Sanofi",
    "group": "Sanofi",
    "category": "Pharmaceutique",
    "aliases": [
      "Sanofi",
      "Sanofi Aventis"
    ],
    "image": "logos_jpeg/sanofi.svg"
  },
  {
    "key": "opella",
    "name": "Opella",
    "group": "Opella",
    "category": "Santé grand public",
    "aliases": [
      "Opella",
      "Sanofi Consumer Healthcare",
      "Opella Healthcare"
    ],
    "image": "logos_jpeg/opella.svg"
  },
  {
    "key": "gsk",
    "name": "GSK",
    "group": "GSK",
    "category": "Pharmaceutique",
    "aliases": [
      "GSK",
      "GlaxoSmithKline",
      "Glaxo Smith Kline"
    ],
    "image": "logos_jpeg/gsk.svg"
  },
  {
    "key": "haleon",
    "name": "Haleon",
    "group": "Haleon",
    "category": "Santé grand public",
    "aliases": [
      "Haleon",
      "Haleon France"
    ],
    "image": "logos_jpeg/haleon.svg"
  },
  {
    "key": "pfizer",
    "name": "Pfizer",
    "group": "Pfizer",
    "category": "Pharmaceutique",
    "aliases": [
      "Pfizer",
      "Pfizer France"
    ],
    "image": "logos_jpeg/pfizer.svg"
  },
  {
    "key": "novartis",
    "name": "Novartis",
    "group": "Novartis",
    "category": "Pharmaceutique",
    "aliases": [
      "Novartis",
      "Novartis Pharma"
    ],
    "image": "logos_jpeg/novartis.svg"
  },
  {
    "key": "sandoz",
    "name": "Sandoz",
    "group": "Sandoz",
    "category": "Médicaments génériques",
    "aliases": [
      "Sandoz",
      "Sandoz France"
    ],
    "image": "logos_jpeg/sandoz.svg"
  },
  {
    "key": "roche",
    "name": "Roche",
    "group": "F. Hoffmann-La Roche",
    "category": "Pharmaceutique",
    "aliases": [
      "Roche",
      "F. Hoffmann-La Roche",
      "Hoffmann-La Roche",
      "Laboratoires Roche"
    ],
    "image": "logos_jpeg/roche.svg"
  },
  {
    "key": "merck_msd",
    "name": "Merck / MSD",
    "group": "Merck & Co. / MSD",
    "category": "Pharmaceutique",
    "aliases": [
      "Merck / MSD",
      "Merck & Co. / MSD",
      "Merck",
      "MSD",
      "Merck Sharp & Dohme"
    ],
    "image": "logos_jpeg/merck_msd.svg"
  },
  {
    "key": "bayer",
    "name": "Bayer",
    "group": "Bayer",
    "category": "Pharmaceutique / OTC",
    "aliases": [
      "Bayer",
      "Bayer Healthcare",
      "Bayer Consumer Health"
    ],
    "image": "logos_jpeg/bayer.svg"
  },
  {
    "key": "abbott",
    "name": "Abbott",
    "group": "Abbott",
    "category": "Santé / dispositifs",
    "aliases": [
      "Abbott",
      "Abbott Laboratories"
    ],
    "image": "logos_jpeg/abbott.svg"
  },
  {
    "key": "abbvie",
    "name": "AbbVie",
    "group": "AbbVie",
    "category": "Pharmaceutique",
    "aliases": [
      "AbbVie",
      "Abbvie France"
    ],
    "image": "logos_jpeg/abbvie.svg"
  },
  {
    "key": "astrazeneca",
    "name": "AstraZeneca",
    "group": "AstraZeneca",
    "category": "Pharmaceutique",
    "aliases": [
      "AstraZeneca",
      "Astra Zeneca"
    ],
    "image": "logos_jpeg/astrazeneca.svg"
  },
  {
    "key": "eli_lilly",
    "name": "Eli Lilly",
    "group": "Eli Lilly and Company",
    "category": "Pharmaceutique",
    "aliases": [
      "Eli Lilly",
      "Eli Lilly and Company",
      "Lilly",
      "Lilly France"
    ],
    "image": "logos_jpeg/eli_lilly.svg"
  },
  {
    "key": "johnson_et_johnson",
    "name": "Johnson & Johnson",
    "group": "Johnson & Johnson",
    "category": "Santé",
    "aliases": [
      "Johnson & Johnson",
      "Johnson and Johnson",
      "J&J"
    ],
    "image": "logos_jpeg/johnson_et_johnson.svg"
  },
  {
    "key": "kenvue",
    "name": "Kenvue",
    "group": "Kenvue",
    "category": "Santé grand public",
    "aliases": [
      "Kenvue",
      "Kenvue France"
    ],
    "image": "logos_jpeg/kenvue.svg"
  },
  {
    "key": "janssen",
    "name": "Janssen",
    "group": "Johnson & Johnson",
    "category": "Pharmaceutique",
    "aliases": [
      "Janssen",
      "Janssen-Cilag",
      "Janssen Cilag"
    ],
    "image": "logos_jpeg/janssen.svg"
  },
  {
    "key": "bristol_myers_squibb",
    "name": "Bristol Myers Squibb",
    "group": "Bristol Myers Squibb",
    "category": "Pharmaceutique",
    "aliases": [
      "Bristol Myers Squibb",
      "BMS",
      "Bristol-Myers Squibb"
    ],
    "image": "logos_jpeg/bristol_myers_squibb.svg"
  },
  {
    "key": "boehringer_ingelheim",
    "name": "Boehringer Ingelheim",
    "group": "Boehringer Ingelheim",
    "category": "Pharmaceutique",
    "aliases": [
      "Boehringer Ingelheim",
      "Boehringer"
    ],
    "image": "logos_jpeg/boehringer_ingelheim.svg"
  },
  {
    "key": "takeda",
    "name": "Takeda",
    "group": "Takeda",
    "category": "Pharmaceutique",
    "aliases": [
      "Takeda",
      "Takeda France"
    ],
    "image": "logos_jpeg/takeda.svg"
  },
  {
    "key": "teva",
    "name": "Teva",
    "group": "Teva",
    "category": "Médicaments génériques",
    "aliases": [
      "Teva",
      "Teva Santé",
      "Teva Sante"
    ],
    "image": "logos_jpeg/teva.svg"
  },
  {
    "key": "viatris",
    "name": "Viatris",
    "group": "Viatris",
    "category": "Médicaments génériques",
    "aliases": [
      "Viatris",
      "Viatris Santé"
    ],
    "image": "logos_jpeg/viatris.svg"
  },
  {
    "key": "mylan",
    "name": "Mylan",
    "group": "Viatris",
    "category": "Médicaments génériques",
    "aliases": [
      "Mylan",
      "Mylan Medical"
    ],
    "image": "logos_jpeg/mylan.svg"
  },
  {
    "key": "amgen",
    "name": "Amgen",
    "group": "Amgen",
    "category": "Biotechnologies",
    "aliases": [
      "Amgen",
      "Amgen France"
    ],
    "image": "logos_jpeg/amgen.svg"
  },
  {
    "key": "biogen",
    "name": "Biogen",
    "group": "Biogen",
    "category": "Biotechnologies",
    "aliases": [
      "Biogen",
      "Biogen France"
    ],
    "image": "logos_jpeg/biogen.svg"
  },
  {
    "key": "ucb",
    "name": "UCB",
    "group": "UCB",
    "category": "Pharmaceutique",
    "aliases": [
      "UCB",
      "UCB Pharma"
    ],
    "image": "logos_jpeg/ucb.svg"
  },
  {
    "key": "servier",
    "name": "Servier",
    "group": "Servier",
    "category": "Pharmaceutique",
    "aliases": [
      "Servier",
      "Laboratoires Servier"
    ],
    "image": "logos_jpeg/servier.svg"
  },
  {
    "key": "ipsen",
    "name": "Ipsen",
    "group": "Ipsen",
    "category": "Pharmaceutique",
    "aliases": [
      "Ipsen",
      "Ipsen Pharma"
    ],
    "image": "logos_jpeg/ipsen.svg"
  },
  {
    "key": "chiesi",
    "name": "Chiesi",
    "group": "Chiesi",
    "category": "Pharmaceutique",
    "aliases": [
      "Chiesi",
      "Chiesi Farmaceutici"
    ],
    "image": "logos_jpeg/chiesi.svg"
  },
  {
    "key": "menarini",
    "name": "Menarini",
    "group": "Menarini",
    "category": "Pharmaceutique",
    "aliases": [
      "Menarini",
      "Laboratoires Menarini"
    ],
    "image": "logos_jpeg/menarini.svg"
  },
  {
    "key": "almirall",
    "name": "Almirall",
    "group": "Almirall",
    "category": "Pharmaceutique",
    "aliases": [
      "Almirall",
      "Almirall France"
    ],
    "image": "logos_jpeg/almirall.svg"
  },
  {
    "key": "lundbeck",
    "name": "Lundbeck",
    "group": "Lundbeck",
    "category": "Pharmaceutique",
    "aliases": [
      "Lundbeck",
      "H. Lundbeck"
    ],
    "image": "logos_jpeg/lundbeck.svg"
  },
  {
    "key": "organon",
    "name": "Organon",
    "group": "Organon",
    "category": "Pharmaceutique",
    "aliases": [
      "Organon",
      "Organon France"
    ],
    "image": "logos_jpeg/organon.svg"
  },
  {
    "key": "novo_nordisk",
    "name": "Novo Nordisk",
    "group": "Novo Nordisk",
    "category": "Pharmaceutique",
    "aliases": [
      "Novo Nordisk",
      "NovoNordisk"
    ],
    "image": "logos_jpeg/novo_nordisk.svg"
  },
  {
    "key": "fresenius_kabi",
    "name": "Fresenius Kabi",
    "group": "Fresenius",
    "category": "Pharmaceutique / nutrition clinique",
    "aliases": [
      "Fresenius Kabi",
      "Fresenius"
    ],
    "image": "logos_jpeg/fresenius_kabi.svg"
  },
  {
    "key": "b_braun",
    "name": "B. Braun",
    "group": "B. Braun",
    "category": "Dispositifs médicaux",
    "aliases": [
      "B. Braun",
      "B Braun",
      "Braun Medical"
    ],
    "image": "logos_jpeg/b_braun.svg"
  },
  {
    "key": "gedeon_richter",
    "name": "Gedeon Richter",
    "group": "Gedeon Richter",
    "category": "Pharmaceutique",
    "aliases": [
      "Gedeon Richter",
      "Richter Gedeon"
    ],
    "image": "logos_jpeg/gedeon_richter.svg"
  },
  {
    "key": "recordati",
    "name": "Recordati",
    "group": "Recordati",
    "category": "Pharmaceutique",
    "aliases": [
      "Recordati",
      "Recordati Rare Diseases"
    ],
    "image": "logos_jpeg/recordati.svg"
  },
  {
    "key": "angelini_pharma",
    "name": "Angelini Pharma",
    "group": "Angelini Pharma",
    "category": "Pharmaceutique",
    "aliases": [
      "Angelini Pharma",
      "Angelini"
    ],
    "image": "logos_jpeg/angelini_pharma.svg"
  },
  {
    "key": "zambon",
    "name": "Zambon",
    "group": "Zambon",
    "category": "Pharmaceutique",
    "aliases": [
      "Zambon",
      "Zambon France"
    ],
    "image": "logos_jpeg/zambon.svg"
  },
  {
    "key": "grunenthal",
    "name": "Grünenthal",
    "group": "Grünenthal",
    "category": "Pharmaceutique",
    "aliases": [
      "Grünenthal",
      "Grunenthal"
    ],
    "image": "logos_jpeg/grunenthal.svg"
  },
  {
    "key": "biocodex",
    "name": "Biocodex",
    "group": "Biocodex",
    "category": "Pharmaceutique",
    "aliases": [
      "Biocodex",
      "Laboratoires Biocodex"
    ],
    "image": "logos_jpeg/biocodex.svg"
  },
  {
    "key": "boiron",
    "name": "Boiron",
    "group": "Boiron",
    "category": "Homéopathie",
    "aliases": [
      "Boiron",
      "Laboratoires Boiron"
    ],
    "image": "logos_jpeg/boiron.svg"
  },
  {
    "key": "lehning",
    "name": "Lehning",
    "group": "Laboratoires Lehning",
    "category": "Homéopathie / phytothérapie",
    "aliases": [
      "Lehning",
      "Laboratoires Lehning",
      "Laboratoire Lehning"
    ],
    "image": "logos_jpeg/lehning.svg"
  },
  {
    "key": "cooper",
    "name": "Cooper",
    "group": "Cooper",
    "category": "OTC / premiers soins",
    "aliases": [
      "Cooper",
      "Laboratoire Cooper"
    ],
    "image": "logos_jpeg/cooper.svg"
  },
  {
    "key": "urgo_healthcare",
    "name": "Urgo Healthcare",
    "group": "Urgo Group",
    "category": "Premiers soins",
    "aliases": [
      "Urgo Healthcare",
      "Urgo Group",
      "URGO",
      "Laboratoires Urgo"
    ],
    "image": "logos_jpeg/urgo_healthcare.svg"
  },
  {
    "key": "laboratoires_gilbert",
    "name": "Laboratoires Gilbert",
    "group": "Groupe Batteur",
    "category": "OTC / hygiène",
    "aliases": [
      "Laboratoires Gilbert",
      "Groupe Batteur",
      "Gilbert",
      "Laboratoire Gilbert"
    ],
    "image": "logos_jpeg/laboratoires_gilbert.svg"
  },
  {
    "key": "mayoly",
    "name": "Mayoly",
    "group": "Mayoly",
    "category": "Pharmaceutique",
    "aliases": [
      "Mayoly",
      "Mayoly Spindler",
      "Laboratoires Mayoly"
    ],
    "image": "logos_jpeg/mayoly.svg"
  },
  {
    "key": "laboratoires_expanscience",
    "name": "Laboratoires Expanscience",
    "group": "Expanscience",
    "category": "Dermocosmétique / rhumatologie",
    "aliases": [
      "Laboratoires Expanscience",
      "Expanscience"
    ],
    "image": "logos_jpeg/laboratoires_expanscience.svg"
  },
  {
    "key": "laboratoires_pierre_fabre",
    "name": "Laboratoires Pierre Fabre",
    "group": "Pierre Fabre",
    "category": "Dermocosmétique / pharmaceutique",
    "aliases": [
      "Laboratoires Pierre Fabre",
      "Pierre Fabre",
      "Groupe Pierre Fabre"
    ],
    "image": "logos_jpeg/laboratoires_pierre_fabre.svg"
  },
  {
    "key": "l_oreal_dermatological_beauty",
    "name": "L'Oréal Dermatological Beauty",
    "group": "L'Oréal",
    "category": "Dermocosmétique",
    "aliases": [
      "L'Oréal Dermatological Beauty",
      "L'Oreal Dermatological Beauty",
      "LDB"
    ],
    "image": "logos_jpeg/l_oreal_dermatological_beauty.svg"
  },
  {
    "key": "naos",
    "name": "NAOS",
    "group": "NAOS",
    "category": "Dermocosmétique",
    "aliases": [
      "NAOS",
      "Groupe NAOS"
    ],
    "image": "logos_jpeg/naos.svg"
  },
  {
    "key": "beiersdorf",
    "name": "Beiersdorf",
    "group": "Beiersdorf",
    "category": "Dermocosmétique",
    "aliases": [
      "Beiersdorf",
      "Beiersdorf France"
    ],
    "image": "logos_jpeg/beiersdorf.svg"
  },
  {
    "key": "laboratoire_native",
    "name": "Laboratoire Native",
    "group": "Laboratoire Native",
    "category": "Dermocosmétique",
    "aliases": [
      "Laboratoire Native",
      "Native Laboratoire"
    ],
    "image": "logos_jpeg/laboratoire_native.svg"
  },
  {
    "key": "groupe_nuxe",
    "name": "Groupe Nuxe",
    "group": "Groupe Nuxe",
    "category": "Dermocosmétique",
    "aliases": [
      "Groupe Nuxe",
      "Nuxe Groupe"
    ],
    "image": "logos_jpeg/groupe_nuxe.svg"
  },
  {
    "key": "galderma",
    "name": "Galderma",
    "group": "Galderma",
    "category": "Dermatologie",
    "aliases": [
      "Galderma",
      "Galderma France"
    ],
    "image": "logos_jpeg/galderma.svg"
  },
  {
    "key": "l_oreal",
    "name": "L'Oréal",
    "group": "L'Oréal Groupe",
    "category": "Cosmétique",
    "aliases": [
      "L'Oréal",
      "L'Oréal Groupe",
      "L'Oreal",
      "Loreal"
    ],
    "image": "logos_jpeg/l_oreal.svg"
  },
  {
    "key": "unilever",
    "name": "Unilever",
    "group": "Unilever",
    "category": "Hygiène / soin",
    "aliases": [
      "Unilever",
      "Unilever France"
    ],
    "image": "logos_jpeg/unilever.svg"
  },
  {
    "key": "reckitt",
    "name": "Reckitt",
    "group": "Reckitt",
    "category": "Santé grand public",
    "aliases": [
      "Reckitt",
      "Reckitt Benckiser",
      "RB"
    ],
    "image": "logos_jpeg/reckitt.svg"
  },
  {
    "key": "procter_et_gamble",
    "name": "Procter & Gamble",
    "group": "Procter & Gamble",
    "category": "Hygiène / soin",
    "aliases": [
      "Procter & Gamble",
      "P&G",
      "Procter and Gamble"
    ],
    "image": "logos_jpeg/procter_et_gamble.svg"
  },
  {
    "key": "perrigo",
    "name": "Perrigo",
    "group": "Perrigo",
    "category": "Santé grand public",
    "aliases": [
      "Perrigo",
      "Perrigo France"
    ],
    "image": "logos_jpeg/perrigo.svg"
  },
  {
    "key": "sartorius",
    "name": "Sartorius",
    "group": "Sartorius",
    "category": "Technologies de santé",
    "aliases": [
      "Sartorius",
      "Sartorius Stedim Biotech"
    ],
    "image": "logos_jpeg/sartorius.svg"
  },
  {
    "key": "philips",
    "name": "Philips",
    "group": "Philips",
    "category": "Technologies de santé",
    "aliases": [
      "Philips",
      "Philips Healthcare"
    ],
    "image": "logos_jpeg/philips.svg"
  },
  {
    "key": "medtronic",
    "name": "Medtronic",
    "group": "Medtronic",
    "category": "Dispositifs médicaux",
    "aliases": [
      "Medtronic",
      "Medtronic France"
    ],
    "image": "logos_jpeg/medtronic.svg"
  },
  {
    "key": "thermo_fisher_scientific",
    "name": "Thermo Fisher Scientific",
    "group": "Thermo Fisher Scientific",
    "category": "Sciences de la vie",
    "aliases": [
      "Thermo Fisher Scientific",
      "Thermo Fisher"
    ],
    "image": "logos_jpeg/thermo_fisher_scientific.svg"
  }
];
