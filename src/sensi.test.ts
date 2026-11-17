// Sensi (passo 5): la configurazione rispetta le regole del piano e senti() rispetta le scelte.
import { existsSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { momentoDelPopup, SENSI, senti, variabiliCss, type Momento } from './sensi';

const GRANDI: Momento[] = ['tappa', 'chiave', 'forziere', 'partita'];

describe('config-sensi.json', () => {
  it('la spunta è minuscola, i momenti grandi più lunghi e più forti', () => {
    const s = SENSI.momenti.spunta;
    for (const m of GRANDI) {
      expect(SENSI.momenti[m].durata_ms).toBeGreaterThan(s.durata_ms);
      expect(SENSI.momenti[m].vibrazione_ms.reduce((a, b) => a + b, 0)).toBeGreaterThan(s.vibrazione_ms.reduce((a, b) => a + b, 0));
    }
    expect(s.vibrazione_ms).toEqual([10]);
    expect(s.suoni).toHaveLength(1);
  });
  it('errore: piccola scossa, nessun suono né vibrazione', () => {
    expect(SENSI.momenti.errore.suoni).toEqual([]);
    expect(SENSI.momenti.errore.vibrazione_ms).toEqual([]);
  });
  it('cambio schermata fra 150 e 200 ms', () => {
    expect(SENSI.cambio_schermata.durata_ms).toBeGreaterThanOrEqual(150);
    expect(SENSI.cambio_schermata.durata_ms).toBeLessThanOrEqual(200);
  });
  it('ogni suono ha il suo file (o è il fischio sintetizzato), volumi fra 0 e 1', () => {
    for (const m of Object.values(SENSI.momenti))
      for (const s of m.suoni as { file: string; volume: number }[]) {
        if (s.file !== 'fischio') {
          expect(SENSI.file_suoni).toContain(s.file);
          expect(existsSync(`public/suoni/${s.file}.wav`)).toBe(true);
        }
        expect(s.volume).toBeGreaterThan(0);
        expect(s.volume).toBeLessThanOrEqual(1);
      }
  });
  it('variabili CSS con le unità', () => {
    const v = variabiliCss();
    expect(v['--sensi-spunta-durata-ms']).toBe(`${SENSI.momenti.spunta.durata_ms}ms`);
    expect(v['--sensi-spunta-piu-sale-px']).toBe(`${SENSI.momenti.spunta.piu_sale_px}px`);
    expect(v['--sensi-forziere-scossa-gradi']).toBe(`${SENSI.momenti.forziere.scossa_gradi}deg`);
    expect(v['--sensi-spunta-rimbalzo-scala']).toBe(String(SENSI.momenti.spunta.rimbalzo_scala));
    expect(v['--sensi-schermata-durata']).toBe(`${SENSI.cambio_schermata.durata_ms}ms`);
  });
});

describe('momentoDelPopup', () => {
  it('solo i momenti grandi', () => {
    expect(momentoDelPopup('tappa')).toBe('tappa');
    expect(momentoDelPopup('forziere_aperto')).toBe('forziere');
    expect(momentoDelPopup('cima')).toBe('forziere');
    expect(momentoDelPopup('partita_vinta')).toBe('partita');
    expect(momentoDelPopup('chiavi_2')).toBe('chiave');
    expect(momentoDelPopup('chiavi_0')).toBeUndefined(); // settimana storta: niente festa
    expect(momentoDelPopup('partita_persa')).toBeUndefined();
    expect(momentoDelPopup('nota_disciplinare')).toBeUndefined();
    expect(momentoDelPopup('forziere_lucchetto')).toBeUndefined();
  });
});

describe('senti', () => {
  afterEach(() => vi.unstubAllGlobals());
  const prepara = ({ ridotto = false, suono = true } = {}) => {
    const vibra = vi.fn();
    const contesti = vi.fn();
    vi.stubGlobal('window', { matchMedia: () => ({ matches: ridotto }), AudioContext: contesti, setTimeout });
    vi.stubGlobal('navigator', { vibrate: vibra });
    vi.stubGlobal('localStorage', { getItem: () => (suono ? null : 'spento') });
    return { vibra, contesti };
  };
  it('suono spento: vibra ma non apre l\'audio', () => {
    const { vibra, contesti } = prepara({ suono: false });
    senti('tappa');
    expect(vibra).toHaveBeenCalledWith(SENSI.momenti.tappa.vibrazione_ms);
    expect(contesti).not.toHaveBeenCalled();
  });
  it('movimento ridotto: niente vibrazione', () => {
    const { vibra } = prepara({ ridotto: true, suono: false });
    senti('spunta');
    expect(vibra).not.toHaveBeenCalled();
  });
  it('errore: né vibrazione né audio', () => {
    const { vibra, contesti } = prepara();
    senti('errore');
    expect(vibra).not.toHaveBeenCalled();
    expect(contesti).not.toHaveBeenCalled();
  });
});
