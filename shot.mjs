// Harnais d'audit visuel. Prérequis (une fois) : npm i -D playwright && npx playwright install chromium
// Usage : démarrer `npm run dev` puis `node shot.mjs` → captures dans Desktop/Etiquettes/audit-*.png
import { chromium } from 'playwright';
const OUT = 'C:/Users/mjoly/Desktop/Etiquettes/';
const url = 'http://localhost:3000/preview';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1100 }, deviceScaleFactor: 2 });
let ok = false;
for (let i = 0; i < 40; i++) {
  try { const r = await page.goto(url, { waitUntil: 'networkidle', timeout: 8000 }); if (r && r.ok()) { ok = true; break; } } catch { /* compile en cours */ }
  await page.waitForTimeout(2000);
}
if (!ok) { console.log('serveur injoignable'); await browser.close(); process.exit(1); }
await page.waitForTimeout(2000); // polices + rendu
await page.screenshot({ path: OUT + 'audit-preview-full.png', fullPage: true });
for (const theme of ['promo', 'officine']) {
  const el = await page.$(`[data-theme="${theme}"]`);
  if (el) await el.screenshot({ path: OUT + `audit-${theme}.png` });
}
await browser.close();
console.log('captures OK');
