// Ambiente di prova mai indietro rispetto a main (18/11): unione automatica, stop sui conflitti,
// controllo prima del rilascio. Su repository git veri ma finti, in una cartella temporanea.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
// @ts-expect-error modulo JavaScript senza tipi
import { allineaMain } from './allinea-main.mjs';
// @ts-expect-error modulo JavaScript senza tipi
import { finestraVietata, provaContiene } from './rilascio-controlla.mjs';

const cartelle: string[] = [];
afterEach(() => cartelle.splice(0).forEach((c) => rmSync(c, { recursive: true, force: true })));

function g(cwd: string, ...a: string[]) {
  return execFileSync('git', ['-c', 'user.name=prova', '-c', 'user.email=prova@finto.test', '-c', 'commit.gpgsign=false', ...a], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function scrivi(cwd: string, file: string, testo: string, messaggio: string) {
  writeFileSync(join(cwd, file), testo);
  g(cwd, 'add', file);
  g(cwd, 'commit', '-q', '-m', messaggio);
}

/** origin (bare), il clone di prova sul ramo "prova", e un secondo clone che spinge su main. */
function banco() {
  const base = mkdtempSync(join(tmpdir(), 'ace-allinea-'));
  cartelle.push(base);
  const origine = join(base, 'origine.git');
  g(base, 'init', '-q', '--bare', '-b', 'main', origine);
  const altro = join(base, 'altro');
  g(base, 'clone', '-q', origine, altro);
  g(altro, 'checkout', '-q', '-b', 'main');
  scrivi(altro, 'a.txt', 'uno\n', 'primo');
  g(altro, 'push', '-q', 'origin', 'main');
  const qui = join(base, 'qui');
  g(base, 'clone', '-q', origine, qui);
  g(qui, 'checkout', '-q', '-b', 'prova');
  g(qui, 'config', 'user.name', 'prova');
  g(qui, 'config', 'user.email', 'prova@finto.test');
  return { altro, qui };
}

// git su Windows parte lento quando gira tutto insieme: tempi larghi
describe('allinea main nel ramo di prova', { timeout: 60_000 }, () => {
  it('main avanti: si unisce, poi è già allineato; il rilascio trova il commit', () => {
    const { altro, qui } = banco();
    scrivi(qui, 'b.txt', 'novità\n', 'feature');
    scrivi(altro, 'c.txt', 'correzione\n', 'su main');
    g(altro, 'push', '-q', 'origin', 'main');

    expect(allineaMain(qui)).toMatchObject({ ok: true, messaggio: 'Unito origin/main in prova.' });
    expect(spawnSync('git', ['merge-base', '--is-ancestor', 'origin/main', 'HEAD'], { cwd: qui }).status).toBe(0);
    expect(allineaMain(qui).messaggio).toBe('prova contiene già origin/main.');
    expect(provaContiene(qui, 'origin/main')).toMatchObject({ ok: true });
  });

  it('conflitto: si ferma, annulla l\'unione e dice quali file', () => {
    const { altro, qui } = banco();
    scrivi(qui, 'a.txt', 'dalla prova\n', 'prova cambia a');
    scrivi(altro, 'a.txt', 'da main\n', 'main cambia a');
    g(altro, 'push', '-q', 'origin', 'main');
    const prima = g(qui, 'rev-parse', 'HEAD');

    const r = allineaMain(qui);
    expect(r.ok).toBe(false);
    expect(r.messaggio).toContain('la prova NON parte');
    expect(r.messaggio).toContain('a.txt');
    expect(g(qui, 'rev-parse', 'HEAD')).toBe(prima);
    expect(g(qui, 'status', '--porcelain')).toBe('');
  });

  it('rilascio: un commit che il ramo di prova non ha va allineato prima', () => {
    const { altro, qui } = banco();
    allineaMain(qui);
    scrivi(altro, 'd.txt', 'mai provato\n', 'non provato');
    g(altro, 'push', '-q', 'origin', 'main');
    g(qui, 'fetch', '-q', 'origin', 'main');
    const r = provaContiene(qui, 'origin/main');
    expect(r.ok).toBe(false);
    expect(r.messaggio).toContain('Allinea prima');
  });
});

describe('finestre senza pubblicazioni', () => {
  it('14:20-14:45 e 19:45-21:00, ora di Roma', () => {
    expect(finestraVietata(new Date('2026-11-18T14:30:00+01:00'))).toEqual(['14:20', '14:45']);
    expect(finestraVietata(new Date('2026-11-18T20:59:00+01:00'))).toEqual(['19:45', '21:00']);
    expect(finestraVietata(new Date('2026-11-18T14:45:00+01:00'))).toBeNull();
    expect(finestraVietata(new Date('2026-07-01T19:50:00+02:00'))).toEqual(['19:45', '21:00']);
    expect(finestraVietata(new Date('2026-11-18T21:00:00+01:00'))).toBeNull();
  });
});

// Il controllo che sta al posto della CI: questo ramo non è indietro rispetto a origin/main (come
// l'ultima volta che è stato scaricato). Salta fuori da git o senza origin/main (build di Vercel).
const radice = join(import.meta.dirname, '..');
const haMain = spawnSync('git', ['rev-parse', '--verify', '--quiet', 'refs/remotes/origin/main'], { cwd: radice }).status === 0;
describe.skipIf(!haMain)('questo ramo', () => {
  it('contiene origin/main (se no: npm run prova:allinea)', () => {
    expect(spawnSync('git', ['merge-base', '--is-ancestor', 'origin/main', 'HEAD'], { cwd: radice }).status).toBe(0);
  });
});
