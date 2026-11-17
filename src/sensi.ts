// Sensi (passo 5, 17/11): movimento, suono e vibrazione per i gesti di Lani, in proporzione a quante
// volte li fa (PRODUCT.md, principio 4). Tutti i valori stanno in data/config-sensi.json: qui niente numeri.
// - Movimento: CSS, con le durate e le curve passate come variabili (--sensi-*) da applicaVariabili().
// - Suono: un solo AudioContext, sbloccato al primo tocco; i file (public/suoni, WAV di pochi kB) li
//   tiene il service worker. Si spegne per dispositivo dalle Impostazioni dei genitori.
//   iPad (PWA): al rientro dal background il contesto può restare sospeso: si riprende al tocco
//   successivo e, se non riparte, si prova con un <audio>. Col tasto silenzioso iOS tace: va bene così.
// - Vibrazione: solo dove esiste (non su iPhone e iPad); niente con il movimento ridotto.
import CONFIG from '../data/config-sensi.json' with { type: 'json' };

export const SENSI = CONFIG;
export type Momento = keyof typeof CONFIG.momenti;
type Suono = { file: string; volume: number; dopo_ms: number };

const CHIAVE_SUONO = 'ace-suono';

/** I popup del copione che sono un momento grande; gli altri non suonano né vibrano. */
export function momentoDelPopup(situazione: string): Momento | undefined {
  if (situazione === 'tappa') return 'tappa';
  if (situazione === 'forziere_aperto' || situazione === 'cima') return 'forziere';
  if (situazione === 'partita_vinta') return 'partita';
  if (/^chiavi_[1-9]/.test(situazione)) return 'chiave';
  return undefined;
}

/** Le variabili CSS dei sensi, da config: --sensi-<momento>-<chiave> (es. --sensi-spunta-durata-ms: 320ms). */
export function variabiliCss(c = CONFIG): Record<string, string> {
  const v: Record<string, string> = {
    '--sensi-schermata-durata': `${c.cambio_schermata.durata_ms}ms`,
    '--sensi-schermata-curva': c.cambio_schermata.curva,
    '--sensi-curva-arrivo': c.curve.arrivo,
    '--sensi-curva-rimbalzo': c.curve.rimbalzo,
  };
  for (const [nome, m] of Object.entries(c.momenti))
    for (const [k, x] of Object.entries(m)) {
      if (typeof x !== 'number') continue;
      const unita = k.endsWith('_ms') ? 'ms' : k.endsWith('_px') ? 'px' : k.endsWith('_gradi') ? 'deg' : '';
      v[`--sensi-${nome}-${k.replaceAll('_', '-')}`] = `${x}${unita}`;
    }
  return v;
}

function applicaVariabili(radice: HTMLElement = document.documentElement) {
  for (const [k, x] of Object.entries(variabiliCss())) radice.style.setProperty(k, x);
}

/**
 * Cambio di schermata: solo opacità (una trasformazione sul contenitore sposterebbe gli elementi fissi
 * come l'Album di Astra). Con il movimento ridotto niente.
 */
export function cambioSchermata(el: HTMLElement | null) {
  if (!el?.animate || movimentoRidotto()) return;
  el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: CONFIG.cambio_schermata.durata_ms, easing: CONFIG.cambio_schermata.curva });
}

// ---------------------------------------------------------------- preferenze del dispositivo

export function suonoAcceso(): boolean {
  try {
    return localStorage.getItem(CHIAVE_SUONO) !== 'spento';
  } catch {
    return true;
  }
}

export function scegliSuono(acceso: boolean) {
  try {
    if (acceso) localStorage.removeItem(CHIAVE_SUONO);
    else localStorage.setItem(CHIAVE_SUONO, 'spento');
  } catch {
    // senza memoria del browser resta acceso: la scelta vale fino alla chiusura
  }
}

const movimentoRidotto = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// ---------------------------------------------------------------- audio

let contesto: AudioContext | undefined;
const buffer = new Map<string, Promise<AudioBuffer | undefined>>();

