// Prova della selezione (docs/11 §3.1): dev server Vite sulla 5189, foto in dist-prove/gioco-selezione/.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const PORTA = 5189;
const URL = `http://127.0.0.1:${PORTA}/scripts/prova-gioco/selezione.html`;
const FOTO = 'dist-prove/gioco-selezione';
mkdirSync(FOTO, { recursive: true });

const server = spawn('npx', ['vite', '--port', String(PORTA), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', shell: true });
const ferma = () => spawn('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' });
try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(URL)).ok) break; } catch { /* non ancora su */ }
    if (i > 60) throw new Error('server non partito');
    await new Promise((r) => setTimeout(r, 500));
  }
  const browser = await chromium.launch();
  for (const [nome, w, h] of [['orizzontale', 844, 390], ['verticale', 390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true });
    const p = await ctx.newPage();
    const errori = [];
    p.on('pageerror', (e) => errori.push(e.message));
    await p.goto(URL);
    await p.waitForSelector('.scheda');
    await p.waitForFunction(() => [...document.images].every((i) => i.complete));
    const rotte = await p.evaluate(() => [...document.images].filter((i) => i.naturalWidth === 0).map((i) => i.src));
    assert.deepEqual(rotte, [], 'immagini non caricate');
    if (w > h) assert.ok(await p.evaluate(() => [...document.images].every((i) => i.getBoundingClientRect().height >= 70)), 'figure < 70 px in orizzontale');
    assert.equal(await p.locator('.scheda').count(), 18, '9 schede per colonna');
    // bersagli >= 44 px, nessun overflow
    for (const b of await p.locator('.scheda, .selezione-gioca').all()) {
      const r = await b.boundingBox();
      assert.ok(r.width >= 44 && r.height >= 44, `bersaglio piccolo ${nome}: ${r.width}x${r.height}`);
    }
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'overflow orizzontale');
    assert.ok(await p.evaluate(() => { const s = document.querySelector('.selezione'); return s.scrollHeight <= s.clientHeight + 1; }), `overflow verticale ${nome}`);
    await p.screenshot({ path: `${FOTO}/${nome}.png` });
    // scelta a mano + Gioca
    await p.locator('[data-c="0"][data-id="bart"]').click();
    await p.locator('[data-c="1"][data-id="lady"]').click();
    await p.locator('.selezione-gioca').click();
    assert.deepEqual(await p.evaluate(() => window.scelta), { tu: 'bart', cpu: 'lady' });
    // "A caso" in entrambe: id veri; stessa scelta ricordata dopo il ricaricamento
    await p.locator('[data-c="0"][data-id="caso"]').click();
    await p.locator('[data-c="1"][data-id="caso"]').click();
    await p.locator('.selezione-gioca').click();
    const s = await p.evaluate(() => window.scelta);
    const ids = ['lani', 'leo', 'papa', 'mamma', 'nonno', 'allenatore', 'bart', 'lady'];
    assert.ok(ids.includes(s.tu) && ids.includes(s.cpu), 'A caso deve dare id veri');
    await p.reload();
    await p.waitForSelector('.scheda');
    assert.equal(await p.locator('[data-c="0"][data-id="caso"]').getAttribute('aria-checked'), 'true', 'scelta ricordata');
    // tastiera: frecce, Esc cambia colonna, Invio gioca
    await p.locator('[data-c="0"][data-id="caso"]').focus();
    await p.keyboard.press('ArrowLeft');
    await p.keyboard.press('ArrowLeft'); // bart
    assert.equal(await p.locator('[data-c="0"][data-id="bart"]').getAttribute('aria-checked'), 'true');
    await p.keyboard.press('Escape');
    assert.equal(await p.evaluate(() => document.activeElement.dataset.c), '1', 'Esc passa alla CPU');
    await p.keyboard.press('Enter');
    assert.ok(await p.evaluate(() => window.scelta.tu === 'bart'), 'Invio gioca');
    await p.locator('[data-c="1"][data-id="leo"]').focus();
    await p.screenshot({ path: `${FOTO}/${nome}-focus.png` });
    assert.deepEqual(errori, []);
    await ctx.close();
  }
  await browser.close();
  console.log('prova selezione: ok, foto in', FOTO);
} finally {
  ferma();
}
