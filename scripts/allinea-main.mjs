// Ambiente di prova mai indietro rispetto a main (al massimo avanti), convenzione del 18/11 in
// docs/runbook.md. Prima di servire una build di prova: git fetch e unione di origin/main nel ramo
// attivo, qualunque sia. Se l'unione non riesce si annulla e ci si ferma con un messaggio chiaro.
// Il ramo servito si annota nella cartella comune di git (vale per tutti i worktree): lo legge
// scripts/rilascio-controlla.mjs prima di pubblicare in produzione.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const FILE_RAMO = 'ace-prova-ramo.json';

const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const prova = (cwd, ...a) => spawnSync('git', a, { cwd, encoding: 'utf8' });

/** Unisce origin/main nel ramo attivo di `cwd`. Restituisce { ok, messaggio }. */
export function allineaMain(cwd = process.cwd(), { remoto = 'origin' } = {}) {
  const ramo = git(cwd, 'rev-parse', '--abbrev-ref', 'HEAD');
  if (ramo === 'HEAD') return { ok: false, messaggio: 'Nessun ramo attivo (HEAD staccata): passa a un ramo prima di avviare la prova.' };

  const f = prova(cwd, 'fetch', remoto, 'main');
  if (f.status !== 0) return { ok: false, messaggio: `git fetch di ${remoto}/main non riuscito: controlla la rete e riprova.\n${f.stderr.trim()}` };

  const main = `${remoto}/main`;
  let messaggio;
  if (prova(cwd, 'merge-base', '--is-ancestor', main, 'HEAD').status === 0) messaggio = `${ramo} contiene già ${main}.`;
  else {
    const u = prova(cwd, 'merge', '--no-edit', main);
    if (u.status !== 0) {
      const conflitti = prova(cwd, 'diff', '--name-only', '--diff-filter=U').stdout.trim();
      if (existsSync(join(git(cwd, 'rev-parse', '--absolute-git-dir'), 'MERGE_HEAD'))) prova(cwd, 'merge', '--abort');
      return {
        ok: false,
        messaggio:
          `Unione di ${main} in ${ramo} non riuscita: la prova NON parte.\n` +
          (conflitti ? `File in conflitto:\n  ${conflitti.split('\n').join('\n  ')}\n` : `${(u.stderr || u.stdout).trim()}\n`) +
          `L'unione è stata annullata. Risolvi a mano (git merge ${main}), fai il commit e riavvia la prova.`,
      };
    }
    messaggio = `Unito ${main} in ${ramo}.`;
  }

  const comune = resolve(cwd, git(cwd, 'rev-parse', '--git-common-dir'));
  writeFileSync(join(comune, FILE_RAMO), JSON.stringify({ ramo, commit: git(cwd, 'rev-parse', 'HEAD'), il: new Date().toISOString() }, null, 2));
  return { ok: true, messaggio };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const r = allineaMain();
  (r.ok ? console.log : console.error)(r.messaggio);
  process.exit(r.ok ? 0 : 1);
}
