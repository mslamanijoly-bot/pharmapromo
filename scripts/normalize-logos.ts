// Norme les logos : rogne les marges vides et uniformise la définition.
//
//   npm run logos:normer            → tous les logos réels
//   npm run logos:normer -- pampers roc
//
// Pourquoi : les fichiers fournis par les marques ont des marges très inégales. Le logo RoC
// tient dans un quart de son image, Pampers dans la moitié. Dans une case de hauteur fixe,
// l'un se réduit à un timbre-poste et l'autre remplit tout — alors que le code leur donne
// exactement la même place. Sur une planche, cette irrégularité se voit immédiatement.
//
// On rogne donc au plus près de l'encre, puis on ajoute une marge CONSTANTE de 2 %. Tous les
// logos remplissent alors leur case de la même façon, quelle que soit leur provenance.
//
// Le fond est aplati en blanc au passage : un PNG transparent posé sur une étiquette blanche
// ne pose pas de problème, mais un JPEG à fond noir, si — et il y en a.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'public', 'logos_jpeg');
mkdirSync(DIR, { recursive: true });

const MARGE = 0.02;    // marge constante ajoutée après rognage, en fraction de la plus grande dimension
const MAX_W = 1200;    // au-delà, on réduit : un logo d'étiquette ne dépasse pas ~70 mm
const SEUIL = 246;     // un pixel plus clair que ça sur les trois canaux est considéré « vide »

const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
const cibles = readdirSync(DIR)
  .filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f))
  .filter(f => !f.endsWith('.vignette.svg'))
  .filter(f => !only.length || only.includes(f.replace(extname(f), '')));

if (!cibles.length) { console.log('Aucun logo à normer.'); process.exit(0); }
console.log(`${cibles.length} logos à normer\n`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
await page.setContent('<!doctype html><meta charset="utf-8"><body style="margin:0">');

let normes = 0, inchanges = 0, rates = 0;

for (const f of cibles) {
  const b64 = readFileSync(join(DIR, f)).toString('base64');
  const mime = /\.png$/i.test(f) ? 'image/png' : /\.webp$/i.test(f) ? 'image/webp' : /\.gif$/i.test(f) ? 'image/gif' : 'image/jpeg';

  const r = await page.evaluate(async ({ uri, marge, maxW, seuil }) => {
    const img = new Image();
    const ok = await new Promise<boolean>(res => { img.onload = () => res(true); img.onerror = () => res(false); img.src = uri; setTimeout(() => res(false), 8000); });
    if (!ok || !img.naturalWidth) return { err: 'illisible' };

    const W = img.naturalWidth, H = img.naturalHeight;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);   // aplatit la transparence sur du blanc
    ctx.drawImage(img, 0, 0);

    // Boîte englobante de l'encre : premier et dernier pixel non blanc, en x et en y.
    const d = ctx.getImageData(0, 0, W, H).data;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (d[i] < seuil || d[i + 1] < seuil || d[i + 2] < seuil) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return { err: 'image vide' };

    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    const pad = Math.round(Math.max(cw, ch) * marge);
    const sw = cw + 2 * pad, sh = ch + 2 * pad;
    const k = sw > maxW ? maxW / sw : 1;                // on réduit, jamais on n'agrandit

    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(sw * k)); out.height = Math.max(1, Math.round(sh * k));
    const o = out.getContext('2d')!;
    o.imageSmoothingQuality = 'high';
    o.fillStyle = '#fff'; o.fillRect(0, 0, out.width, out.height);
    o.drawImage(c, x0 - pad, y0 - pad, sw, sh, 0, 0, out.width, out.height);

    const gagne = 1 - (cw * ch) / (W * H);
    return { png: out.toDataURL('image/png'), avant: `${W}×${H}`, apres: `${out.width}×${out.height}`, gagne };
  }, { uri: `data:${mime};base64,${b64}`, marge: MARGE, maxW: MAX_W, seuil: SEUIL });

  const cle = f.replace(extname(f), '');
  if ('err' in r && r.err) { console.log(`  ✗ ${cle.padEnd(30)} ${r.err}`); rates++; continue; }
  const marge = Math.round((r.gagne ?? 0) * 100);
  // Le PNG remplace le fichier d'origine, quelle qu'ait été son extension : un seul format
  // en sortie, avec transparence possible et sans perte — le manifeste s'y retrouve seul.
  writeFileSync(join(DIR, `${cle}.png`), Buffer.from(r.png!.split(',')[1], 'base64'));
  if (extname(f).toLowerCase() !== '.png') writeFileSync(join(DIR, f), Buffer.from(r.png!.split(',')[1], 'base64'));
  if (marge >= 8) { normes++; console.log(`  ✂ ${cle.padEnd(30)} ${r.avant} → ${r.apres}   (${marge} % de marge retirée)`); }
  else { inchanges++; }
}

await browser.close();
console.log(`\n${normes} rognés · ${inchanges} déjà au cadre · ${rates} en échec`);
console.log('Relancez « npm run logos:manifeste ».');
