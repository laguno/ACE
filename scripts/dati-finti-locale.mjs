// Riempie il database LOCALE (Docker) con dati finti di una Lani a metà novembre 2026.
// Ripetibile, anche dopo `npx supabase db reset`. Si rifiuta se l'URL dell'API non è 127.0.0.1/localhost.
// Uso: npm run prova:dati
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const sh = process.platform === 'win32';
const stato = execFileSync('npx', ['supabase', 'status', '-o', 'env'], { encoding: 'utf8', shell: sh });
const url = /^API_URL="?([^"\r\n]+)"?/m.exec(stato)?.[1];
let host = '';
try { host = new URL(url ?? '').hostname; } catch { /* resta vuoto */ }
if (!['127.0.0.1', 'localhost'].includes(host)) {
  console.error(`Rifiuto: l'API non è locale (${host || 'URL non letto'}). Solo 127.0.0.1 o localhost.`);
  process.exit(1);
}

const sql = readFileSync(new URL('./dati-finti-locale.sql', import.meta.url), 'utf8');
execFileSync('docker', ['exec', '-i', 'supabase_db_ace', 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q'], {
  input: sql,
  stdio: ['pipe', 'inherit', 'inherit'],
});
console.log('Dati finti caricati nel database locale.');
