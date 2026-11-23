// Colori fissi di ACE v2 (23/11): i gettoni delle cose obbligatorie e un colore per materia.
// (cartella, geografia, scienze, spagnolo ed educazione fisica scuriti di poco rispetto alla bozza: non reggevano 4,5:1.) Un solo file, con la prova che il testo regge 4,5:1 sul suo fondo (colori.test.ts).

export type Gettone = 'compiti' | 'ripasso' | 'cartella' | 'borsa';

/** Gettoni dai colori fissi, uguali in tutta l'app: fondo e segno (testo, icona, cerchio pieno). */
export const GETTONI: Record<Gettone, { fondo: string; segno: string }> = {
  compiti: { fondo: '#F3E6FD', segno: '#6B4FC0' },
  ripasso: { fondo: '#FFF3C4', segno: '#8A6400' },
  cartella: { fondo: '#DCEFFF', segno: '#296DAC' },
  borsa: { fondo: '#FFE3EF', segno: '#C2185B' },
};

/** Un colore per materia: testo e fondo. La chiave è il nome in minuscolo, senza accenti. */
export const MATERIE: Record<string, { testo: string; fondo: string }> = {
  italiano: { testo: '#8E3B9E', fondo: '#F4E3F7' },
  storia: { testo: '#A0522D', fondo: '#FBE6D6' },
  geografia: { testo: '#57771C', fondo: '#EEF5DC' },
  matematica: { testo: '#C62828', fondo: '#FDE3E3' },
  scienze: { testo: '#2D7B31', fondo: '#E3F4E1' },
  inglese: { testo: '#1F5FA8', fondo: '#DCEBFF' },
  spagnolo: { testo: '#AB5300', fondo: '#FFEBD6' },
  tecnologia: { testo: '#00796B', fondo: '#DDF3F0' },
  arte: { testo: '#AD1457', fondo: '#FCE4EC' },
  musica: { testo: '#5E35B1', fondo: '#EDE7F6' },
  'educazione fisica': { testo: '#0270B2', fondo: '#E1F3FC' },
  religione: { testo: '#6D5D4B', fondo: '#F1ECE6' },
};

const NEUTRO = { testo: '#5E4470', fondo: '#F1ECF5' };

/** Colore di una materia dal nome di Nuvola ("Arte e immagine", "Scienze motorie"...). */
export function coloreMateria(nome: string | null | undefined): { testo: string; fondo: string } {
  const n = (nome ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!n) return NEUTRO;
  if (n.startsWith('arte')) return MATERIE.arte;
  if (n.startsWith('educazione fisica') || n.startsWith('scienze motorie')) return MATERIE['educazione fisica'];
  const chiave = Object.keys(MATERIE).find((k) => n.startsWith(k));
  return chiave ? MATERIE[chiave] : NEUTRO;
}
