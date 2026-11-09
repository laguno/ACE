// Backup dei dati di ACE (filone H): npm run backup lo lancia il signore dal suo PC.
// Salva i dati dello schema public (righe, non struttura: la struttura sono le migrazioni) in un
// file datato FUORI dal repository, in Documenti\ACE-backup. Niente segreti: il Vault e auth non
// ci sono; le foto stanno nello Storage e non entrano nel file (vedi docs/runbook.md).
// Uso: npm run backup            -> database vero (progetto collegato)
//      npm run backup -- --locale -> Supabase locale (per le prove di ripristino)
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const locale = process.argv.includes('--locale');
const cartella = process.env.ACE_BACKUP_DIR ?? join(homedir(), 'Documents', 'ACE-backup');
mkdirSync(cartella, { recursive: true });
const ora = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Rome' }).replace(' ', '_').replaceAll(':', '-');
const file = join(cartella, `ace-${locale ? 'locale-' : ''}${ora}.sql`);

execFileSync('npx', ['supabase', 'db', 'dump', locale ? '--local' : '--linked', '--data-only', '--schema', 'public', '-f', file], { stdio: 'inherit', shell: true });
console.log(`backup: ${file} (${Math.round(statSync(file).size / 1024)} KB)`);
