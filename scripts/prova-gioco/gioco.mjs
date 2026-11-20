// Prova della partita (docs/09): dev server Vite sulla 5190, pagina /#gioco, foto in dist-prove/gioco/.
// La resa non espone nulla per la prova: si "ascoltano" le drawImage/fillText della tela (init script) per avere
// i rettangoli di giocatori e palla (solo pixel opachi dello sprite, in px di tela) e il nome della mossa; la barra si legge dai pixel
// della tela HUD. Un bot da tastiera gioca davvero (insegue la palla, salta e schiaccia).
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const PORTA = 5190;
const BASE = `http://127.0.0.1:${PORTA}/`;
const FOTO = 'dist-prove/gioco';
mkdirSync(FOTO, { recursive: true });

const server = spawn('npx', ['vite', '--port', String(PORTA), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', shell: true });
const ferma = () => spawn('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' });

function ascolto() {
  const o = CanvasRenderingContext2D.prototype.drawImage;
  const t = CanvasRenderingContext2D.prototype.fillText;
  const dato = () => (window.__f ??= { cur: [], prev: [], bg: null, hud: null, txt: '', txtAt: 0 });
  CanvasRenderingContext2D.prototype.fillText = function (s, ...a) {
    if (this.canvas === document.querySelector('.gioco canvas')) { const f = dato(); f.txt = String(s); f.txtAt = performance.now(); }
    return t.call(this, s, ...a);
  };
  CanvasRenderingContext2D.prototype.drawImage = function (img, ...a) {
    const main = document.querySelector('.gioco canvas');
    if (this.canvas === main) {
      const f = dato();
      const m = this.getTransform();
      if (a.length === 2) {
        if (img.width >= main.width * 0.9) { f.bg ??= img; if (img === f.bg) { f.prev = f.cur; f.cur = []; } }
        else if (img instanceof HTMLCanvasElement) f.hud = img;
      } else if (a.length === 8 || a.length === 4) {
        let [x, y, w, h] = a.length === 8 ? a.slice(4) : a;
        // solo i pixel opachi dello sprite (il rettangolo dell'immagine ha margini trasparenti)
        const [sx, sy, sw, sh] = a.length === 8 ? a.slice(0, 4) : [0, 0, img.naturalWidth || img.width, img.naturalHeight || img.height];
        const chiave = a.length + ':' + [sx, sy, sw, sh].join(',');
        const cache = ((f.opachi ??= new Map()).get(img) ?? f.opachi.set(img, new Map()).get(img));
        let bb = cache.get(chiave);
        if (!bb) {
          const tc = document.createElement('canvas'); tc.width = Math.max(1, Math.round(sw)); tc.height = Math.max(1, Math.round(sh));
          const tx = tc.getContext('2d', { willReadFrequently: true });
          o.call(tx, img, sx, sy, sw, sh, 0, 0, tc.width, tc.height);
          const d = tx.getImageData(0, 0, tc.width, tc.height).data;
          let x0 = tc.width, x1 = -1, y0 = tc.height, y1 = -1;
          for (let j = 0; j < tc.height; j++) for (let i = 0; i < tc.width; i++) if (d[(j * tc.width + i) * 4 + 3] > 40) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
          bb = x1 < 0 ? [0, 0, 1, 1] : [x0 / tc.width, y0 / tc.height, (x1 + 1) / tc.width, (y1 + 1) / tc.height];
          cache.set(chiave, bb);
        }
        [x, y, w, h] = [x + bb[0] * w, y + bb[1] * h, (bb[2] - bb[0]) * w, (bb[3] - bb[1]) * h];
        const ps = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([u, v]) => m.transformPoint(new DOMPoint(u, v)));
        f.cur.push({ t: a.length === 8 ? 'p' : 'b', x0: Math.min(...ps.map((q) => q.x)), x1: Math.max(...ps.map((q) => q.x)), y0: Math.min(...ps.map((q) => q.y)), y1: Math.max(...ps.map((q) => q.y)) });
      }
    }
    return o.call(this, img, ...a);
  };
}

