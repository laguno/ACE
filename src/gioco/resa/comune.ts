// Costanti e aiuti di disegno usati da più parti della resa (solo grafica: i numeri del gioco sono in config).
import { M } from '../motore';

export const RAGGIO_PALLA = M.raggio * 1.25 * 0.85; // la palla si disegna un po' più grande: il motore non cambia
export const COLORE_FONDO = '#ffe3ef'; // finché lo sfondo non è caricato
export const INCHIOSTRO = '#2f2a6e'; // ombre, bordi, pillola del punteggio
// Tremolio (skill game-feel): trauma che cala nel tempo vero, scossa = trauma², seni lisci.
export const TRAUMA_COLPO = 0.6;
export const TRAUMA_MOSSA = 1; // mossa finale: fascia "large" della tabella della skill
export const TRAUMA_CALO = 1.6; // al secondo
export const SCOSSA_PX: [number, number] = [14, 9];

// Ogni immagine si crea una volta sola: le misure di riquadro() restano buone tra una partita e l'altra.
const immagini = new Map<string, HTMLImageElement>();
export function immagine(src: string) {
  let i = immagini.get(src);
  if (!i) immagini.set(src, (i = Object.assign(new Image(), { src })));
  return i;
}
export const FIGURE = {
  sfondo: immagine('/assets/sfondi/sfondo-1-colline.webp'),
  palla: immagine('/assets/oggetti/pallone.webp'),
};
export const pronta = (i: HTMLImageElement) => i.complete && i.naturalWidth > 0;
export const Y = (y: number) => -y; // il motore ha y verso l'alto, la tela verso il basso; 0 = pavimento