function ctx(): AudioContext | undefined {
  if (contesto && contesto.state !== 'closed') return contesto;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return undefined;
  contesto = new AC();
  return contesto;
}

function carica(file: string) {
  const c = ctx();
  if (!c) return Promise.resolve(undefined);
  let b = buffer.get(file);
  if (!b) {
    b = fetch(`/suoni/${file}.wav`)
      .then((r) => r.arrayBuffer())
      .then((a) => c.decodeAudioData(a))
      .catch(() => undefined);
    buffer.set(file, b);
  }
  return b;
}

/** Al primo tocco (e a ogni tocco dopo un rientro) il contesto riparte; i file si preparano una volta. */
function sblocca() {
  if (!suonoAcceso()) return;
  const c = ctx();
  if (!c) return;
  if (c.state !== 'running') c.resume().catch(() => {});
  // iOS: un suono vuoto dentro il gesto sblocca il contesto
  const vuoto = c.createBuffer(1, 1, c.sampleRate);
  const s = c.createBufferSource();
  s.buffer = vuoto;
  s.connect(c.destination);
  s.start();
  for (const f of CONFIG.file_suoni) carica(f);
}

let ascolto = false;
/** Da chiamare una volta all'avvio: sblocco al tocco, ripresa al ritorno in primo piano. */
export function preparaSensi() {
  applicaVariabili();
  if (ascolto) return;
  ascolto = true;
  window.addEventListener('pointerdown', sblocca, { capture: true, passive: true });
  window.addEventListener('keydown', sblocca, { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && contesto && contesto.state !== 'running') contesto.resume().catch(() => {});
  });
}

function fischio(c: AudioContext, quando: number, volume: number) {
  const f = CONFIG.fischio;
  const durata = f.durata_ms / 1000;
  const osc = c.createOscillator();
  const trillo = c.createOscillator();
  const ampiezzaTrillo = c.createGain();
  const g = c.createGain();
  osc.frequency.value = f.frequenza_hz;
  trillo.frequency.value = f.trillo_hz;
  ampiezzaTrillo.gain.value = f.trillo_ampiezza_hz;
  trillo.connect(ampiezzaTrillo).connect(osc.frequency);
  g.gain.setValueAtTime(0, quando);
  g.gain.linearRampToValueAtTime(volume, quando + f.attacco_ms / 1000);
  g.gain.setValueAtTime(volume, quando + durata - f.attacco_ms / 1000);
  g.gain.linearRampToValueAtTime(0, quando + durata);
  osc.connect(g).connect(c.destination);
  for (const o of [osc, trillo]) {
    o.start(quando);
    o.stop(quando + durata);
  }
}

async function suona({ file, volume, dopo_ms }: Suono) {
  const v = volume * CONFIG.volume_generale;
  const c = ctx();
  if (c && c.state !== 'running') await c.resume().catch(() => {});
  if (c?.state === 'running') {
    const quando = c.currentTime + dopo_ms / 1000;
    if (file === 'fischio') return fischio(c, quando, v);
    const b = await carica(file);
    if (!b) return;
    const s = c.createBufferSource();
    const g = c.createGain();
    g.gain.value = v;
    s.buffer = b;
    s.connect(g).connect(c.destination);
    s.start(Math.max(quando, c.currentTime));
    return;
  }
  // contesto fermo (iPad al rientro): un <audio> semplice; il fischio, sintetizzato, qui non c'è
  if (file === 'fischio') return;
  window.setTimeout(() => {
    const a = new Audio(`/suoni/${file}.wav`);
    a.volume = v;
    a.play().catch(() => {});
  }, dopo_ms);
}

/** Il momento si sente: vibrazione (se c'è e se il movimento non è ridotto) e suoni (se accesi). */
export function senti(momento: Momento) {
  const m = CONFIG.momenti[momento];
  if (m.vibrazione_ms.length && !movimentoRidotto()) navigator.vibrate?.(m.vibrazione_ms);
  if (!suonoAcceso()) return;
  for (const s of m.suoni as Suono[]) suona(s).catch(() => {});
}
