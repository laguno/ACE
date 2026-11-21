// Gioco di pallavolo (docs/09 e docs/11): selezione dei personaggi, poi Tu contro la CPU.
// Qui stanno solo il ciclo a passo fisso, gli eventi e la pagina: le regole sono in ./motore,
// il disegno in ./resa, i comandi in ./comandi.
// Per ora si apre solo in sviluppo da #gioco (main.tsx): niente voce nell'app, niente tetto, niente server.
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { ArrowFatUp, CaretLeft, CaretRight, Fire, HandFist, Pause } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import config from '../../data/config-gioco.json' with { type: 'json' };
import { TASTI, TASTIERA, comando, croce, lascia, leggi, nuoviIngressi, premi, schermoIntero, schermoPossibile, vibra } from './comandi';
import './gioco.css';
import { HZ, ia, nuovaPartita, passo, puoSchiacciare, puoSpeciale, type TipoFinisher } from './motore';
import {
  FIAMME,
  FONDO_RISERVA,
  MOSSA_MS,
  PUNTO_MS,
  TRAUMA_CALO,
  TRAUMA_COLPO,
  TRAUMA_MOSSA,
  disegna,
  immagine,
  interpola,
  nuovaVista,
  nuoviEffetti,
  scoppio,
  type Squadra,
  type Tela,
} from './resa';
import Selezione from './Selezione';

const P = config.pallavolo;
type Personaggio = (typeof P.personaggi)[keyof typeof P.personaggi];
const PERSONAGGI: Record<string, Personaggio | undefined> = P.personaggi;
const ALTEZZE: Record<string, number | null | undefined> = P.altezze_cm;
const ERRORE_CPU = P.cpu_errore[P.cpu_livello as keyof typeof P.cpu_errore];
const DURATA = P.secondi * HZ;
const PASSO_MS = 1000 / HZ;
const MEZZO_PASSO = PASSO_MS / 2; // resto di partenza: lontano dalla soglia, niente tic doppi o saltati
const FERMO_COLPO = 4; // frame di pausa alla schiacciata (hit-stop)
const FERMO_MOSSA = 8; // frame di pausa alla mossa finale
// Colore di ogni personaggio per il nome della mossa (solo grafica)
const COLORI: Record<string, string> = {
  lani: '#c39bff',
  leo: '#4fc3f7',
  papa: '#ff8a65',
  mamma: '#f48fb1',
  nonno: '#aed581',
  allenatore: '#ffd54f',
  bart: '#ffb74d',
  lady: '#e1bee7',
};

type Scelta = { tu: string; cpu: string };
/** Dai due id scelti: figurine girate verso la rete, altezze, nomi, mosse. */
function squadraDi(sc: Scelta) {
  const ids = [sc.tu, sc.cpu] as const;
  const pg = ids.map((id) => PERSONAGGI[id] ?? P.personaggi.lani);
  const squadra: Squadra = {
    figure: [immagine(pg[0].figura), immagine(pg[1].figura)],
    // il lato 0 guarda a destra (verso la rete), il lato 1 a sinistra
    specchio: [pg[0].guarda === 'sx', pg[1].guarda === 'dx'],
    nomi: [pg[0].nome, pg[1].nome],
    colori: [COLORI[ids[0]] ?? '#ffe27a', COLORI[ids[1]] ?? '#ffe27a'],
  };
  const cm = ids.map((id) => ALTEZZE[id] ?? P.altezza_default_cm) as [number, number];
  const tipi = [pg[0].finisher, pg[1].finisher] as [TipoFinisher, TipoFinisher];
  return { squadra, cm, tipi, mosse: [pg[0].mossa, pg[1].mossa] };
}

