// Passi: l'unica strada da un evento ai passi, condivisa dalla Edge Function "passi" e dal
// simulatore dell'anno (scripts/simulatore). Riceve il client del database come parametro.
//
// Si rilegge la riga dal database, si applicano le regole di src/lib/regole (numeri da
// data/config-gioco.json) e si chiama registra_passi, che è idempotente: richiamarla non dà mai
// passi doppi. Chi chiama non conta: conta lo stato del database (il foglio consegnato, per
// esempio, lo può segnare solo un genitore).
//
// Il moltiplicatore della rimonta non si applica qui: si sa solo la domenica sera se la settimana
// ha preso la prima chiave (chiavi.ts).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import * as R from '../../../src/lib/regole/index.ts';
import * as C from '../../../src/lib/calendario/index.ts';
import * as K from '../../../src/lib/copione/index.ts';
import { aggiornaForzieri } from './forzieri.ts';
import { accoda } from './popup.ts';

const COSA_GESTO: Record<string, string> = {
  scrivania: 'scrivania in ordine',
  lavastoviglie: 'lavastoviglie fatta',
  letto: 'letto fatto',
  vestiti: 'vestiti in ordine',
};

const P = R.CONFIG.passi;

export type Esito = { passi: number; motivo?: string; perche?: string };
const niente = (perche: string): Esito => ({ passi: 0, perche });

/** Richiesta sbagliata (riga che non c'è, tipo sconosciuto): 400, non errore del server. */
export class Richiesta extends Error {}

// Righe di tabelle diverse e filtri del query builder: qui si leggono senza schema (i tipi generati
// del database li usa il client dell'app; per le funzioni è un passo successivo).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Libero = any;

