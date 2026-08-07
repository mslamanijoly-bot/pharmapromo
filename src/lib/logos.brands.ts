// ──────────────────────────────────────────────────────────────────────
//  MARQUES PRODUIT → LABORATOIRE  ·  FICHIER À ENRICHIR À LA MAIN
//
//  Le catalogue (logos.catalog.ts + logos.extra.ts) raisonne en laboratoires et en groupes.
//  Mais un libellé de rayon dit « Bain de bouche ELUDRIL », pas « Pierre Fabre ». Ce fichier
//  fait le pont : chaque marque produit renvoie vers la CLÉ d'une entrée du catalogue.
//
//  C'EST ICI qu'on gagne de la couverture. La boucle de travail :
//   1. `npm run logos:suggerer`  → marques-a-completer.txt, les marques inconnues de VOS fichiers
//   2. on remplit les cibles, on colle ici
//   3. `npm run logos:annoter -- mon-fichier.xlsx` → les lignes repartent avec leur logo
//
//  Une seule règle : la valeur DOIT être une clé existante du catalogue. Un test le vérifie,
//  donc une faute de frappe casse `npm test` au lieu de passer inaperçue jusqu'en rayon.
//
//  ⚠ Les rattachements marque → maison mère bougent au gré des rachats (Nicorette est passé
//  de J&J à Kenvue, Saforelle d'Iprad à Mayoly). Ceux-ci sont à jour à la mise en place ;
//  vérifiez ceux qui comptent pour vous avant d'imprimer une série.
// ──────────────────────────────────────────────────────────────────────

export const PRODUCT_BRANDS: Record<string, string> = {
  // ── Pierre Fabre ────────────────────────────────────────────────────
  'Eludril': 'laboratoires_pierre_fabre',
  'Elgydium': 'laboratoires_pierre_fabre',
  'Arthrodont': 'laboratoires_pierre_fabre',
  'Cirkan': 'laboratoires_pierre_fabre',
  'Permixon': 'laboratoires_pierre_fabre',
  'Dexeryl': 'laboratoires_pierre_fabre',
  'Kertyol': 'ducray',
  'Anacaps': 'ducray',
  'Melascreen': 'ducray',
  'Squanorm': 'ducray',
  'Couvrance': 'avene',
  'Cicalfate': 'avene',
  'Hydrance': 'avene',
  'Cleanance': 'avene',
  'Xeracalm': 'avene',
  'Exomega': 'a_derma',
  'Dermalibour': 'a_derma',

  // ── L'Oréal (LDB & grand public) ────────────────────────────────────
  'Anthelios': 'la_roche_posay',
  'Effaclar': 'la_roche_posay',
  'Cicaplast': 'la_roche_posay',
  'Lipikar': 'la_roche_posay',
  'Toleriane': 'la_roche_posay',
  'Hyalu': 'la_roche_posay',
  'Dercos': 'vichy',
  'Liftactiv': 'vichy',
  'Normaderm': 'vichy',
  'Garnier': 'l_oreal',
  'Elseve': 'l_oreal',

  // ── Arkopharma ──────────────────────────────────────────────────────
  'Azinc': 'arkopharma',
  'Arkofluide': 'arkopharma',
  'Arkogelules': 'arkopharma',
  'Arkogélules': 'arkopharma',
  'Arkorelax': 'arkopharma',
  'Forcapil': 'arkopharma',

  // ── PiLeJe ──────────────────────────────────────────────────────────
  'Lactibiane': 'pileje',
  'Biane': 'pileje',
  'Dermobiane': 'pileje',
  'Feminabiane': 'pileje',
  'Ergyphilus': 'nutergia',
  'Ergy': 'nutergia',

  // ── Bucco-dentaire ──────────────────────────────────────────────────
  'Listerine': 'kenvue',
  'Sensodyne': 'haleon',
  'Parodontax': 'haleon',
  'Corega': 'haleon',
  'Polident': 'haleon',
  'Colgate': 'colgate_palmolive',
  'Elmex': 'colgate_palmolive',
  'Meridol': 'colgate_palmolive',
  // « Sanex » a désormais sa propre entrée au catalogue : la renvoyer AUSSI vers
  // Colgate-Palmolive rendrait la marque ambiguë, donc sans logo. Le plus précis gagne.
  'Inava': 'laboratoires_pierre_fabre',

  // ── Hygiène & soin grand public ─────────────────────────────────────
  'Labello': 'beiersdorf',
  'Hansaplast': 'beiersdorf',
  'Pampers': 'procter_et_gamble',
  'Gillette': 'procter_et_gamble',
  'Oral-B': 'procter_et_gamble',
  'Vicks': 'procter_et_gamble',
  // « Le Petit Marseillais » a son entrée propre ; seul le mot isolé reste utile ici.
  'Marseillais': 'le_petit_marseillais',
  'Sanytol': 'reckitt',
  'Veet': 'reckitt',
  'Strepsils': 'reckitt',
  'Gaviscon': 'reckitt',

  // ── OTC & médicaments conseil ───────────────────────────────────────
  'Doliprane': 'opella',
  'Aspegic': 'opella',
  'Aspégic': 'opella',
  'Maalox': 'opella',
  'Efferalgan': 'upsa',
  'Dafalgan': 'upsa',
  'Fervex': 'upsa',
  'Humex': 'urgo_healthcare',
  'Nicorette': 'kenvue',
  'Nurofen': 'reckitt',
  'Frontline': 'boehringer_ingelheim',
  'Arnigel': 'boiron',
  'Oscillococcinum': 'boiron',
  'Camilia': 'boiron',
  'Stodal': 'boiron',
  'Sedatif': 'boiron',
  'Biafine': 'johnson_et_johnson',
  'Biafinact': 'johnson_et_johnson',

  // ── Premiers soins, matériel, orthopédie ────────────────────────────
  'Urgo': 'urgo_healthcare',
  'Sterilux': 'hartmann',
  'Physiologica': 'laboratoires_gilbert',
  'Tena': 'essity',
  'Thuasne': 'thuasne',
  'Gum': 'sunstar',
  'Akileine': 'asepta',
  'Akileïne': 'asepta',
  'Akiléïne': 'asepta',
  'Ecrinal': 'asepta',
  'Sorifa': 'sorifa',
  'Hp Derm': 'sorifa',
  'HpDerm': 'sorifa',

  // ── Compléments & micronutrition ────────────────────────────────────
  'Nutrisante': 'nutrisante',
  'Nutrisanté': 'nutrisante',
  'Physiomance': 'therascience',
  'Flexofytol': 'tilman',
  'Saforelle': 'mayoly',
  'Supradyne': 'bayer',
  'Bepanthen': 'bayer',

  // ── Dermocosmétique divers ──────────────────────────────────────────
  'Atoderm': 'bioderma',
  'Sensibio': 'bioderma',
  'Photoderm': 'bioderma',
  'Hydrabio': 'bioderma',
  'Cicabio': 'bioderma',
  'Stelatopia': 'mustela',
  'Aquaphor': 'eucerin',
};
