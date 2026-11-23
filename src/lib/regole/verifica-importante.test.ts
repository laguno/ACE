import { describe, expect, it } from 'vitest';
import { CONFIG, giorno } from './index';
import { materiaEsclusa, verificaImportante, type VerificaCandidata, type VotoDellaMateria } from './verifica-importante';

const oggi = giorno('2026-11-23');
const ver = (extra: Partial<VerificaCandidata>): VerificaCandidata => ({
  id: 'v1',
  data: '2026-11-26',
  tipo: 'verifica',
  argomento: 'Il sistema solare',
  materia_id: 'scienze',
  materia: 'Scienze',
  ...extra,
});
const voto = (materia_id: string, v: number, data = '2026-11-10', peso: number | null = 100): VotoDellaMateria => ({ materia_id, voto: v, data, peso, fa_media: true });

describe('verifica importante (23/11)', () => {
  it('la config ha i numeri decisi dal signore', () => {
    expect(CONFIG.verifica_importante.giorni_prima).toBe(3);
    expect(CONFIG.verifica_importante.soglia_voto).toBe(6);
    expect(CONFIG.verifica_importante.materie_escluse).toEqual(['Musica', 'Arte e immagine', 'Educazione fisica']);
  });

  it('esempio vero: scienze con media 5,25 e verifica il 26/11 è importante', () => {
    const voti = [voto('scienze', 5), voto('scienze', 5.5, '2026-11-12'), voto('scienze', 5, '2026-11-14'), voto('scienze', 5.5, '2026-11-18')];
    expect(verificaImportante([ver({})], voti, oggi)?.id).toBe('v1');
  });

  it('materia sufficiente e senza ultimo voto brutto: niente riquadro', () => {
    expect(verificaImportante([ver({})], [voto('scienze', 8), voto('scienze', 7, '2026-11-15')], oggi)).toBeNull();
  });

  it('media sufficiente ma ultimo voto sotto il 6: importante', () => {
    const voti = [voto('scienze', 9, '2026-11-01'), voto('scienze', 8, '2026-11-05'), voto('scienze', 5, '2026-11-20')];
    expect(verificaImportante([ver({})], voti, oggi)).not.toBeNull();
  });

  it('oltre i 3 giorni non conta, il quarto giorno è fuori', () => {
    const voti = [voto('scienze', 4)];
    expect(verificaImportante([ver({ data: '2026-11-26' })], voti, oggi)).not.toBeNull();
    expect(verificaImportante([ver({ data: '2026-11-27' })], voti, oggi)).toBeNull();
  });

  it('oggi conta, ieri no', () => {
    const voti = [voto('scienze', 4)];
    expect(verificaImportante([ver({ data: '2026-11-23' })], voti, oggi)).not.toBeNull();
    expect(verificaImportante([ver({ data: '2026-11-22' })], voti, oggi)).toBeNull();
  });

  it('mai le materie pratiche, anche con voti bassi: un\'esposizione col flauto non lo è mai', () => {
    const voti = [voto('musica', 4), voto('arte', 4), voto('ef', 4)];
    expect(verificaImportante([ver({ materia_id: 'musica', materia: 'Musica', argomento: 'Esposizione col flauto' })], voti, oggi)).toBeNull();
    expect(verificaImportante([ver({ materia_id: 'arte', materia: 'Arte e immagine' })], voti, oggi)).toBeNull();
    expect(verificaImportante([ver({ materia_id: 'ef', materia: 'Educazione fisica' })], voti, oggi)).toBeNull();
    expect(materiaEsclusa('Scienze motorie e sportive')).toBe(true);
    expect(materiaEsclusa('Scienze')).toBe(false);
  });

  it('le prove comuni sono sempre importanti, anche con voti alti', () => {
    const c = ver({ materia_id: 'italiano', materia: 'Italiano', argomento: 'Prova comune: comprensione del testo' });
    expect(verificaImportante([c], [voto('italiano', 9)], oggi)?.id).toBe('v1');
  });

  it('il recupero da solo non basta: serve la materia sotto la sufficienza', () => {
    const r = ver({ argomento: 'Verifica di recupero: il sistema solare' });
    expect(verificaImportante([r], [voto('scienze', 8)], oggi)).toBeNull();
    expect(verificaImportante([r], [voto('scienze', 5)], oggi)).not.toBeNull();
  });

  it('una sola, la più vicina tra le importanti', () => {
    const voti = [voto('scienze', 4), voto('storia', 4)];
    const a = ver({ id: 'tardi', data: '2026-11-26' });
    const b = ver({ id: 'presto', data: '2026-11-24', materia_id: 'storia', materia: 'Storia' });
    expect(verificaImportante([a, b], voti, oggi)?.id).toBe('presto');
  });

  it('i voti che non fanno media e i pesi contano come in Nuvola', () => {
    // 5 al 100% e un 9 che non fa media: la media è 5
    const voti: VotoDellaMateria[] = [voto('scienze', 5), { materia_id: 'scienze', voto: 9, data: '2026-11-01', peso: 100, fa_media: false }];
    expect(verificaImportante([ver({})], voti, oggi)).not.toBeNull();
  });

  it('senza voti non si sa: non è importante', () => {
    expect(verificaImportante([ver({})], [], oggi)).toBeNull();
  });
});
