import { describe, expect, it } from 'vitest';
import config from '../../../data/config-gioco.json';
import { NOTIFICHE, POPUP, componi, notifica, popupMostrabile, popupVoto, votoScritto, type ChiavePopup, type ChiaveNotifica } from './index';

// Valori di prova lunghi, per stare larghi con i limiti.
const ESEMPIO = {
  materia: 'Educazione civica', prima: '5½', voto: '7½', passi: 35, tappa: 27, mancano_passi: 410, n: 3,
  premio: 'una giornata al parco acquatico', cosa: 'la cartella di martedì', giorno: 'mercoledì 18', chiavi: 36,
  cose: 'verifica di Mate, allenamento 18:30', ora: '18:30',
};
const parole = (s: string) => s.trim().split(/\s+/).length;
const EMOJI = /\p{Extended_Pictographic}/u;

describe('copione', () => {
  it.each(Object.keys(POPUP) as ChiavePopup[])('popup %s: titolo <= 4 parole, testo <= 25, niente emoji', (k) => {
    const p = componi(k, ESEMPIO);
    expect(parole(p.titolo)).toBeLessThanOrEqual(config.popup.titolo_parole_max);
    expect(parole(p.testo)).toBeLessThanOrEqual(config.popup.parole_max);
    expect(p.testo).not.toMatch(/\{\w+\}/);
    expect(EMOJI.test(p.titolo + p.testo)).toBe(false);
  });

  it.each(Object.keys(NOTIFICHE) as ChiaveNotifica[])('notifica %s: <= 60 caratteri, titolo ACE', (k) => {
    const n = notifica(k, { ...ESEMPIO, materia: 'Ed. civica', cose: 'verifica di Mate, allenamento 18:30' });
    expect(n.titolo).toBe('ACE');
    expect(riempita(k)).toBeLessThanOrEqual(config.notifiche.caratteri_max);
    expect(EMOJI.test(n.testo)).toBe(false);
  });

  it('dopo le 21 niente rimproveri di mamma e papà; gli altri sì', () => {
    const nota = componi('nota_disciplinare', ESEMPIO);
    expect(popupMostrabile(nota, '20:59')).toBe(true);
    expect(popupMostrabile(nota, '21:00')).toBe(false);
    expect(popupMostrabile(componi('tappa', ESEMPIO), '22:00')).toBe(true);
  });

  it('nota di merito: mamma-festeggia, +50 dal config, va sul frigo', () => {
    const p = componi('nota_merito', { materia: 'Arte', passi: config.passi.nota_merito });
    expect(p).toMatchObject({ posa: 'mamma-festeggia', titolo: 'Nota di merito', testo: 'Nota di merito in Arte: +50. Questa va sul frigo.' });
  });

  it('popup del voto: recupero, migliorato, fascia', () => {
    expect(popupVoto(6.5, 5)).toBe('voto_recupero');
    expect(popupVoto(8, 7)).toBe('voto_migliorato');
    expect(popupVoto(9, 9)).toBe('voto_9');
    expect(popupVoto(7, undefined, 0, 2)).toBe('voto_7');
    expect(popupVoto(7)).toBe('voto_7_senza_ripasso');
    expect(popupVoto(5)).toBe('voto_insufficiente');
    expect(popupVoto(4.5, 4.5, 2)).toBe('voto_insufficiente_ancora');
    expect(votoScritto(7.5)).toBe('7½');
    expect(votoScritto(8)).toBe('8');
  });
});

function riempita(k: ChiaveNotifica) {
  // senza troncare: il testo pieno deve già stare nei 60 caratteri
  return NOTIFICHE[k].replace(/\{(\w+)\}/g, (_, v) => String((ESEMPIO as Record<string, unknown>)[v] ?? '')).replace('Educazione civica', 'Ed. civica').length;
}
