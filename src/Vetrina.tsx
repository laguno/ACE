import { useState } from 'react';
import { Sticker } from './kit';
import { Contapassi } from './Contapassi';
import { MOMENTO_DEL_POPUP } from './Frase';
import FRASI from '../data/frasi.json' with { type: 'json' };
import TIPI from '../data/enigmi.json' with { type: 'json' };
import { Biglietto } from './Biglietto';
import * as K from './lib/copione';
import * as R from './lib/regole';
import { PopupVista, type Popup } from './Popup';
import { regolaQuiz } from './Ripasso';

// Vetrina (area genitori): tutti i popup del copione e le notifiche come li vedrà Lani, con numeri
// di esempio presi dal config. Solo dati finti: niente letture né scritture nel database.

const P = R.CONFIG.passi;
// i passi tolti col segno meno vero, come li scrive il server ("−20")
const M = Object.fromEntries(Object.entries(P.malus).map(([k, v]) => [k, String(v).replace('-', '−')])) as Record<keyof typeof P.malus, string>;
const PRIMO_COSTO = R.CONFIG.percorso.costi_tappe[1];
const SALDO_PRIMA = 725;

/** Numeri ed esempi per riempire i {segnaposto}: i passi vengono dal config, il resto è inventato. */
const ESEMPI: Partial<Record<K.ChiavePopup, Record<string, string | number>>> = {
  voto_recupero: { materia: 'Matematica', passi: P.voti.recupero_dopo_insufficienza },
  voto_migliorato: { materia: 'Inglese', prima: '6', voto: '7½', passi: P.voti.migliorato_almeno_6 },
  voto_9: { materia: 'Scienze', voto: '9' },
  voto_7: { materia: 'Storia', voto: '7', passi: P.voti['7'], n: 3 },
  voto_7_senza_ripasso: { materia: 'Storia', voto: '7', passi: P.voti['7'] },
  voto_6: { materia: 'Geografia', voto: '6' },
  voto_insufficiente: { materia: 'Matematica', voto: '5' },
  voto_insufficiente_ancora: { materia: 'Matematica' },
  nota_disciplinare: { materia: 'Italiano', passi: M.nota_disciplinare },
  nota_terza_dimenticanza: { passi: M.note_dimenticanza_ogni_3 },
  nota_merito: { materia: 'Arte', passi: P.nota_merito },
  gesto_papa: { passi: P.gesti_casa.voci.lavastoviglie, cosa: 'lavastoviglie svuotata' },
  gesto_mamma: { passi: P.gesti_casa.voci.letto, cosa: 'letto rifatto' },
  bagno_papa: { passi: M.bagno },
  bagno_mamma: { passi: M.bagno },
  bagno_2: { passi: M.bagno },
  bagno_3: { passi: M.bagno },
  antisportivo: { passi: M.antisportivo },
  balla: { cosa: 'compiti fatti, ma non era vero', passi: M.balla_o_imbroglio },
  partita_vinta: { risultato: '3-1', passi: P.partite.giocata + P.partite.vinta_in_piu },
  partita_persa: { risultato: '1-3', passi: P.partite.giocata },
  tappa: { tappa: 2, mancano_passi: PRIMO_COSTO },
  enigma_comparso: { n: R.CONFIG.enigma.tentativi },
  forziere_lucchetto: { n: 1 },
  forziere_aperto: { premio: 'una serata al cinema' },
  chiavi_1: { cosa: 'i compiti di giovedì' },
  chiavi_2: { cosa: 'nessuna dimenticanza' },
  verifica_nuova: { materia: 'Tecnologia', giorno: 'lunedì 16', n: 4 },
  verifica_nuova_una: { materia: 'Tecnologia', giorno: 'domani' },
  figurina_nera: { nome: 'Lady dispettosa' },
};

/** Riga della figurina negli esempi dove nasce lo sblocco (sul server: la prima volta che compare una posa). */
const FIGURINE: Partial<Record<K.ChiavePopup, string>> = {
  tappa: 'Nuova figurina: Lani contenta. Album 12/64.',
  forziere_aperto: 'Nuova figurina: Leo tennis. Album 13/64.',
  cima: 'Nuova figurina: Lani cima. Album 64/64.',
};