// stato letto dalla pagina: giocatore mio (il più a sinistra), palla, carica, area di sovrapposizione
function leggi() {
  const f = window.__f;
  const main = document.querySelector('.gioco canvas');
  if (!f || !main) return null;
  const cr = main.getBoundingClientRect();
  const k = cr.width / main.width;
  const css = (r) => ({ x0: cr.left + r.x0 * k, x1: cr.left + r.x1 * k, y0: cr.top + r.y0 * k, y1: cr.top + r.y1 * k });
  const gioc = f.prev.filter((r) => r.t === 'p').sort((a, b) => a.x0 - b.x0);
  const palla = f.prev.find((r) => r.t === 'b');
  let frac = null;
  if (f.hud) {
    const h = f.hud;
    const y = Math.round((h.height * 43) / 78);
    const d = h.getContext('2d').getImageData(0, y, h.width, 1).data;
    let primo = -1, ultimo = -1, pieno = 0;
    for (let x = 0; x < h.width / 2; x++) {
      const [r, g, b, a] = [d[x * 4], d[x * 4 + 1], d[x * 4 + 2], d[x * 4 + 3]];
      const traccia = r === 95 && g === 92 && b === 144;
      const riempi = a >= 250 && b > g + 40;
      if (traccia || riempi) { if (primo < 0) primo = x; ultimo = x; if (riempi) pieno++; }
    }
    frac = primo < 0 ? 0 : pieno / (ultimo - primo + 1);
  }
  const bt = [['salta', '.gioco-salta'], ['schiaccia', '.gioco-schiaccia'], ['pausa', '.gioco-ferma'], ['frecce', '.gioco-freccia'], ['zonaCroce', '.gioco-croce'], ['speciale', '.gioco-speciale.pronto']];
  const corpi = [...gioc.map((r, i) => ['giocatore' + i, css(r)]), ...(palla ? [['palla', css(palla)]] : [])];
  let copre = 0, zona = 0;
  const coppie = [];
  for (const [nb, sel] of bt) {
    for (const e of document.querySelectorAll(sel)) {
    if (getComputedStyle(e).visibility === 'hidden') continue;
    const b = e.getBoundingClientRect();
    for (const [nc, c] of corpi) {
      const w = Math.min(b.right, c.x1) - Math.max(b.left, c.x0);
      const h = Math.min(b.bottom, c.y1) - Math.max(b.top, c.y0);
      if (w > 0 && h > 0) { if (nb === 'zonaCroce') zona += w * h; else copre += w * h; coppie.push(`${nb}x${nc}=${Math.round(w * h)}`); }
    }
    }
  }
  const sp =document.querySelector('.gioco-speciale');
  return {
    io: gioc[0] ? { cx: (gioc[0].x0 + gioc[0].x1) / 2, y0: gioc[0].y0 } : null,
    palla: palla ? { cx: (palla.x0 + palla.x1) / 2, cy: (palla.y0 + palla.y1) / 2 } : null,
    rete: main.width / 2, frac, copre, zona, coppie, pronto: !!sp && sp.classList.contains('pronto'),
    mossa: sp ? (sp.getAttribute('aria-label') ?? '').replace('Mossa finale: ', '') : '',
    txt: f.txt, txtEta: performance.now() - f.txtAt, fine: !!document.querySelector('.gioco-fine'),
  };
}

