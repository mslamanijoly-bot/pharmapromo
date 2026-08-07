// Rattrapage des marques que la récupération HTTP simple n'atteint pas.
//
//   npm run logos:recuperer:navigateur            → uniquement les échecs de logos-rapport.json
//   npm run logos:recuperer:navigateur -- --tous  → toutes les marques
//   npm run logos:recuperer:navigateur -- vichy la_roche_posay
//
// Trois causes d'échec en HTTP, toutes réglées par un vrai navigateur :
//   • 403/426 — L'Oréal et consorts filtrent les robots ; Chromium passe pour un visiteur.
//   • sites en JavaScript — le HTML livré est vide, le logo n'existe qu'après exécution.
//   • timeouts — on laisse ici plus de temps et on accepte le rendu partiel.
//
// On ne lit plus le HTML à la regex : on interroge le DOM RENDU. Un logo d'en-tête s'y
// reconnaît à sa position (en haut) et à son lien vers l'accueil — c'est bien plus fiable
// qu'un nom de fichier, et ça attrape les logos en SVG inline, invisibles autrement.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { LOGOS } from '../src/lib/logos.ts';
import { LOGO_SOURCES, REJETS } from './logo-sources.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'logos_jpeg');
mkdirSync(OUT, { recursive: true });

type Row = { key: string; ok: boolean; why?: string; file?: string; px?: string; sure?: boolean; url?: string };
const RAPPORT = join(ROOT, 'logos-rapport.json');
const rapport: Row[] = existsSync(RAPPORT) ? JSON.parse(readFileSync(RAPPORT, 'utf8')) : [];
const byKey = new Map(rapport.map(r => [r.key, r]));

const args = process.argv.slice(2);
const tous = args.includes('--tous');
const only = args.filter(a => !a.startsWith('--'));

const targets = LOGOS.filter(e => {
  if (!LOGO_SOURCES[e.key]) return false;
  if (REJETS.includes(e.key)) return false;
  if (only.length) return only.includes(e.key);
  if (tous) return true;
  return !byKey.get(e.key)?.ok;            // par défaut : uniquement ce qui a échoué
});

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const NOT_A_BRAND = /b-?corp|cruelty|vegan|ecocert|cosmebio|leaping|iso-?\d|fsc|facebook|instagram|twitter|linkedin|youtube|tiktok|pinterest|whatsapp|visa|mastercard|paypal|cookie|payment|award|made-in/i;