export default function Gioco() {
  const [scelta, setScelta] = useState<Scelta | null>(null);
  const [tela, setTela] = useState<HTMLCanvasElement | null>(null);
  const [ing] = useState(nuoviIngressi);
  const [partita, setPartita] = useState(0);
  const [fine, setFine] = useState<[number, number] | null>(null);
  const [inPausa, setInPausa] = useState(false);
  const riprendi = useRef(() => {});
  const ferma = useRef(() => {});

  // Nell'APK (dalla 1.3) il gioco gira lo schermo da solo e uscendo lo rimette dritto: il resto di ACE
  // è verticale. Nel browser e negli APK vecchi il blocco non c'è: resta "Gira il telefono".
  useEffect(() => {
    void ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => {});
    return () => void ScreenOrientation.lock({ orientation: 'portrait' }).catch(() => {});
  }, []);

  useEffect(() => {
    const c = tela;
    const ctx = c?.getContext('2d', { alpha: false });
    if (!c || !ctx || !scelta) return;
    const { squadra, cm, tipi, mosse } = squadraDi(scelta);
    const verticale = matchMedia('(orientation: portrait)');
    const calmo = matchMedia('(prefers-reduced-motion: reduce)');
    const t: Tela = { ctx, fondale: null, hud: null, fondo: FONDO_RISERVA, misura: 0, squadra, calmo };
    let s = nuovaPartita(Date.now(), DURATA, cm, P.rete_cm, tipi, { carica: P.finisher });
    let vecchio = s;
    const vista = nuovaVista();
    const e = nuoviEffetti();
    let prima = performance.now();
    let resto = MEZZO_PASSO;
    let fermo = 0;
    let giro = 0;
    let pausa = false;
    let toccoVisto = s.tocco?.tic ?? -1;
    let mossaVista = s.finisher?.tic ?? -1;
    let puntiVisti: [number, number] = [0, 0];
    let acceso = false;
    let speciale = false;
    const [tu, cpu] = squadra.nomi;
    c.setAttribute('aria-label', `Campo di pallavolo, ${tu} 0 a 0 ${cpu}`);

    // Eventi del tic appena fatto: vibrazioni ed effetti. true = schiacciata o mossa, si ferma tutto un attimo.
    const eventi = (): boolean => {
      let colpo = false;
      const tc = s.tocco;
      if (tc && tc.tic !== toccoVisto) {
        toccoVisto = tc.tic;
        if (tc.lato === 0) vibra(tc.schiacciata ? 70 : 20);
        if (tc.schiacciata) {
          scoppio(e, s.palla.x, s.palla.y, calmo.matches ? 0 : TRAUMA_COLPO);
          fermo = FERMO_COLPO;
          colpo = true;
        }
      }
      const fn = s.finisher;
      if (fn && fn.tic !== mossaVista) {
        mossaVista = fn.tic;
        vibra(120);
        scoppio(e, s.palla.x, s.palla.y, calmo.matches ? 0 : TRAUMA_MOSSA, 32);
        e.fiamme = FIAMME;
        e.mossa = MOSSA_MS;
        e.mossaTesto = mosse[fn.lato];
        e.mossaColore = squadra.colori[fn.lato];
        e.mossaLato = fn.lato;
        fermo = FERMO_MOSSA;
        colpo = true;
      }
      if (s.punti[0] !== puntiVisti[0] || s.punti[1] !== puntiVisti[1]) {
        e.puntoLani = s.punti[0] !== puntiVisti[0];
        puntiVisti = [s.punti[0], s.punti[1]];
        vibra([45, 70, 45]);
        e.punto = PUNTO_MS;
        c.setAttribute('aria-label', `Campo di pallavolo, ${tu} ${s.punti[0]} a ${s.punti[1]} ${cpu}`);
      }
      return colpo;
    };

    const ciclo = (ora: number) => {
      // passo fisso: il tempo vero si accumula e si consuma a sessantesimi; dopo una pausa lunga non
      // si recupera più di un quarto di secondo. Durante la pausa della schiacciata il tempo non si
      // accumula: i tasti premuti restano in "premuti" e "visti" e li legge il primo tic dopo.
      const dt = Math.min(ora - prima, 250);
      prima = ora;
      let tic = false;
      if (pausa || verticale.matches) resto = MEZZO_PASSO;
      else if (fermo > 0) fermo -= dt / PASSO_MS;
      else resto += dt;
      while (resto >= PASSO_MS && fermo <= 0) {
        vecchio = s;
        s = passo(s, [leggi(ing), ia(s, 1, ERRORE_CPU)]);
        resto -= PASSO_MS;
        tic = true;
        if (eventi()) {
          // si resta fermi sul colpo: dopo la pausa si riparte da qui senza tornare indietro
          vecchio = s;
          resto = 0;
        }
      }
      if (tic) {
        const pronto = puoSchiacciare(s, 0);
        if (pronto !== acceso) {
          acceso = pronto;
          ing.bottoni.schiaccia?.classList.toggle('pronto', pronto);
        }
        const carico = puoSpeciale(s, 0);
        if (carico !== speciale) {
          speciale = carico;
          ing.bottoni.speciale?.classList.toggle('pronto', carico);
        }
      }
      // la scossa cala nel tempo vero, anche durante la pausa del colpo
      e.trauma = Math.max(0, e.trauma - (TRAUMA_CALO * dt) / 1000);
      e.tempoScossa += (dt / 1000) * 30;
      interpola(vista, vecchio, s, resto / PASSO_MS);
      disegna(c, t, s, vista, e, fermo > 0 || pausa ? 0 : dt / PASSO_MS, ora);
      if (s.vincitore === null) giro = requestAnimationFrame(ciclo);
      else setFine(s.punti);
    };
    giro = requestAnimationFrame(ciclo);

    // finestra lasciata con un tasto giù: il keyup non arriva più. Anche i tocchi brevi in memoria si
    // dimenticano: dopo una pausa non parte un salto vecchio.
    const via = () => {
      TASTI.forEach((tt) => [...ing.premuti[tt]].forEach((chi) => lascia(ing, tt, chi)));
      ing.dita.clear();
      ing.visti.clear();
    };
    // Pausa (pulsante, P o Esc, pagina in secondo piano): i tic si fermano e i tasti si lasciano;
    // alla ripresa il tempo riparte da lì, così la palla non salta.
    ferma.current = () => {
      if (pausa || s.vincitore !== null) return;
      pausa = true;
      via();
      setInPausa(true);
    };
    riprendi.current = () => {
      pausa = false;
      via();
      prima = performance.now();
      resto = MEZZO_PASSO;
      setInPausa(false);
    };
    const tasto = (giu: boolean) => (ev: KeyboardEvent) => {
      if (giu && (ev.code === 'KeyP' || ev.code === 'Escape')) {
        if (ev.repeat) return;
        ev.preventDefault();
        (pausa ? riprendi : ferma).current();
        return;
      }
      const tt = TASTIERA[ev.code];
      if (!tt) return;
      ev.preventDefault();
      if (!giu) lascia(ing, tt, ev.code);
      else if (!ev.repeat && !pausa) premi(ing, tt, ev.code);
    };
    const su = tasto(false);
    const giu = tasto(true);
    const visibile = () => {
      if (document.visibilityState === 'hidden') ferma.current();
    };
    addEventListener('keydown', giu);
    addEventListener('keyup', su);
    addEventListener('blur', via);
    document.addEventListener('visibilitychange', visibile);
    return () => {
      cancelAnimationFrame(giro);
      removeEventListener('keydown', giu);
      removeEventListener('keyup', su);
      removeEventListener('blur', via);
      document.removeEventListener('visibilitychange', visibile);
      via();
      ing.bottoni.schiaccia?.classList.remove('pronto');
      ing.bottoni.speciale?.classList.remove('pronto');
      setInPausa(false);
    };
  }, [tela, ing, partita, scelta]);

  if (!scelta) return <Selezione onGioca={setScelta} />;

  const pg = PERSONAGGI[scelta.tu] ?? P.personaggi.lani;
  const nomi = [pg.nome, (PERSONAGGI[scelta.cpu] ?? P.personaggi.leo).nome];
  const frecce = croce(ing);
  return (
    <main className="gioco" onContextMenu={(ev) => ev.preventDefault()}>
      <canvas ref={setTela} aria-label="Campo di pallavolo" />
      <div className="gioco-croce" role="group" aria-label="Corri: tocca a sinistra o a destra" title="Corri (frecce o A e D)" {...frecce.zona}>
        <span className="gioco-freccia" ref={frecce.frecce.sx}>
          <CaretLeft size={54} weight="bold" aria-hidden />
        </span>
        <span className="gioco-freccia" ref={frecce.frecce.dx}>
          <CaretRight size={54} weight="bold" aria-hidden />
        </span>
      </div>
      <div className="gioco-tasti">
        {/* mossa finale: si vede solo a barra piena (classe "pronto" messa dal ciclo) */}
        <button type="button" className="gioco-speciale" aria-label={`Mossa finale: ${pg.mossa}`} title="Mossa finale (L)" {...comando(ing, 'speciale')}>
          <Fire size={34} weight="fill" aria-hidden />
          {pg.mossa}
        </button>
        <button type="button" className="gioco-schiaccia" title="Schiaccia (K)" {...comando(ing, 'schiaccia')}>
          <HandFist size={40} weight="fill" aria-hidden />
          Schiaccia
        </button>
        <button type="button" className="gioco-salta" title="Salta (spazio o freccia su)" {...comando(ing, 'salta')}>
          <ArrowFatUp size={40} weight="fill" aria-hidden />
          Salta
        </button>
      </div>
      <button type="button" className="gioco-ferma" aria-label="Pausa" title="Pausa (P o Esc)" onClick={() => ferma.current()}>
        <Pause size={28} weight="fill" aria-hidden />
      </button>
      <p className="gioco-gira">Gira il telefono</p>
      {inPausa && !fine && (
        <div className="gioco-velo" role="dialog" aria-label="Pausa">
          <h1>Pausa</h1>
          <button type="button" className="principale" onClick={() => riprendi.current()}>
            Continua
          </button>
          {schermoPossibile() && (
            <button type="button" onClick={() => schermoIntero(true)}>
              Schermo intero
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              // il gioco si sceglie all'avvio da #gioco (main.tsx): senza, ricaricando si torna ad ACE
              if (location.hash === '#gioco') {
                location.hash = '';
                location.reload();
              } else history.back();
            }}
          >
            Esci
          </button>
        </div>
      )}
      {fine && (
        <div className="gioco-fine" role="dialog" aria-label="Partita finita">
          <h1>Partita finita</h1>
          <p>
            {nomi[0]} {fine[0]} · {fine[1]} {nomi[1]}
          </p>
          <div className="gioco-fine-scelte">
            <button
              type="button"
              className="principale"
              onClick={() => {
                setFine(null);
                setPartita((n) => n + 1);
              }}
            >
              Ancora
            </button>
            <button
              type="button"
              className="secondario"
              onClick={() => {
                setFine(null);
                setScelta(null);
              }}
            >
              Cambia personaggi
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
