// Ripristino di un backup (npm run backup) su un database con le migrazioni già applicate.
// Svuota le tabelle di public (anche le righe iniziali delle migrazioni, come i 9 forzieri) e
// carica il file, tutto in una transazione: se qualcosa va storto non cambia niente.
// Uso (Supabase locale, Docker): npm run ripristina -- <file.sql>
// Sul database vero è un'operazione di emergenza: vedi docs/runbook.md, non si lancia da qui.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) throw new Error('uso: npm run ripristina -- <file.sql>');
const psql = (sql) => execFileSync('docker', ['exec', '-i', 'supabase_db_ace', 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q', '-tA'], { input: sql, encoding: 'utf8' });

const tabelle = psql(`select string_agg(format('public.%I', tablename), ', ') from pg_tables where schemaname = 'public';`).trim();
psql(`begin;\nset session_replication_role = replica; -- niente trigger durante il caricamento (le ore restano quelle del backup)\ntruncate ${tabelle} restart identity cascade;\n${readFileSync(file, 'utf8')}\ncommit;`);
console.log(`ripristinato: ${file}`);