function sniff(b: Buffer): string | null {
  if (b.length < 16) return null;
  if (b[0] === 0x89 && b[1] === 0x50) return 'png';
  if (b[0] === 0xff && b[1] === 0xd8) return 'jpg';
  if (b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return 'webp';
  if (b.subarray(0, 3).toString() === 'GIF') return 'gif';
  const h = b.subarray(0, 400).toString('utf8').trim().toLowerCase();
  return h.startsWith('<?xml') || h.startsWith('<svg') ? (h.includes('<svg') ? 'svg' : null) : null;
}
function dims(b: Buffer, k: string) {
  if (k === 'png' && b.length > 24) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (k === 'jpg') {
    let i = 2;
    while (i < b.length - 9) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: 'fr-FR',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
});

console.log(`${targets.length} marques à rattraper au navigateur\n`);

for (const e of targets) {
  const host = LOGO_SOURCES[e.key];
  const page = await ctx.newPage();
  let placed = false;
  try {
    await page.goto(`https://${host}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);                       // bannière cookies + rendu différé
    // Un clic sur « accepter » libère souvent le contenu masqué par l'overlay.
    for (const sel of ['#onetrust-accept-btn-handler', 'button#didomi-notice-agree-button', '[aria-label*="ccept"]', 'button:has-text("Tout accepter")', 'button:has-text("Accepter")']) {
      try { const b = page.locator(sel).first(); if (await b.isVisible({ timeout: 600 })) { await b.click({ timeout: 1500 }); await page.waitForTimeout(900); break; } } catch { /* pas de bannière */ }
    }

    // Candidats lus dans le DOM RENDU, notés par ce qui trahit un logo d'en-tête :
    // haut de page, à gauche, dans un lien vers l'accueil, ratio d'un pavé de marque.
    const cands: { url?: string; svg?: string; rank: number; why: string; sure: boolean }[] = await page.evaluate(({ brandN, blocked }) => {
      const bad = new RegExp(blocked, 'i');
      const out: { url?: string; svg?: string; rank: number; why: string; sure: boolean }[] = [];
      const nm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const base = (u: string) => { try { return decodeURIComponent(u.split(/[?#]/)[0].split('/').pop() || ''); } catch { return u; } };

      for (const el of Array.from(document.querySelectorAll('img'))) {
        const img = el as HTMLImageElement;
        const src = img.currentSrc || img.src;
        if (!src || src.startsWith('data:')) continue;
        const ctxTxt = [src, img.alt, img.className, img.id, img.closest('a')?.className || ''].join(' ');
        if (bad.test(base(src)) || bad.test(img.alt || '')) continue;
        const r = img.getBoundingClientRect();
        if (r.width < 40 || r.height < 14) continue;
        if (r.top > 320) continue;                                  // pas dans l'en-tête
        // FORME d'un logo d'en-tête : large et bas. Sans cette contrainte, laroche-posay.fr
        // livrait sa bannière d'accueil de 1440×700 — le nom du fichier disait bien « la-roche-posay ».
        if (r.width > 460 || r.height > 200) continue;
        if (r.height > r.width * 1.6) continue;                     // vignette produit en portrait
        const inHomeLink = !!img.closest('a[href="/"], a[href$="' + location.host + '/"], header a, [class*="logo"] a');
        const saysLogo = /logo/i.test(ctxTxt);
        const named = nm(base(src)).includes(brandN) || nm(img.alt || '').includes(brandN);
        // Le nom de fichier SEUL ne suffit pas : les visuels produit le portent aussi.
        if (!saysLogo && !inHomeLink) continue;
        let rank = 0; const why: string[] = [];
        if (named) { rank += 60; why.push('nom'); }
        if (saysLogo) { rank += 30; why.push('logo'); }
        if (inHomeLink) { rank += 20; why.push('en-tête'); }
        if (/\.svg/i.test(src)) rank += 15;
        if (r.top < 140) rank += 10;
        if (rank >= 40) out.push({ url: src, rank, why: why.join('+'), sure: named && saysLogo });
      }

      // SVG posé directement dans le code de la page : invisible pour une regex sur le HTML.
      for (const el of Array.from(document.querySelectorAll('svg'))) {
        const s = el as SVGElement;
        const r = s.getBoundingClientRect();
        if (r.width < 50 || r.height < 16 || r.top > 260) continue;
        const ctxTxt = [s.getAttribute('class') || '', s.getAttribute('aria-label') || '', s.parentElement?.className || '', s.closest('a')?.getAttribute('href') || ''].join(' ');
        if (bad.test(ctxTxt)) continue;
        const saysLogo = /logo/i.test(ctxTxt);
        const inHomeLink = !!s.closest('a[href="/"], header a');
        if (!saysLogo && !inHomeLink) continue;
        const box = s.getAttribute('viewBox');
        const clone = s.cloneNode(true) as SVGElement;
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        if (!clone.getAttribute('viewBox') && box) clone.setAttribute('viewBox', box);
        if (!clone.getAttribute('width')) clone.setAttribute('width', String(Math.round(r.width)));
        if (!clone.getAttribute('height')) clone.setAttribute('height', String(Math.round(r.height)));
        out.push({ svg: clone.outerHTML, rank: (saysLogo ? 45 : 30) + (inHomeLink ? 15 : 0), why: 'svg en ligne', sure: false });
      }
      return out.sort((a, b) => b.rank - a.rank).slice(0, 6);
    }, { brandN: norm(e.name), blocked: NOT_A_BRAND.source });

    for (const c of cands) {
      let buf: Buffer | null = null;
      if (c.svg) buf = Buffer.from(c.svg, 'utf8');
      else if (c.url) {
        try {
          const resp = await ctx.request.get(c.url, { timeout: 15000 });
          if (resp.ok()) buf = Buffer.from(await resp.body());
        } catch { /* candidat suivant */ }
      }
      if (!buf) continue;
      const kind = sniff(buf);
      if (!kind || buf.length < 400) continue;
      const d = dims(buf, kind);
      if (d && Math.max(d.w, d.h) < 64) continue;
      const file = `${e.key}.${kind}`;
      writeFileSync(join(OUT, file), buf);
      const px = d ? `${d.w}×${d.h}` : 'vectoriel';
      console.log(`  ${c.sure ? '✓' : '?'} ${e.key.padEnd(30)} ${file.padEnd(24)} ${px.padEnd(12)} ${c.why}`);
      const row: Row = { key: e.key, ok: true, file, px, why: c.why + ' (navigateur)', sure: c.sure, url: c.url };
      const i = rapport.findIndex(r => r.key === e.key);
      if (i >= 0) rapport[i] = row; else rapport.push(row);
      placed = true;
      break;
    }
  } catch (err) {
    console.log(`  ✗ ${e.key.padEnd(30)} ${(err as Error).message.split('\n')[0].slice(0, 60)}`);
  } finally {
    await page.close();
  }
  if (!placed) console.log(`  ✗ ${e.key.padEnd(30)} aucun logo exploitable`);
}

await browser.close();
writeFileSync(RAPPORT, JSON.stringify(rapport, null, 2));
const ok = rapport.filter(r => r.ok).length;
console.log(`\n${ok}/${LOGOS.length} logos réels au total`);