const GRUPPI: [string, K.ChiavePopup[]][] = [
  ['Lodi', ['voto_recupero', 'voto_migliorato', 'voto_9', 'voto_7', 'voto_7_senza_ripasso', 'voto_6', 'gesto_papa', 'gesto_mamma']],
  ['Voti sotto il 6', ['voto_insufficiente', 'voto_insufficiente_ancora']],
  ['Rimproveri', ['nota_disciplinare', 'nota_terza_dimenticanza', 'bagno_papa', 'bagno_mamma', 'bagno_2', 'bagno_3', 'antisportivo', 'balla']],
  ['Nota di merito', ['nota_merito']],
  ['Partite (sprint 2)', ['partita_vinta', 'partita_persa']],
  ['Tappe', ['tappa', 'cima']],
  ['Forzieri', ['forziere_aperto']],
  ['Lucchetto', ['forziere_lucchetto']],
  ['Enigma', ['enigma_comparso']],
  ['Chiavi della domenica', ['chiavi_0', 'chiavi_1', 'chiavi_2', 'chiavi_3']],
  ['Riscatto', ['figurina_nera']],
  ['Verifiche', ['verifica_nuova', 'verifica_nuova_una']],
];
// una riga nuova del copione non resta fuori dalla Vetrina
const ELENCATE = new Set(GRUPPI.flatMap(([, c]) => c));
const ALTRE = (Object.keys(K.POPUP) as K.ChiavePopup[]).filter((c) => !ELENCATE.has(c));
if (ALTRE.length) GRUPPI.push(['Altri', ALTRE]);

/** Frase di esempio per i popup che la possono portare (dal vero si vede solo se è la prima del giorno). */
function fraseEsempio(chiave: K.ChiavePopup) {
  const m = MOMENTO_DEL_POPUP[chiave];
  const f = m && FRASI.frasi.find((x) => x.momento === m);
  return f ? { testo: f.testo, autore: f.autore } : null;
}

function esempio(chiave: K.ChiavePopup): Popup {
  const c = K.componi(chiave, ESEMPI[chiave]);
  return { id: chiave, situazione: chiave, priorita: c.priorita, posa: c.posa, titolo: c.titolo, testo: c.testo, figurina: FIGURINE[chiave] ?? null, frase: fraseEsempio(chiave) };
}

const ANIMAZIONI: [string, K.ChiavePopup][] = [
  ['Tappa raggiunta', 'tappa'],
  ['Forziere che si apre, con i coriandoli', 'forziere_aperto'],
  ['Lucchetto', 'forziere_lucchetto'],
  ['Cima', 'cima'],
  ['Sblocco della figurina (riga Album n/64)', 'tappa'],
];

const NOTIFICHE: [string, string][] = [
  ['7:00', K.notifica('mattina', { cose: 'verifica di tecnologia, borsa di pallavolo' }).testo],
  ['7:00, giorno di partita', K.notifica('mattina_partita', { ora: '17:30' }).testo],
  ['7:00, giorno tranquillo', K.notifica('mattina_tranquilla').testo],
  ['14:45, compiti nuovi', K.notifica('compiti_nuovi', { n: 3, materia: 'Matematica' }).testo],
  ['Ora della chiusura (es. 20:30)', K.notifica('chiusura').testo],
  ['Domenica, chiusura delle 20:00', K.notifica('chiusura_domenica').testo],
  [`Sollecito, ${R.CONFIG.notifiche.sollecito_dopo_minuti} minuti dopo`, K.notifica('sollecito', { n: 2 }).testo],
  ['Domenica 21:45, ai genitori', K.notifica('genitori_riepilogo', { chiavi: 2 }).testo],
  ['Dopo la sincronizzazione, ai genitori', K.notifica('genitori_foto', { cosa: 'Verifica', materia: 'Scienze', pagine: '120–124' }).testo],
  ['Più richieste nello stesso giro', K.notifica('genitori_foto_tante', { n: 3 }).testo],
];