try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch { /* non ancora su */ }
    if (i > 60) throw new Error('server non partito');
    await new Promise((r) => setTimeout(r, 500));
  }
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errori = [];
  p.on('pageerror', (e) => errori.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errori.push('console: ' + m.text()); });
  await p.addInitScript(ascolto);
  await p.goto(BASE + '#gioco');
  await p.waitForSelector('.scheda');
  await p.waitForFunction(() => [...document.images].every((i) => i.complete));
  await p.screenshot({ path: `${FOTO}/1-selezione.png` });

  // 1. selezione -> partita
  await p.locator('[data-c="0"][data-id="papa"]').click();
  await p.locator('[data-c="1"][data-id="mamma"]').click();
  await p.locator('.selezione-gioca').tap();
  await p.waitForSelector('.gioco canvas');
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${FOTO}/1-inizio-partita.png` });

  // bot: insegue la palla, salta e schiaccia quando è vicina; gioca fino alla fine
  const premuti = new Set();
  const tasto = async (k, su) => {
    if (su && !premuti.has(k)) { premuti.add(k); await p.keyboard.down(k); }
    if (!su && premuti.has(k)) { premuti.delete(k); await p.keyboard.up(k); }
  };
  const foto = {};
  let copreMax = 0, coppieMax = [], campioni = 0, speciale = false, tocco = null, mossaFoto = false;
  const t0 = Date.now();
  let zonaMax = 0, inZona = 0, sovrapposti = 0, fotoCopre = false;
  let s, ultimoTxt = "";
  while (Date.now() - t0 < 240000) {
    s = await p.evaluate(leggi);
    if (!s) { await p.waitForTimeout(50); continue; }
    if (s.fine) break;
    if (s.io && s.palla) {
      campioni++;
      if (s.copre > 0) sovrapposti++;
      zonaMax = Math.max(zonaMax, s.zona); if (s.zona > 0) inZona++;
      if (s.copre > copreMax) { if (!fotoCopre) { fotoCopre = true; await p.screenshot({ path: `${FOTO}/4-copre.png` }); } copreMax = s.copre; coppieMax = s.coppie; }
      const d = s.palla.cx - s.io.cx;
      const mia = s.palla.cx < s.rete;
      const bersaglio = mia ? d : s.rete * 0.5 - s.io.cx;
      await tasto('ArrowRight', bersaglio > 40);
      await tasto('ArrowLeft', bersaglio < -40);
      const vicina = mia && Math.abs(d) < 160;
      await tasto('Space', vicina);
      await tasto('KeyK', vicina);
    }
    // 2. barra vuota / a metà / piena
    if (s.frac !== null) {
      if (!foto.vuota && s.frac === 0) { foto.vuota = 1; await p.screenshot({ path: `${FOTO}/2-barra-vuota.png` }); console.log('barra vuota ok'); }
      if (!foto.meta && s.frac >= 0.4 && s.frac < 0.8) { foto.meta = s.frac; await p.screenshot({ path: `${FOTO}/2-barra-meta.png` }); console.log('barra a meta', s.frac.toFixed(2)); }
      if (!foto.piena && s.frac >= 0.97) { foto.piena = s.frac; await p.screenshot({ path: `${FOTO}/2-barra-piena.png` }); console.log('barra piena', s.frac.toFixed(2)); }
    }
    // 3. speciale
    if (s.pronto && !speciale) {
      speciale = true;
      await p.screenshot({ path: `${FOTO}/3-speciale-visibile.png` });
      await p.locator('.gioco-speciale').tap();
      tocco = s.mossa;
      console.log('speciale premuto:', s.mossa);
    }
    if (s.txt !== ultimoTxt) { ultimoTxt = s.txt; if (process.env.DEBUG_GIOCO) console.log('txt', JSON.stringify(s.txt), s.pronto, Math.round((Date.now() - t0) / 1000)); }
    if (tocco && !mossaFoto && s.txt.length > 3 && s.txtEta < 900 && s.txt.toLowerCase().includes(tocco.toLowerCase().slice(0, 4))) {
      mossaFoto = true;
      await p.screenshot({ path: `${FOTO}/3-mossa-nome.png` });
      console.log('mossa a schermo:', s.txt);
    }
    await p.waitForTimeout(10);
  }
  for (const k of [...premuti]) await tasto(k, false);
  console.log('campioni', campioni, 'campioni con copre>0', sovrapposti, 'zona croce (area di tocco) max', Math.round(zonaMax), 'campioni', inZona, 'copre max', copreMax, coppieMax.join(' '), 'foto', JSON.stringify(foto));

  // 5. fine partita
  await p.waitForSelector('.gioco-fine', { timeout: 5000 });
  await p.screenshot({ path: `${FOTO}/5-fine-partita.png` });
  await p.getByRole('button', { name: 'Cambia personaggi' }).tap();
  await p.waitForSelector('.scheda', { timeout: 5000 });
  await p.screenshot({ path: `${FOTO}/5-di-nuovo-selezione.png` });
  await browser.close();

  console.log('errori in console:', JSON.stringify(errori));
  assert.ok(foto.vuota, 'barra vuota mai vista');
  assert.ok(foto.meta, 'barra a meta mai vista');
  assert.ok(foto.piena, 'barra piena mai vista');
  assert.ok(speciale, 'pulsante speciale mai pronto');
  assert.ok(mossaFoto, 'nome della mossa non visto sulla tela');
  assert.equal(copreMax, 0, `copre != 0: ${copreMax} (${coppieMax})`);
  assert.deepEqual(errori, []);
  console.log('prova gioco: ok, foto in', FOTO);
} finally {
  ferma();
}
