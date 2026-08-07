// Planche de contrôle : tous les logos récupérés, en vis-à-vis du nom attendu.
//
//   npm run logos:planche          → logos-planche.html, à ouvrir dans le navigateur
//
// La récupération automatique se trompe environ une fois sur trois (elle ramène un panneau
// marketing, un logo de certification, une bannière). Aucune heuristique ne rattrapera ça :
// il faut un œil. Cette page rend la vérification tenable — un coup d'œil, et on note les
// clés à rejeter. Elles reprendront leur vignette typographique au prochain gen:logos.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOGOS } from '../src/lib/logos.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const rapport: { key: string; ok: boolean; file?: string; px?: string; why?: string; sure?: boolean; url?: string }[] =
  existsSync(join(ROOT, 'logos-rapport.json')) ? JSON.parse(readFileSync(join(ROOT, 'logos-rapport.json'), 'utf8')) : [];

const byKey = new Map(rapport.map(r => [r.key, r]));
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const cards = LOGOS.map(e => {
  const r = byKey.get(e.key);
  // C'est le manifeste qui fait foi — le même arbitre que l'application. La planche montre
  // donc exactement ce qui partira à l'impression, jamais une image que le rapport imagine.
  const file = e.image.replace('logos_jpeg/', '');
  const reel = !/\.vignette\.svg$/.test(file) && existsSync(join(ROOT, 'public', 'logos_jpeg', file));
  const sur = r?.sure === true;
  const etat = !reel ? 'vignette' : sur ? 'sur' : 'verifier';
  const badge = !reel ? 'vignette typographique' : sur ? 'nom de fichier confirmé' : 'À VÉRIFIER';
  return `<figure class="c ${etat}">
    <div class="img"><img src="logos_jpeg/${esc(file)}" alt="${esc(e.name)}" loading="lazy"></div>
    <figcaption>
      <b>${esc(e.name)}</b>
      <code>${esc(e.key)}</code>
      <span class="b">${badge}${r?.px ? ' · ' + esc(r.px) : ''}</span>
    </figcaption>
  </figure>`;
}).join('\n');

const estReel = (e: { key: string; image: string }) => !/\.vignette\.svg$/.test(e.image);
const nReel = LOGOS.filter(estReel).length;
const nSur = LOGOS.filter(e => estReel(e) && byKey.get(e.key)?.sure).length;

const html = `<!doctype html><meta charset="utf-8"><title>Planche de contrôle des logos</title>
<style>
 body{font:14px/1.4 system-ui,sans-serif;margin:0;padding:24px;background:#0f172a;color:#e2e8f0}
 h1{font-size:20px;margin:0 0 4px} p.s{color:#94a3b8;margin:0 0 20px}
 .legend{display:flex;gap:18px;flex-wrap:wrap;margin-bottom:18px;font-size:12px}
 .legend i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:6px;vertical-align:-1px}
 .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}
 .c{margin:0;background:#1e293b;border:2px solid #334155;border-radius:9px;overflow:hidden}
 .c.sur{border-color:#16a34a} .c.verifier{border-color:#f59e0b} .c.vignette{border-color:#475569;opacity:.75}
 .img{height:96px;display:flex;align-items:center;justify-content:center;background:#fff;padding:8px}
 .img img{max-width:100%;max-height:100%;object-fit:contain}
 figcaption{padding:8px 10px;display:flex;flex-direction:column;gap:2px}
 figcaption b{font-size:13px} figcaption code{font-size:11px;color:#94a3b8}
 .b{font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#cbd5e1}
 .verifier .b{color:#fbbf24;font-weight:700} .sur .b{color:#4ade80} .vignette .b{color:#64748b}
</style>
<h1>Planche de contrôle des logos</h1>
<p class="s">${nReel} logos réels récupérés sur ${LOGOS.length} · ${nSur} au nom de fichier confirmé · le reste est en vignette typographique.</p>
<div class="legend">
 <span><i style="background:#16a34a"></i>nom de fichier confirmé — fiable</span>
 <span><i style="background:#f59e0b"></i><b>à vérifier à l'œil</b> — c'est ici que se cachent les erreurs</span>
 <span><i style="background:#475569"></i>vignette typographique — pas de logo trouvé</span>
</div>
<div class="grid">
${cards}
</div>
<p class="s" style="margin-top:24px">Un logo faux ? Notez sa clé, ajoutez-la à REJETS dans scripts/logo-sources.ts, relancez <code>npm run gen:logos</code> : il reprend sa vignette.</p>
`;

writeFileSync(join(ROOT, 'public', 'logos-planche.html'), html, 'utf8');
console.log(`✓ public/logos-planche.html — ${nReel}/${LOGOS.length} logos réels (${nSur} confirmés, ${nReel - nSur} à vérifier)`);
console.log('  Ouvrir : http://localhost:3000/logos-planche.html');
