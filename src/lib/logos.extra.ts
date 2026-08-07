// ──────────────────────────────────────────────────────────────────────
//  LABORATOIRES HORS CATALOGUE D'ORIGINE  ·  FICHIER À ENRICHIR À LA MAIN
//
//  logos.catalog.ts est généré et fermé (126 entrées). Le rayon, lui, contient des maisons
//  qui n'y figuraient pas : Asepta pour Akiléïne, Essity pour Tena, Thuasne, Nutrisanté…
//  Elles s'ajoutent ici, au même format, et sont fusionnées au catalogue par logos.ts.
//
//  Ajouter une entrée puis relancer `npm run gen:logos` suffit : la vignette est créée,
//  et le logo officiel se dépose ensuite sous le même nom de fichier.
// ──────────────────────────────────────────────────────────────────────
import type { CatalogEntry } from './logos.catalog.ts';

export const EXTRA_CATALOG: CatalogEntry[] = [
  { key: 'nutrisante', name: 'Nutrisanté', group: 'Nutrisanté', category: 'Compléments alimentaires', aliases: ['Nutrisanté', 'Laboratoire Nutrisanté'], image: 'logos_jpeg/nutrisante.svg' },
  { key: 'asepta', name: 'Asepta', group: 'Asepta', category: 'Podologie', aliases: ['Asepta', 'Laboratoires Asepta'], image: 'logos_jpeg/asepta.svg' },
  { key: 'essity', name: 'Essity', group: 'Essity', category: 'Hygiène / incontinence', aliases: ['Essity'], image: 'logos_jpeg/essity.svg' },
  { key: 'thuasne', name: 'Thuasne', group: 'Thuasne', category: 'Orthopédie', aliases: ['Thuasne'], image: 'logos_jpeg/thuasne.svg' },
  { key: 'colgate_palmolive', name: 'Colgate-Palmolive', group: 'Colgate-Palmolive', category: 'Hygiène / soin', aliases: ['Colgate-Palmolive', 'Colgate Palmolive'], image: 'logos_jpeg/colgate_palmolive.svg' },
  { key: 'therascience', name: 'Therascience', group: 'Therascience', category: 'Micronutrition', aliases: ['Therascience', 'Laboratoire Therascience'], image: 'logos_jpeg/therascience.svg' },
  { key: 'sunstar', name: 'Sunstar', group: 'Sunstar', category: 'Hygiène bucco-dentaire', aliases: ['Sunstar', 'Sunstar GUM'], image: 'logos_jpeg/sunstar.svg' },
  { key: 'hartmann', name: 'Hartmann', group: 'Paul Hartmann', category: 'Dispositifs médicaux', aliases: ['Hartmann', 'Paul Hartmann'], image: 'logos_jpeg/hartmann.svg' },
  { key: 'sorifa', name: 'Sorifa', group: 'Sorifa', category: 'Dermocosmétique', aliases: ['Sorifa', 'Laboratoires Sorifa'], image: 'logos_jpeg/sorifa.svg' },
  { key: 'vendome', name: 'Groupe Vendôme', group: 'Vendôme', category: 'Hygiène / soin', aliases: ['Groupe Vendôme', 'Vendôme'], image: 'logos_jpeg/vendome.svg' },
  { key: 'tilman', name: 'Tilman', group: 'Tilman', category: 'Phytothérapie', aliases: ['Tilman', 'Laboratoires Tilman'], image: 'logos_jpeg/tilman.svg' },
  { key: 'bausch_lomb', name: 'Bausch + Lomb', group: 'Bausch + Lomb', category: 'Ophtalmologie', aliases: ['Bausch + Lomb', 'Bausch & Lomb', 'Bausch et Lomb'], image: 'logos_jpeg/bausch_lomb.svg' },
  { key: 'densmore', name: 'Densmore', group: 'Densmore', category: 'Micronutrition', aliases: ['Densmore', 'Laboratoire Densmore'], image: 'logos_jpeg/densmore.svg' },
  { key: 'omega_pharma', name: 'Omega Pharma', group: 'Perrigo', category: 'Santé grand public', aliases: ['Omega Pharma'], image: 'logos_jpeg/omega_pharma.svg' },

  // ── Dermocosmétique et hygiène ──────────────────────────────────────
  { key: 'roge_cavailles', name: 'Rogé Cavaillès', group: 'Asepta', category: 'Hygiène / soin', aliases: ['Rogé Cavaillès', 'Roge Cavailles'], image: 'logos_jpeg/roge_cavailles.svg' },
  { key: 'noreva', name: 'Noreva', group: 'Noreva', category: 'Dermocosmétique', aliases: ['Noreva', 'Noreva Laboratoires'], image: 'logos_jpeg/noreva.svg' },
  { key: 'bailleul', name: 'Bailleul', group: 'Bailleul', category: 'Dermocosmétique', aliases: ['Bailleul', 'Laboratoires Bailleul'], image: 'logos_jpeg/bailleul.svg' },
  { key: 'gifrer', name: 'Gifrer', group: 'Gifrer', category: 'Hygiène / bébé', aliases: ['Gifrer', 'Gifrer Barbezat'], image: 'logos_jpeg/gifrer.svg' },
  { key: 'saugella', name: 'Saugella', group: 'Viatris', category: 'Hygiène intime', aliases: ['Saugella'], image: 'logos_jpeg/saugella.svg' },
  { key: 'dermophil', name: 'Dermophil', group: 'Dermophil Indien', category: 'Soins des lèvres', aliases: ['Dermophil', 'Dermophil Indien'], image: 'logos_jpeg/dermophil.svg' },
  { key: 'le_petit_marseillais', name: 'Le Petit Marseillais', group: 'Vendôme', category: 'Hygiène / soin', aliases: ['Le Petit Marseillais', 'Petit Marseillais'], image: 'logos_jpeg/le_petit_marseillais.svg' },
  { key: 'sanex', name: 'Sanex', group: 'Colgate-Palmolive', category: 'Hygiène / soin', aliases: ['Sanex'], image: 'logos_jpeg/sanex.svg' },
  { key: 'codexial', name: 'Codexial', group: 'Codexial', category: 'Dermatologie', aliases: ['Codexial', 'Codexial Dermatologie'], image: 'logos_jpeg/codexial.svg' },
  { key: 'sinclair', name: 'Sinclair', group: 'Sinclair', category: 'Dermatologie', aliases: ['Sinclair', 'Sinclair Pharma'], image: 'logos_jpeg/sinclair.svg' },

  // ── Ophtalmologie ───────────────────────────────────────────────────
  { key: 'thea', name: 'Théa', group: 'Laboratoires Théa', category: 'Ophtalmologie', aliases: ['Théa', 'Thea', 'Laboratoires Théa'], image: 'logos_jpeg/thea.svg' },
  { key: 'horus_pharma', name: 'Horus Pharma', group: 'Horus Pharma', category: 'Ophtalmologie', aliases: ['Horus Pharma', 'Horus'], image: 'logos_jpeg/horus_pharma.svg' },
  { key: 'alcon', name: 'Alcon', group: 'Alcon', category: 'Ophtalmologie', aliases: ['Alcon', 'Alcon France'], image: 'logos_jpeg/alcon.svg' },

  // ── Compléments alimentaires et micronutrition ──────────────────────
  { key: 'aragan', name: 'Aragan', group: 'Aragan', category: 'Compléments alimentaires', aliases: ['Aragan', 'Laboratoire Aragan'], image: 'logos_jpeg/aragan.svg' },
  { key: 'synergia', name: 'Synergia', group: 'Synergia', category: 'Micronutrition', aliases: ['Synergia', 'Laboratoire Synergia'], image: 'logos_jpeg/synergia.svg' },
  { key: 'lero', name: 'Léro', group: 'Léro', category: 'Compléments alimentaires', aliases: ['Léro', 'Lero', 'Laboratoires Léro'], image: 'logos_jpeg/lero.svg' },
  { key: 'fleurance_nature', name: 'Fleurance Nature', group: 'Fleurance Nature', category: 'Phytothérapie', aliases: ['Fleurance Nature'], image: 'logos_jpeg/fleurance_nature.svg' },
  { key: 'nat_et_form', name: 'Nat & Form', group: 'Nat & Form', category: 'Phytothérapie', aliases: ['Nat & Form', 'Nat et Form', 'Nat Form'], image: 'logos_jpeg/nat_et_form.svg' },
  { key: 'dietaroma', name: 'Dietaroma', group: 'Dietaroma', category: 'Phytothérapie', aliases: ['Dietaroma', 'Diétaroma'], image: 'logos_jpeg/dietaroma.svg' },
  { key: 'vitaflor', name: 'Vitaflor', group: 'Vitaflor', category: 'Compléments alimentaires', aliases: ['Vitaflor'], image: 'logos_jpeg/vitaflor.svg' },
  { key: 'labcatal', name: 'Labcatal', group: 'Labcatal', category: 'Oligothérapie', aliases: ['Labcatal', 'Oligosol', 'Laboratoires Labcatal'], image: 'logos_jpeg/labcatal.svg' },
  { key: 'copmed', name: 'Copmed', group: 'Copmed', category: 'Micronutrition', aliases: ['Copmed', 'CopMed'], image: 'logos_jpeg/copmed.svg' },
  { key: 'anaca3', name: 'Anaca3', group: 'Nutravalia', category: 'Minceur', aliases: ['Anaca3', 'Anaca 3'], image: 'logos_jpeg/anaca3.svg' },
  { key: 'yves_ponroy', name: 'Yves Ponroy', group: 'Vitavea', category: 'Compléments alimentaires', aliases: ['Yves Ponroy', 'Ponroy'], image: 'logos_jpeg/yves_ponroy.svg' },
  { key: 'phytoresearch', name: 'Phytoresearch', group: 'Phytoresearch', category: 'Phytothérapie', aliases: ['Phytoresearch', 'Phyto Research'], image: 'logos_jpeg/phytoresearch.svg' },

  // ── OTC, médicaments conseil, premiers soins ────────────────────────
  { key: 'crinex', name: 'Crinex', group: 'Crinex', category: 'Pharmaceutique', aliases: ['Crinex', 'Laboratoires Crinex'], image: 'logos_jpeg/crinex.svg' },
  { key: 'genevrier', name: 'Genévrier', group: 'Genévrier', category: 'Pharmaceutique', aliases: ['Genévrier', 'Genevrier', 'Laboratoires Genévrier'], image: 'logos_jpeg/genevrier.svg' },
  { key: 'mercurochrome', name: 'Mercurochrome', group: 'Cooper', category: 'Premiers soins', aliases: ['Mercurochrome'], image: 'logos_jpeg/mercurochrome.svg' },
  { key: 'compeed', name: 'Compeed', group: 'HRA Pharma', category: 'Premiers soins', aliases: ['Compeed'], image: 'logos_jpeg/compeed.svg' },
  { key: 'hra_pharma', name: 'HRA Pharma', group: 'Perrigo', category: 'Pharmaceutique', aliases: ['HRA Pharma', 'HRA'], image: 'logos_jpeg/hra_pharma.svg' },
  { key: 'nutrisante_lab', name: 'Vitascorbol', group: 'Cooper', category: 'Vitamines', aliases: ['Vitascorbol'], image: 'logos_jpeg/nutrisante_lab.svg' },
  { key: 'lysopaine', name: 'Lysopaine', group: 'Boehringer Ingelheim', category: 'ORL', aliases: ['Lysopaine'], image: 'logos_jpeg/lysopaine.svg' },
  { key: 'sterimar', name: 'Sterimar', group: 'Church & Dwight', category: 'ORL', aliases: ['Sterimar', 'Stérimar'], image: 'logos_jpeg/sterimar.svg' },
  { key: 'prospan', name: 'Prospan', group: 'Engelhard', category: 'ORL', aliases: ['Prospan'], image: 'logos_jpeg/prospan.svg' },
  { key: 'humer', name: 'Humer', group: 'Urgo Group', category: 'ORL', aliases: ['Humer'], image: 'logos_jpeg/humer.svg' },

  // ── Bébé, maternité, vétérinaire ────────────────────────────────────
  { key: 'dodie', name: 'Dodie', group: 'Vitalpha', category: 'Bébé / maternité', aliases: ['Dodie'], image: 'logos_jpeg/dodie.svg' },
  { key: 'mam', name: 'MAM', group: 'MAM Babyartikel', category: 'Bébé / maternité', aliases: ['MAM', 'MAM Baby'], image: 'logos_jpeg/mam.svg' },
  { key: 'avent', name: 'Philips Avent', group: 'Philips', category: 'Bébé / maternité', aliases: ['Philips Avent', 'Avent'], image: 'logos_jpeg/avent.svg' },
  { key: 'gallia', name: 'Gallia', group: 'Danone', category: 'Nutrition infantile', aliases: ['Gallia'], image: 'logos_jpeg/gallia.svg' },
  { key: 'guigoz', name: 'Guigoz', group: 'Nestlé', category: 'Nutrition infantile', aliases: ['Guigoz'], image: 'logos_jpeg/guigoz.svg' },
  { key: 'bledina', name: 'Blédina', group: 'Danone', category: 'Nutrition infantile', aliases: ['Blédina', 'Bledina'], image: 'logos_jpeg/bledina.svg' },
  { key: 'nestle_health_science', name: 'Nestlé Health Science', group: 'Nestlé', category: 'Nutrition clinique', aliases: ['Nestlé Health Science', 'Nestle Health Science'], image: 'logos_jpeg/nestle_health_science.svg' },
  { key: 'francodex', name: 'Francodex', group: 'Francodex', category: 'Vétérinaire', aliases: ['Francodex'], image: 'logos_jpeg/francodex.svg' },
  { key: 'virbac', name: 'Virbac', group: 'Virbac', category: 'Vétérinaire', aliases: ['Virbac'], image: 'logos_jpeg/virbac.svg' },
  { key: 'ceva', name: 'Ceva', group: 'Ceva Santé Animale', category: 'Vétérinaire', aliases: ['Ceva', 'Ceva Santé Animale'], image: 'logos_jpeg/ceva.svg' },
  { key: 'elanco', name: 'Elanco', group: 'Elanco', category: 'Vétérinaire', aliases: ['Elanco'], image: 'logos_jpeg/elanco.svg' },

  // ── Matériel, orthopédie, diagnostic ────────────────────────────────
  { key: 'omron', name: 'Omron', group: 'Omron Healthcare', category: 'Autodiagnostic', aliases: ['Omron', 'Omron Healthcare'], image: 'logos_jpeg/omron.svg' },
  { key: 'sigvaris', name: 'Sigvaris', group: 'Sigvaris', category: 'Compression médicale', aliases: ['Sigvaris'], image: 'logos_jpeg/sigvaris.svg' },
  { key: 'gibaud', name: 'Gibaud', group: 'Gibaud', category: 'Orthopédie', aliases: ['Gibaud'], image: 'logos_jpeg/gibaud.svg' },
  { key: 'donjoy', name: 'DonJoy', group: 'Enovis', category: 'Orthopédie', aliases: ['DonJoy', 'Don Joy'], image: 'logos_jpeg/donjoy.svg' },
  { key: 'epitact', name: 'Epitact', group: 'Millet Innovation', category: 'Podologie', aliases: ['Epitact', 'Épitact'], image: 'logos_jpeg/epitact.svg' },
  { key: 'scholl', name: 'Scholl', group: 'Reckitt', category: 'Podologie', aliases: ['Scholl', "Scholl's"], image: 'logos_jpeg/scholl.svg' },
  { key: 'pediRelax', name: 'Pédi Relax', group: 'Asepta', category: 'Podologie', aliases: ['Pédi Relax', 'Pedi Relax', 'Pédirelax'], image: 'logos_jpeg/pediRelax.svg' },
  { key: 'lifescan', name: 'LifeScan', group: 'LifeScan', category: 'Autodiagnostic', aliases: ['LifeScan', 'OneTouch'], image: 'logos_jpeg/lifescan.svg' },
  { key: 'roche_diabetes', name: 'Accu-Chek', group: 'Roche', category: 'Autodiagnostic', aliases: ['Accu-Chek', 'Accu Chek', 'Accuchek'], image: 'logos_jpeg/roche_diabetes.svg' },

  // ── Solaire et divers ───────────────────────────────────────────────
  { key: 'biotherm', name: 'Biotherm', group: "L'Oréal", category: 'Dermocosmétique', aliases: ['Biotherm'], image: 'logos_jpeg/biotherm.svg' },
  { key: 'lancaster', name: 'Lancaster', group: 'Coty', category: 'Solaire', aliases: ['Lancaster'], image: 'logos_jpeg/lancaster.svg' },
  { key: 'piz_buin', name: 'Piz Buin', group: 'Kenvue', category: 'Solaire', aliases: ['Piz Buin'], image: 'logos_jpeg/piz_buin.svg' },
  { key: 'alphanova', name: 'Alphanova', group: 'Alphanova', category: 'Cosmétique naturelle', aliases: ['Alphanova'], image: 'logos_jpeg/alphanova.svg' },
];