export default function Vetrina() {
  const [aperto, setAperto] = useState<{ p: Popup; n: number }>();
  const guarda = (chiave: K.ChiavePopup) => setAperto((a) => ({ p: esempio(chiave), n: (a?.n ?? 0) + 1 }));
  // 0: fermo; a ogni "Guarda" il contatore riparte dal vecchio saldo (tre compiti fatti)
  const [saldo, setSaldo] = useState(0);

  return (
    <>
      <p className="nota">
        Come li vedrà Lani, con numeri di esempio. Qui non si scrive niente. Al massimo {R.CONFIG.notifiche.max_al_giorno} notifiche al giorno più{' '}
        {R.CONFIG.notifiche.solleciti} sollecito; dopo le {R.CONFIG.notifiche.silenzio_rimproveri_dopo} i rimproveri di mamma e papà aspettano il mattino.
      </p>

      <div className="carta">
        <h2>Animazioni</h2>
        <ul className="vetrina">
          {ANIMAZIONI.map(([nome, chiave]) => (
            <li key={nome}>
              <span>{nome}</span>
              <button className="secondario compatto" onClick={() => guarda(chiave)} aria-label={`Guarda: ${nome}`}>
                Guarda
              </button>
            </li>
          ))}
          <li>
            <span>
              Passi che salgono
              <small>Su Oggi e Astra, se il saldo è cambiato da quando Lani l'ha visto.</small>
            </span>
            <span className="saldo vetrina-saldo">
              <img src="/assets/oggetti/passo.webp" alt="" width={30} height={30} />
              <Contapassi key={saldo} prima={SALDO_PRIMA} adesso={saldo ? SALDO_PRIMA + 3 * P.obbligatori.compiti : SALDO_PRIMA} />
            </span>
            <button className="secondario compatto" onClick={() => setSaldo((n) => n + 1)} aria-label="Guarda: Passi che salgono">
              Guarda
            </button>
          </li>
        </ul>
      </div>

      {GRUPPI.map(([gruppo, chiavi]) => (
        <div className="carta" key={gruppo}>
          <h2>{gruppo}</h2>
          <ul className="vetrina">
            {chiavi.map((chiave) => {
              const p = esempio(chiave);
              return (
                <li key={chiave}>
                  <Sticker posa={p.posa} misura={52} />
                  <span>
                    <b>{p.titolo}</b>
                    <small>{p.testo}</small>
                  </span>
                  <button className="secondario compatto" onClick={() => guarda(chiave)} aria-label={`Guarda: ${p.titolo} (${chiave})`}>
                    Guarda
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="carta">
        <h2>Enigmi dei forzieri</h2>
        <p className="nota">
          Un tipo per forziere, sempre più difficili. Esempi con premi inventati; l'aiutino compare a Lani dopo il primo tentativo sbagliato.
        </p>
        <div className="vetrina-enigmi">
          {TIPI.tipi.map((t) => (
            <details key={t.forziere}>
              <summary>
                {t.forziere === 9 ? 'Cima' : `Forziere ${t.forziere}`}: {t.nome}
              </summary>
              <Biglietto testo={t.esempio.enigma} aiutino={t.esempio.aiutino} />
              <p className="nota">Esempio per: {t.esempio.premio}. Risposte accettate: {t.esempio.soluzione}.</p>
            </details>
          ))}
        </div>
      </div>

      <div className="carta">
        <h2>Regole dello studio</h2>
        <p className="nota">
          Flash card: +{P.studio_facoltativo.flashcard_giro} passi a giro, fino a {P.studio_facoltativo.max_al_giorno_per_tipo} giri al giorno, solo con i compiti spuntati.
        </p>
        <p className="nota">Quiz: {regolaQuiz()} Lani vede solo la forma corta.</p>
      </div>

      <div className="carta">
        <h2>Notifiche</h2>
        <ul className="vetrina notifiche-anteprima">
          {NOTIFICHE.map(([quando, testo]) => (
            <li key={quando}>
              <span>
                <small>{quando}</small>
                <b>ACE</b>
                {testo}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* la chiave cambia a ogni "Guarda": l'entrata e i coriandoli ripartono */}
      {aperto && <PopupVista key={aperto.n} p={aperto.p} chiudi={() => setAperto(undefined)} />}
    </>
  );
}