/** I gestori dei tipi di evento, sul database dato. */
export function creaGestori(db: SupabaseClient) {
  // ---------------------------------------------------------------- accesso al database

  async function riga(tabella: string, colonna: string, valore: string, colonne = '*') {
    const { data, error } = await db.from(tabella).select(colonne).eq(colonna, valore).maybeSingle();
    if (error) throw error;
    if (!data) throw new Richiesta(`${tabella}: ${valore} non trovato`);
    return data as Record<string, Libero>;
  }

  async function movimento(motivo: string, riferimento: string) {
    const { data, error } = await db
      .from('movimenti_passi')
      .select('giorno')
      .eq('motivo', motivo)
      .eq('riferimento', riferimento)
      .maybeSingle();
    if (error) throw error;
    return data as { giorno: string } | null;
  }

  async function chiaviGiaDate(g: Date): Promise<boolean> {
    const { data, error } = await db.from('settimane').select('chiavi').eq('inizio', R.iso(R.lunedi(g))).maybeSingle();
    if (error) throw error;
    return data?.chiavi != null;
  }

  async function conta(tabella: string, filtri: (q: Libero) => Libero): Promise<number> {
    const { count, error } = await filtri(db.from(tabella).select('*', { count: 'exact', head: true }));
    if (error) throw error;
    return count ?? 0;
  }

  async function registra(motivo: string, riferimento: string, passi: number, g: Date, datoDa?: string): Promise<Esito> {
    if (passi === 0) return niente('non dà passi');
    const { data, error } = await db.rpc('registra_passi', {
      p_motivo: motivo,
      p_riferimento: riferimento,
      p_passi: passi,
      p_giorno: R.iso(g),
      p_dato_da: datoDa ?? null,
    });
    if (error) throw error;
    return data ? { passi, motivo } : niente('già registrato');
  }

  /** Borsa: domani (giorno dopo la sera) c'è un allenamento o una partita di Lani nel calendario. */
  async function borsaServe(sera: Date): Promise<boolean> {
    const da = new Date(sera);
    da.setDate(da.getDate() + 1);
    const a = new Date(da);
    a.setDate(a.getDate() + 1);
    // ponytail: giorno di Roma approssimato in UTC (±1 ora): gli allenamenti non sono a mezzanotte.
    const { data, error } = await db
      .from('impegni_famiglia')
      .select('titolo')
      .gte('inizio', `${R.iso(da)}T00:00:00+01:00`)
      .lt('inizio', `${R.iso(a)}T00:00:00+01:00`);
    if (error) throw error;
    return C.serveBorsa((data ?? []).map((x) => x.titolo));
  }

  /**
   * Studio facoltativo: solo con i compiti per domani spuntati e fino a 4 al giorno per tipo.
   * Il limite non si conta: ogni giro prova le caselle del giorno ("flashcard:2026-11-24:1".."4") e
   * registra_passi, con la chiave unica, lascia passare un solo movimento per casella.
   * ponytail: lo stesso giro inviato due volte prende due caselle; l'app lo invia una volta sola.
   */
  async function registraStudio(tipo: R.TipoStudio, g: Date, passi: number): Promise<Esito> {
    const mancanti = await conta('compiti', (q) => q.eq('scadenza', R.iso(R.prossimoGiornoDiScuola(g))).is('fatto_il', null));
    if (!R.studioConta(tipo, 0, mancanti === 0)) return niente('compiti da finire');
    for (const casella of R.caselleStudio(tipo, R.iso(g))) {
      const esito = await registra(tipo, casella, passi, g);
      if (esito.passi) return esito;
    }
    return niente(`${tipo}: giri di oggi finiti`);
  }

  // ---------------------------------------------------------------- un gestore per tipo di evento

  const gestori: Record<string, (id: string) => Promise<Esito>> = {
    async compito(id) {
      const c = await riga('compiti', 'id', id);
      if (!c.fatto_il) return niente('non spuntato');
      const g = R.giornoRoma(c.fatto_il);
      if (!R.compitoInTempo(R.giorno(c.scadenza), g)) return niente('spuntato dopo la scadenza');
      const storno = await movimento('storno', `compito:${id}`);
      if (!storno) return registra('compito', id, R.passiCompito(R.giorno(c.scadenza), g), g);
      // Rispuntato dopo uno storno: passi base, una volta, nella settimana dello storno e prima delle chiavi.
      const stessaSettimana = R.iso(R.lunedi(g)) === R.iso(R.lunedi(R.giorno(storno.giorno)));
      const passi = R.passiCompitoRifatto({
        stornato: true,
        giaRifatto: (await movimento('compito_rifatto', id)) !== null,
        chiaviSettimanaGiaDate: !stessaSettimana || (await chiaviGiaDate(g)),
      });
      return registra('compito_rifatto', id, passi, g);
    },

    // id = data della serata ('YYYY-MM-DD'): cartella e borsa (dieci minuti con lo sprint 2).
    // Ognuna vale solo se spuntata quella sera; registra_passi è idempotente, quindi si
    // può richiamare dopo ogni spunta.
    async serata(id) {
      const s = await riga('serate', 'data', id);
      const g = R.giorno(s.data);
      const quellaSera = (t: string | null) => !!t && R.iso(R.giornoRoma(t)) === s.data;
      let passi = 0;
      if (quellaSera(s.cartella_il) && R.cartellaConta(g))
        passi += (await registra('cartella', `serata:${s.data}`, P.obbligatori.cartella, g)).passi;
      if (quellaSera(s.borsa_il) && (await borsaServe(g)))
        passi += (await registra('borsa', `serata:${s.data}`, P.obbligatori.borsa, g)).passi;
      return passi ? { passi, motivo: 'serata' } : niente('niente di nuovo');
    },

    async foglio(id) {
      const f = await riga('fogli_firma', 'id', id);
      if (!f.consegnato_il) return niente('consegna non confermata da un genitore');
      return registra('foglio', id, P.obbligatori.fogli, R.giornoRoma(f.consegnato_il));
    },

    async ripasso(id) {
      const s = await riga('sessioni_ripasso', 'id', id, 'fatta_il, verifiche(data)');
      if (!s.fatta_il) return niente('non fatta');
      const g = R.giornoRoma(s.fatta_il);
      if (!R.ripassoInTempo(R.giorno(s.verifiche.data), g)) return niente('fatta dopo la verifica');
      return registra('ripasso', id, P.obbligatori.ripasso, g);
    },

    async flashcard(id) {
      const giro = await riga('flashcard_giri', 'id', id);
      const g = R.giornoRoma(giro.fatto_il);
      if (!R.giroValido(new Date(giro.iniziato_il), new Date(giro.fatto_il), giro.carte))
        return niente('carte girate troppo in fretta');
      return registraStudio('flashcard', g, P.studio_facoltativo.flashcard_giro);
    },

    async quiz(id) {
      const t = await riga('quiz_tentativi', 'id', id);
      const g = R.giornoRoma(t.fatto_il);
      // le domande sbagliate diventano flash card (una carta uguale non si duplica)
      if (t.sbagliate?.length) {
        const q = await riga('quiz', 'id', t.quiz_id);
        const carte = t.sbagliate
          .map((n: number) => q.domande[n])
          .filter(Boolean)
          .map((d: { testo: string; opzioni: string[]; giusta: number; spiegazione: string }) => ({
            materia_id: q.materia_id,
            argomento: q.argomento,
            verifica_id: q.verifica_id,
            tipo: 'domanda',
            fronte: d.testo,
            retro: `${d.opzioni[d.giusta]}. ${d.spiegazione}`,
            fonte: 'quiz_sbagliato',
          }));
        const { error } = await db.from('flashcard').upsert(carte, { onConflict: 'materia_id,fronte', ignoreDuplicates: true });
        if (error) throw error;
      }
      return registraStudio('quiz', g, R.passiQuiz(t.numero, t.giuste, t.totale));
    },

    async video(id) {
      const v = await riga('video_visti', 'id', id, '*, video(durata_secondi)');
      const g = R.giornoRoma(v.visto_il);
      if (!R.videoValido(v.completo, v.secondi_visti, v.video?.durata_secondi)) return niente('video non visto tutto');
      return registraStudio('video', g, P.studio_facoltativo.video_completo);
    },

    // id = richiesta di foto: con almeno una foto caricata la richiesta è fatta; i passi vanno a Lani
    // solo se una foto è sua (una volta per richiesta). Una foto cancellata riapre la richiesta e
    // storna il +2 (trigger foto_cancellata, 0027): contano solo le foto dopo l'ultimo storno, e il
    // riferimento cambia a ogni storno (richiesta, richiesta:1, ...) così il +2 rifatto torna una volta.
    async foto(id) {
      const r = await riga('richieste_foto', 'id', id);
      const { data: storni, error: es } = await db
        .from('movimenti_passi')
        .select('creato_il')
        .eq('motivo', 'storno')
        .like('riferimento', `foto:${id}%`) // "foto:<richiesta>" e "foto:<richiesta>:1"...
        .order('creato_il', { ascending: false });
      if (es) throw es;
      const dopo = storni?.[0]?.creato_il ?? '1970-01-01T00:00:00Z';
      const { data: foto, error } = await db.from('foto_pagine').select('caricata_da, caricata_il, profili(ruolo)').eq('richiesta_id', id).gt('caricata_il', dopo).order('caricata_il');
      if (error) throw error;
      if (!foto?.length) return niente('nessuna foto caricata');
      if (r.stato !== 'fatta') {
        const { error: e } = await db.from('richieste_foto').update({ stato: 'fatta' }).eq('id', id);
        if (e) throw e;
      }
      const diLani = foto.find((x) => (x.profili as unknown as { ruolo: string } | null)?.ruolo === 'lani');
      const passi = R.passiFoto({ richiestaDaAce: true, caricataDaLani: !!diLani });
      const rif = storni?.length ? `${id}:${storni.length}` : id;
      return diLani ? registra('foto', rif, passi, R.giornoRoma(diLani.caricata_il)) : niente('foto dei genitori: richiesta chiusa');
    },

    async gesto(id) {
      const ge = await riga('gesti_casa', 'id', id);
      // tetto giornaliero sui passi dei gesti già dati quel giorno. Prima si contavano i gesti con
      // creato_il minore: due gesti nello stesso istante (doppio tocco, due genitori insieme) non si
      // vedevano e il tetto saltava (trovato dal simulatore dell'anno).
      // ponytail: due chiamate davvero simultanee possono ancora leggere lo stesso totale; serve un
      // lock per giorno se mai capita.
      const { data: dati, error } = await db.from('movimenti_passi').select('passi').eq('motivo', 'gesto').eq('giorno', ge.data);
      if (error) throw error;
      // un gesto per voce al giorno: la stessa voce segnata da mamma e da papà vale una volta
      const { data: stessi, error: e2 } = await db.from('gesti_casa').select('id').eq('voce', ge.voce).eq('data', ge.data).neq('id', id);
      if (e2) throw e2;
      const presa = !!stessi?.length && (await conta('movimenti_passi', (q) => q.eq('motivo', 'gesto').gt('passi', 0).in('riferimento', stessi.map((x) => x.id)))) > 0;
      const passi = R.passiNuovoGesto((dati ?? []).reduce((s, m) => s + m.passi, 0), ge.voce, presa);
      const esito = await registra('gesto', id, passi, R.giorno(ge.data), ge.dato_da);
      if (esito.passi) {
        const chi = await riga('profili', 'id', ge.dato_da, 'nome');
        await accoda(db, `gesto:${id}`, /mamma/i.test(chi.nome) ? 'gesto_mamma' : 'gesto_papa', { passi: esito.passi, cosa: COSA_GESTO[ge.voce] ?? ge.voce });
      }
      return esito;
    },

    async sgridata(id) {
      const s = await riga('sgridate', 'id', id);
      if (!['bagno', 'antisportivo', 'balla'].includes(s.tipo)) throw new Richiesta(`sgridata sconosciuta: ${s.tipo}`);
      const esito = await registra('sgridata', id, R.passiSgridata(s.tipo), R.giorno(s.data), s.dato_da);
      if (esito.passi) {
        const meno = String(esito.passi).replace('-', '−');
        let chiave: K.ChiavePopup = s.tipo === 'balla' ? 'balla' : 'antisportivo';
        if (s.tipo === 'bagno') {
          // la seconda e la terza volta nella settimana parlano Lady e Leo
          const volte = await conta('sgridate', (q) => q.eq('tipo', 'bagno').gte('data', R.iso(R.lunedi(R.giorno(s.data)))).lte('data', s.data));
          const chi = await riga('profili', 'id', s.dato_da, 'nome');
          chiave = volte >= 3 ? 'bagno_3' : volte === 2 ? 'bagno_2' : /mamma/i.test(chi.nome) ? 'bagno_mamma' : 'bagno_papa';
        }
        await accoda(db, `sgridata:${id}`, chiave, { passi: meno, cosa: s.nota ?? 'una cosa non vera' });
      }
      return esito;
    },
  };

  return gestori;
}

/** Un evento ai passi: gestore del tipo, poi i forzieri se i passi sono cambiati. */
export async function eseguiPassi(db: SupabaseClient, gestori: ReturnType<typeof creaGestori>, tipo: unknown, id: unknown) {
  // solo i gestori veri: niente "constructor" o "toString" ereditati dagli oggetti
  const gestore = typeof tipo === 'string' && Object.hasOwn(gestori, tipo) ? gestori[tipo] : undefined;
  if (!gestore || typeof id !== 'string' || id.length > 100) throw new Richiesta('tipo o id non validi');
  const esito = await gestore(id);
  // passi nuovi: forse si è arrivati a una tappa con forziere
  const forzieri = esito.passi ? await aggiornaForzieri(db, esito.passi) : [];
  return { ...esito, forzieri };
}
