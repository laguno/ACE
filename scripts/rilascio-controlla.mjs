// Controlli prima di pubblicare in produzione (convenzione del 18/11, docs/runbook.md):
// 1. fuori dalle finestre senza pubblicazioni (14:20-14:45 e 19:45-21:00, ora di Roma);
// 2. il ramo di prova (l'ultimo servito da scripts/allinea-main.mjs) contiene il commit che sta per
//    essere pubblicato: altrimenti si avvisa e si indica di allineare prima.
// Solo controlli: backup e pubblicazione restano passi a mano, dopo l'ok del signore.
// Uso: npm run rilascio:controlla [-- <commit>]   (di solito il commit è main)
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { FILE_RAMO } from './allinea-main.mjs';

export const FINESTRE_VIETATE = [
  ['14:20', '14:45'],
  ['19:45', '21:00'],
];

/** La finestra vietata in cui cade l'istante (ora di Roma), o null. */
export function finestraVietata(istante = new Date()) {
  const ora = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(istante);
  return FINESTRE_VIETATE.find(([da, a]) => ora >= da && ora < a) ?? null;
}

const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** Il ramo di prova contiene `commit`? Restituisce { ok, messaggio }. */
export function provaContiene(cwd, commit = 'main') {
  const file = join(resolve(cwd, git(cwd, 'rev-parse', '--git-common-dir')), FILE_RAMO);
  if (!existsSync(file)) return { ok: false, messaggio: 'Non risulta nessun ramo di prova: avvia prima l\'ambiente di prova (npm run prova:allinea) e prova lì.' };
  const { ramo } = JSON.parse(readFileSync(file, 'utf8'));
  const sha = git(cwd, 'rev-parse', commit);
  if (spawnSync('git', ['merge-base', '--is-ancestor', sha, ramo], { cwd }).status === 0)
    return { ok: true, messaggio: `Il ramo di prova ${ramo} contiene ${commit} (${sha.slice(0, 7)}).` };
  return {
    ok: false,
    messaggio: `Il ramo di prova ${ramo} NON contiene ${commit} (${sha.slice(0, 7)}): quello che stai per pubblicare non è stato provato.\nAllinea prima: sul ramo ${ramo}, npm run prova:allinea (o riavvia la prova), provalo, poi rilancia questo controllo.`,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const commit = process.argv[2] ?? 'main';
  const f = finestraVietata();
  if (f) {
    console.error(`Adesso niente pubblicazioni: finestra ${f[0]}-${f[1]}.`);
    process.exit(1);
  }
  const r = provaContiene(process.cwd(), commit);
  (r.ok ? console.log : console.error)(r.messaggio);
  if (r.ok) console.log('Prossimi passi a mano: npm run backup, prove verdi, ok del signore, poi la pubblicazione.');
  process.exit(r.ok ? 0 : 1);
}
