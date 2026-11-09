// CSV dei passi per la taratura di dicembre (filone I): una riga per giorno e motivo, con il saldo
// di fine giorno e la bandierina, nello stesso formato di docs/simulazione/<profilo>.csv, così lo
// stesso script Python di Jarvis legge sia la simulazione sia i dati veri.
// Solo somme per giorno e motivo (niente testi di compiti, voti o note). Lo lancia il signore:
//   npm run esporta:passi            -> database vero, in sola lettura
//   npm run esporta:passi -- --locale -> Supabase locale (prove)
// Il file va in Documenti\ACE-backup, fuori dal repository.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import * as R from '../src/lib/regole/index.ts';

const locale = process.argv.includes('--locale');
const sql = `select giorno::text, motivo, sum(round(passi * moltiplicatore))::int as passi
  from public.movimenti_passi group by giorno, motivo order by giorno, motivo`;
const uscita = execFileSync('npx', ['supabase', 'db', 'query', ...(locale ? [] : ['--remote']), '--read-only', '--output-format', 'json', `"${sql.replace(/\s+/g, ' ')}"`], {
  encoding: 'utf8',
  shell: true,
});
/** @type {{ giorno: string; motivo: string; passi: number }[]} */
const righe = JSON.parse(uscita.slice(uscita.indexOf('{'))).rows ?? [];

// saldo di fine giorno: somma progressiva, mai sotto zero come registra_passi
const perGiorno = new Map();
for (const r of righe) perGiorno.set(r.giorno, (perGiorno.get(r.giorno) ?? 0) + r.passi);
const saldo = new Map();
let s = 0;
for (const g of [...perGiorno.keys()].sort()) {
  s = Math.max(0, s + perGiorno.get(g));
  saldo.set(g, s);
}
const csv = ['giorno,motivo,passi,saldo,bandierina', ...righe.map((r) => [r.giorno, r.motivo, r.passi, saldo.get(r.giorno), R.bandierina(R.giorno(r.giorno))].join(','))].join('\n');

const cartella = process.env.ACE_BACKUP_DIR ?? join(homedir(), 'Documents', 'ACE-backup');
mkdirSync(cartella, { recursive: true });
const file = join(cartella, `passi-${locale ? 'locale-' : ''}${new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' })}.csv`);
writeFileSync(file, csv + '\n');
console.log(`passi: ${file} (${righe.length} righe)`);
