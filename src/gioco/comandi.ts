// Comandi: tastiera, croce e pulsanti, e chi tiene premuto cosa; vibrazione e schermo intero.
import { Capacitor } from '@capacitor/core';
import type { PointerEvent } from 'react';
import type { Comandi } from './motore';

export type Tasto = keyof Comandi;

/** Vibrazione dove c'è (Chrome Android sì, Safari no): mai un errore per questo. */
export function vibra(schema: number | number[]) {
  try {
    navigator.vibrate?.(schema);
  } catch {
    /* niente vibrazione */
  }
}

export const TASTI: Tasto[] = ['sx', 'dx', 'salta', 'schiaccia', 'speciale'];
// tastiera, per provare dal computer (codici fisici: valgono con ogni disposizione di tasti)
export const TASTIERA: Record<string, Tasto> = {
  ArrowLeft: 'sx',
  KeyA: 'sx',
  ArrowRight: 'dx',
  KeyD: 'dx',
  ArrowUp: 'salta',
  Space: 'salta',
  KeyK: 'schiaccia',
  KeyL: 'speciale',
};

/**
 * Chi tiene premuto ogni tasto (dita per pointerId, tasti per codice): due dita sullo stesso
 * pulsante non si spengono a vicenda. "visti" tiene acceso per almeno un tic anche un tocco più
 * breve di un sessantesimo, e anche uno fatto durante la pausa della schiacciata. "dita" dice da
 * che parte della croce sta ogni dito.
 */
export type Ingressi = {
  premuti: Record<Tasto, Set<number | string>>;
  visti: Set<Tasto>;
  dita: Map<number, Tasto>;
  bottoni: Partial<Record<Tasto, HTMLElement | null>>;
};
export const nuoviIngressi = (): Ingressi => ({
  premuti: Object.fromEntries(TASTI.map((t) => [t, new Set()])) as Ingressi['premuti'],
  visti: new Set(),
  dita: new Map(),
  bottoni: {},
});
export function premi(i: Ingressi, t: Tasto, chi: number | string) {
  if (i.premuti[t].size === 0 && t !== 'sx' && t !== 'dx') vibra(12);
  i.premuti[t].add(chi);
  i.visti.add(t);
  i.bottoni[t]?.classList.add('giu'); // il pulsante resta giù finché c'è un dito
}
export function lascia(i: Ingressi, t: Tasto, chi: number | string) {
  i.premuti[t].delete(chi);
  if (i.premuti[t].size === 0) i.bottoni[t]?.classList.remove('giu');
}
export function leggi(i: Ingressi): Comandi {
  const d = Object.fromEntries(TASTI.map((t) => [t, i.premuti[t].size > 0 || i.visti.has(t)])) as Comandi;
  i.visti.clear();
  return d;
}
/**
 * Schermo intero e orizzontale nel browser (nell'APK ci pensa il plugin di orientamento). Si prova
 * da sola una volta sola, al primo dito alzato su un comando (il pointerdown di un dito non basta al
 * browser per dare il permesso); se poi si esce, si rientra solo dal menu Pausa.
 */
let schermoProvato = false;
export const schermoPossibile = () => !Capacitor.isNativePlatform() && document.fullscreenEnabled && !document.fullscreenElement;
export function schermoIntero(dalMenu: boolean) {
  if ((schermoProvato && !dalMenu) || !schermoPossibile()) return;
  schermoProvato = true;
  try {
    document.documentElement
      .requestFullscreen({ navigationUI: 'hide' })
      .then(() => (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.('landscape'))
      .catch(() => {});
  } catch {
    /* browser senza schermo intero: si gioca lo stesso */
  }
}

function cattura(ev: PointerEvent<HTMLElement>) {
  try {
    ev.currentTarget.setPointerCapture(ev.pointerId);
  } catch {
    /* dito già alzato: premi è già stato chiamato, basta così */
  }
}

const rif = (i: Ingressi, t: Tasto) => (b: HTMLElement | null) => {
  i.bottoni[t] = b;
};

/** Salta, Schiaccia e la mossa: il dito resta del pulsante finché non si alza, anche se scivola fuori. */
export function comando(i: Ingressi, t: Tasto) {
  const molla = (ev: PointerEvent) => lascia(i, t, ev.pointerId);
  return {
    onPointerUp: (ev: PointerEvent) => {
      molla(ev);
      schermoIntero(false);
    },
    ref: rif(i, t),
    onPointerDown: (ev: PointerEvent<HTMLButtonElement>) => {
      ev.preventDefault();
      premi(i, t, ev.pointerId);
      cattura(ev);
    },
    onPointerCancel: molla,
    onLostPointerCapture: molla,
  };
}

/**
 * Croce: una zona sola, la direzione la dà la x del dito rispetto al centro. Scivolando da una
 * parte all'altra si cambia verso senza alzare il dito; niente spazio morto in mezzo.
 */
export function croce(i: Ingressi) {
  const verso = (ev: PointerEvent<HTMLElement>): Tasto => {
    const r = ev.currentTarget.getBoundingClientRect();
    return ev.clientX < r.left + r.width / 2 ? 'sx' : 'dx';
  };
  const molla = (ev: PointerEvent) => {
    const t = i.dita.get(ev.pointerId);
    if (!t) return;
    lascia(i, t, ev.pointerId);
    i.dita.delete(ev.pointerId);
  };
  return {
    frecce: { sx: rif(i, 'sx'), dx: rif(i, 'dx') },
    zona: {
      onPointerDown: (ev: PointerEvent<HTMLDivElement>) => {
        ev.preventDefault();
        const t = verso(ev);
        i.dita.set(ev.pointerId, t);
        premi(i, t, ev.pointerId);
        cattura(ev);
      },
      onPointerMove: (ev: PointerEvent<HTMLDivElement>) => {
        const prima = i.dita.get(ev.pointerId);
        if (!prima) return;
        const t = verso(ev);
        if (t === prima) return;
        lascia(i, prima, ev.pointerId);
        i.dita.set(ev.pointerId, t);
        premi(i, t, ev.pointerId);
      },
      onPointerUp: (ev: PointerEvent) => {
        molla(ev);
        schermoIntero(false);
      },
      onPointerCancel: molla,
      onLostPointerCapture: molla,
    },
  };
}
