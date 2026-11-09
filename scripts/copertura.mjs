// Copertura delle righe per cartella (src/lib, supabase/functions) da coverage/coverage-summary.json.
// Uso: npm run copertura (lancia vitest con la copertura e stampa il riepilogo per il rapporto).
import { readFileSync } from 'node:fs';

const s = JSON.parse(readFileSync('coverage/coverage-summary.json', 'utf8'));
const gruppi = {};
for (const [f, v] of Object.entries(s)) {
  if (f === 'total') continue;
  const n = f.replaceAll('\\', '/');
  const k = n.match(/(src\/lib\/[^/]+|supabase\/functions\/[^/]+)/)?.[1] ?? n;
  gruppi[k] ??= { c: 0, t: 0 };
  gruppi[k].c += v.lines.covered;
  gruppi[k].t += v.lines.total;
}
const pct = (c, t) => `${((100 * c) / t).toFixed(1)}% (${c}/${t})`;
for (const radice of ['src/lib', 'supabase/functions']) {
  const voci = Object.entries(gruppi).filter(([k]) => k.startsWith(radice)).sort();
  const c = voci.reduce((a, [, v]) => a + v.c, 0);
  const t = voci.reduce((a, [, v]) => a + v.t, 0);
  console.log(`${radice}: ${pct(c, t)}`);
  for (const [k, v] of voci) console.log(`  ${k.slice(radice.length + 1)}: ${pct(v.c, v.t)}`);
}
