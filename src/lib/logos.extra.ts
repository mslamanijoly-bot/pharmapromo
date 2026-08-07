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
];
