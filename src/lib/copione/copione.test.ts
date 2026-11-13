import { describe, expect, it } from 'vitest';
import config from '../../../data/config-gioco.json';
import { NOTIFICHE, POPUP, componi, notifica, nomeFigurina, popupMostrabile, popupVoto, riempi, votoScritto, type ChiavePopup, type ChiaveNotifica } from './index';

// Valori di prova lunghi, per stare larghi con i limiti.
const ESEMPIO = {
  materia: 'Educazione civica', prima: '5½', voto: '7½', passi: 35, tappa: 27, mancano_passi: 410, n: 3,
  premio: 'una giornata al parco acquatico', cosa: 'la cartella di martedì', giorno: 'mercoledì 18', chiavi: 36,
  cose: 'verifica di Mate, allenamento 18:30', ora: '18:30', nome: 'Lady dispettosa', risultato: '2-3',
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
    expect(p).toMatchObject({ posa: 'mamma-festeggia', titolo: 'Nota di merito', testo: 'In Arte: +50. Questa va sul frigo.' });
  });

  it.each(Object.keys(POPUP) as ChiavePopup[])('popup %s: il testo non ripete il titolo', (k) => {
    const p = componi(k, ESEMPIO);
    const inizio = (s: string) => s.toLowerCase().replace(/[^a-zàèéìòù ]/g, '').split(' ').slice(0, 2).join(' ');
    expect(inizio(p.testo)).not.toBe(inizio(p.titolo));
  });

  it('singolare e plurale giusti con 1 (chiave, passo, tentativo, sessione, compito, cosa)', () => {
    const uno = { ...ESEMPIO, n: 1, mancano_passi: 1, chiavi: 1 };
    const testi = [...(Object.keys(POPUP) as ChiavePopup[]).map((k) => componi(k, uno).testo), ...(Object.keys(NOTIFICHE) as ChiaveNotifica[]).map((k) => notifica(k, uno).testo)];
    for (const s of testi) expect(s).not.toMatch(/\b1 (chiavi|passi|tappe|tentativi|sessioni|compiti|cose)\b|servono 1|[Mm]ancano ancora 1/);
    expect(componi('forziere_lucchetto', uno).testo).toBe('Sei arrivata al forziere, ma serve una chiave in più. Si apre appena ce l’hai.');
    expect(componi('forziere_lucchetto', { n: 2 }).testo).toBe('Sei arrivata al forziere, ma servono 2 chiavi in più. Si apre appena le hai.');
    expect(componi('tappa', { tappa: 4, mancano_passi: 1 }).testo).toBe('Tappa 4! Alla prossima: un passo.');
    expect(notifica('sollecito', { n: 1 }).testo).toBe('Manca ancora una cosa per chiudere la giornata');
    expect(notifica('genitori_riepilogo', { chiavi: 0 }).testo).toBe('Riepilogo della settimana di Lani: 0 chiavi');
  });

  it('bagno: prima i passi tolti, poi la cosa da fare subito (non "sistemare costa un passo")', () => {
    for (const k of ['bagno_papa', 'bagno_mamma'] as ChiavePopup[])
      expect(componi(k, { passi: '−1' }).testo).toBe('−1. Ora: asciugamani appesi, tappetino a posto, specchio pulito.');
  });

  it('popup del voto: recupero, migliorato, fascia', () => {
    expect(popupVoto(6.5, 5)).toBe('voto_recupero');
    expect(popupVoto(8, 7)).toBe('voto_migliorato');
    expect(popupVoto(9, 9)).toBe('voto_9');
    expect(popupVoto(7, undefined, 0, 2)).toBe('voto_7');
    expect(popupVoto(7)).toBe('voto_7_senza_ripasso');
    expect(popupVoto(5)).toBe('voto_insufficiente');
    expect(popupVoto(4.5, 4.5, 2)).toBe('voto_insufficiente_ancora');
    expect(nomeFigurina('papa-pollice')).toBe('Papà pollice');
    expect(nomeFigurina('lani-contenta')).toBe('Lani contenta');
    expect(votoScritto(7.5)).toBe('7½');
    expect(votoScritto(8)).toBe('8');
  });
});

function riempita(k: ChiaveNotifica) {
  // senza troncare: il testo pieno deve già stare nei 60 caratteri
  return riempi(NOTIFICHE[k], ESEMPIO).replace('Educazione civica', 'Ed. civica').length;
}

it("annuncio di R-Evolution: il trigger di 0034 accoda lo stesso testo del copione", async () => {
  const { readFileSync } = await import('node:fs');
  const sql = readFileSync('supabase/migrations/0034_annuncio_r_evolution.sql', 'utf8');
  const p = POPUP.r_evolution_accesa;
  for (const s of [p.posa, p.titolo, p.testo, `, ${p.priorita}, 'r_evolution_accesa'`]) expect(sql).toContain(s);
});
