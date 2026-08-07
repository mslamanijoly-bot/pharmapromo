// Convertit les logos SVG en PNG haute définition, via Chromium.
//
//   npm run logos:rasteriser            → les logos réels
//   npm run logos:rasteriser -- --tout  → y compris les vignettes
//
// Pourquoi : les SVG récupérés dans le code des pages tiraient leur style de la CSS du site
// (classes, currentColor, polices externes). Isolés dans un fichier, ils sortent noirs, vides
// ou déformés — et le défaut ne se voit qu'à l'impression, une fois la planche tirée.
//
// Le SVG est chargé via <img>, exactement comme le fera l'étiquette : c'est le pire cas,
// celui où aucune CSS extérieure ne vient au secours du fichier. Ce qu'on obtient ici est
// donc ce qui sortira sur le papier.
//
// Le vide se mesure en COMPTANT LES PIXELS non blancs, pas à la taille du fichier : un logo
// clairsemé mais juste pèse peu, un aplat de couleur pèse peu aussi. Seul le taux de
// couverture distingue les deux.
import { mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'public', 'logos_jpeg');
mkdirSync(DIR, { recursive: true });

const LARGEUR = 900;          // ~22 mm à 300 dpi = 260 px ; large marge pour les grands formats
const COUVERTURE_MIN = 0.004; // en deçà de 0,4 % de pixels encrés, l'image est vide

const args = process.argv.slice(2);
const tout = args.includes('--tout');
const only = args.filter(a => !a.startsWith('--'));

const cibles = readdirSync(DIR)
  .filter(f => f.endsWith('.svg'))
  .filter(f => tout || !f.endsWith('.vignette.svg'))
  .filter(f => !only.length || only.includes(f.replace(/(\.vignette)?\.svg$/, '')));

if (!cibles.length) { console.log('Aucun SVG à convertir.'); process.exit(0); }
console.log(`${cibles.length} SVG à rasteriser\n`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
await page.setContent('<!doctype html><meta charset="utf-8"><body style="margin:0">');

type Res = { ok: boolean; png?: string; w?: number; h?: number; couverture?: number; err?: string };

let convertis = 0;
const vides: string[] = [];

for (const f of cibles) {
  const cle = f.replace(/(\.vignette)?\.svg$/, '');
  const svg = readFileSync(join(DIR, f), 'utf8');

  const r: Res = await page.evaluate(async ({ svgTxt, W, seuil }) => {
    const uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgTxt);
    const img = new Image();
    const chargé = await new Promise<boolean>(res => {
      img.onload = () => res(true); img.onerror = () => res(false); img.src = uri;
      setTimeout(() => res(false), 8000);
    });
    if (!chargé) return { ok: false, err: 'SVG illisible par le navigateur' };

    // Proportions d'origine : c'est ce qui manquait, d'où le logo Uriage rogné.
    const nw = img.naturalWidth || 300, nh = img.naturalHeight || 100;
    const ratio = nh / nw;
    const w = W, h = Math.max(1, Math.round(W * ratio));
    if (h > 2000) return { ok: false, err: 'proportions aberrantes' };

    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);   // les logos sont dessinés pour du papier
    ctx.drawImage(img, 0, 0, w, h);

    // Taux de pixels sensiblement différents du blanc.
    const d = ctx.getImageData(0, 0, w, h).data;
    let encres = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] < 244 || d[i + 1] < 244 || d[i + 2] < 244) encres++;
    }
    const couverture = encres / (w * h);
    return { ok: couverture >= seuil, png: c.toDataURL('image/png'), w, h, couverture };
  }, { svgTxt: svg, W: LARGEUR, seuil: COUVERTURE_MIN });

  if (!r.ok && !r.png) { console.log(`  ✗ ${cle.padEnd(34)} ${r.err}`); vides.push(cle); continue; }
  const pct = ((r.couverture ?? 0) * 100).toFixed(2);
  if (!r.ok) { console.log(`  ⚠ ${cle.padEnd(34)} VIDE — ${pct} % de pixels encrés`); vides.push(cle); continue; }

  writeFileSync(join(DIR, `${cle}${f.endsWith('.vignette.svg') ? '.vignette' : ''}.png`),
    Buffer.from(r.png!.split(',')[1], 'base64'));
  if (!f.endsWith('.vignette.svg')) unlinkSync(join(DIR, f));   // le PNG remplace le SVG
  convertis++;
  console.log(`  ✓ ${cle.padEnd(34)} ${r.w}×${r.h}  ${pct} %`);
}

await browser.close();
console.log(`\n${convertis} convertis · ${vides.length} vides`);
if (vides.length) {
  console.log('\nCes SVG ne rendent rien hors de leur page d\'origine :');
  console.log('  ' + vides.join(' '));
  console.log(`\n  npm run logos:rejeter -- ${vides.join(' ')}`);
}
