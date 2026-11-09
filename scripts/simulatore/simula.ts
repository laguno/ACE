// Simulatore di un anno di scuola (filone B del piano): una Lani finta vive dal 23/11/2026 al
// 4/6/2027, giorno per giorno, sul database PGlite con le migrazioni vere e con il codice vero dei
// passi, delle chiavi, di voti e note e dei forzieri (supabase/functions/_shared). Ogni giorno si
// controllano gli invarianti; al primo che non regge il simulatore si ferma con giorno e dettaglio.
// L'ora la decide l'orologio dato (Date finto): segue anche il database, perché PGlite legge
// l'ora da Date.now.
import type { PGlite } from '@electric-sql/pglite';
import type { SupabaseClient } from '@supabase/supabase-js';
import manifest from '../../data/manifest.json' with { type: 'json' };
import * as C from '../../src/lib/calendario/index.ts';
import { casuale } from '../../src/lib/enigmi/index.ts';
import * as R from '../../src/lib/regole/index.ts';
import { contaChiavi } from '../../supabase/functions/_shared/chiavi.ts';
import { creaGestori, eseguiPassi } from '../../supabase/functions/_shared/passi.ts';
import { passiEForzieri } from '../../supabase/functions/_shared/voti.ts';
// @ts-expect-error modulo JavaScript senza tipi
import { creaDatabase, LANI, PAPA } from '../supabase-finto.mjs';
import { client } from './database.ts';

// ---------------------------------------------------------------- profili

export type Profilo = {
  nome: string;
  descrizione: string;
  seme: number;
  /** Probabilità di fare una cosa obbligatoria in quel giorno. */
  impegno: (d: Date, settimana: number) => number;
  /** Spunta compiti non fatti, si fa stornare, prova caselle in più. */
  furbetta?: boolean;
};

const crisi = (d: Date) => {
  const s = R.iso(d);
  if (s >= '2027-01-07' && s < '2027-02-15') return 0.4;
  return s >= '2027-02-15' ? 0.92 : 0.8;
};

export const PROFILI: Profilo[] = [
  { nome: 'diligente', descrizione: 'fa il 95% delle cose', seme: 11, impegno: () => 0.95 },
  { nome: 'normale', descrizione: "fa l'80% delle cose", seme: 22, impegno: () => 0.8 },
  { nome: 'altalenante', descrizione: 'settimane buone (95%) e storte (50%) a giro', seme: 33, impegno: (_d, s) => (s % 2 ? 0.5 : 0.95) },
  { nome: 'crisi', descrizione: 'normale fino a gennaio, in crisi (40%) dal 7/1 al 14/2, poi in rimonta (92%)', seme: 44, impegno: crisi },
  { nome: 'furbetta', descrizione: 'fa il 70%, spunta compiti non fatti e prova caselle e passi in più', seme: 55, impegno: () => 0.7, furbetta: true },
];

// ---------------------------------------------------------------- uscita

type Giorno = { giorno: string; saldo: number; bandierina: number; tappa: number; motivi: Record<string, number> };
export type Risultato = {
  profilo: Profilo;
  giorni: Giorno[];
  settimane: { inizio: string; chiavi: number; rimonta: boolean; possibili: number; fatte: number; note: number }[];
  forzieri: { n: number; enigma: string | null; aperto: string | null }[];
  cima: string | null;
  figurine: number;
  popup: number;
};

class Invariante extends Error {}

// ---------------------------------------------------------------- simulazione

const MATERIE = ['italiano', 'matematica', 'inglese', 'scienze', 'storia', 'tecnologia'];
const VOCI = ['scrivania', 'lavastoviglie', 'letto', 'vestiti'];
const ALBUM = manifest.avatar.filter((a) => a.personaggio !== 'allenatore');
const TONO = new Map(manifest.avatar.map((a) => [a.id, a.tono]));
const piu = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** Istante di Roma per un giorno e un'ora (il processo gira con TZ=Europe/Rome). */
const alle = (d: Date, ora: string) => new Date(`${R.iso(d)}T${ora}:00`);
const parole = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/**
 * Fa vivere il profilo da `da` ad `a` (compresi). `orologio` sposta l'ora di tutto (codice e
 * database). Lancia Invariante al primo controllo che non regge.
 */
export async function simula(profilo: Profilo, orologio: (t: Date) => void, da = R.CONFIG.periodo.inizio, a = R.CONFIG.periodo.fine): Promise<Risultato> {
  const rng = casuale(profilo.seme);
  const caso = (p: number) => rng() < p;
  orologio(alle(piu(R.giorno(da), -3), '12:00'));
  const { db: pg, come } = (await creaDatabase()) as { db: PGlite; come: (uid: string | null, sql: string) => Promise<{ rows: unknown[] }> };
  await pg.exec(`set timezone = 'UTC'`);
  const db = client(pg) as unknown as SupabaseClient;
  const gestori = creaGestori(db);
  const passi = (tipo: string, id: string) => eseguiPassi(db, gestori, tipo, id);
  const una = async <T>(sql: string): Promise<T> => (await pg.query<{ v: T }>(sql)).rows[0]?.v as T;

  // ---- preparazione: materie, premi, allenamenti (martedì e giovedì) e partite (sabato) per tutto l'anno
  for (const m of MATERIE) await pg.query(`insert into materie (id, nome, abbreviazione) values ($1, $2, $3) on conflict do nothing`, [m, m[0].toUpperCase() + m.slice(1), m.slice(0, 3).toUpperCase()]);
  await pg.exec(`update forzieri set premio = 'Premio ' || n`);
  for (let d = piu(R.giorno(da), -1); R.iso(d) <= a; d = piu(d, 1)) {
    const g = d.getDay();
    if (g === 2 || g === 4) await pg.query(`insert into impegni_famiglia (id, inizio, titolo) values ($1, $2, 'Allenamento Lani')`, [`all-${R.iso(d)}`, alle(d, '18:00').toISOString()]);
    if (g === 6 && R.iso(d) < '2027-05-20') await pg.query(`insert into impegni_famiglia (id, inizio, titolo) values ($1, $2, 'Partita Lani')`, [`par-${R.iso(d)}`, alle(d, '16:00').toISOString()]);
  }

  const giorni: Giorno[] = [];
  const furbate: string[] = []; // compiti spuntati senza farli: il genitore li storna il giorno dopo
  const aperti = new Set<number>();
  let settimana = 0;
  let nVoto = 0;

  const ferma = (d: Date, cosa: string) => {
    throw new Invariante(`${profilo.nome}, ${R.iso(d)}: ${cosa}`);
  };

  for (let d = R.giorno(da); R.iso(d) <= a; d = piu(d, 1)) {
    const oggi = R.iso(d);
    if (d.getDay() === 1) settimana++;
    const imp = profilo.impegno(d, settimana);
    const scuola = R.giornoDiScuola(d);
    const domaniScuola = R.giornoDiScuola(R.prossimoGiornoDiScuola(d)) && R.iso(R.prossimoGiornoDiScuola(d)) === R.iso(piu(d, 1));

    // ---- mattina: Nuvola porta compiti, verifiche, voti e note
    orologio(alle(d, '07:30'));
    if (scuola) {
      for (let i = 0, n = 1 + Math.floor(rng() * 3); i < n; i++) {
        let scad = R.prossimoGiornoDiScuola(d);
        if (caso(0.3)) for (let k = 0; k < 1 + Math.floor(rng() * 3); k++) scad = R.prossimoGiornoDiScuola(scad);
        await pg.query(`insert into compiti (materia_id, testo, assegnato_il, scadenza) values ($1, 'Esercizi', $2, $3)`, [MATERIE[Math.floor(rng() * MATERIE.length)], oggi, R.iso(scad)]);
      }
      if (caso(0.08)) {
        let quando = d;
        for (let k = 0; k < 5 + Math.floor(rng() * 4); k++) quando = R.prossimoGiornoDiScuola(quando);
        const materia = MATERIE[Math.floor(rng() * MATERIE.length)];
        const v = await una<string>(`insert into verifiche (materia_id, tipo, data, argomento) values ('${materia}', 'verifica', '${R.iso(quando)}', 'Verifica') returning id as v`);
        for (const s of R.pianoRipasso(quando, d)) await pg.query(`insert into sessioni_ripasso (verifica_id, numero, data_prevista, tipo) values ($1, $2, $3, $4)`, [v, s.numero, s.data, s.tipo]);
        await pg.query(`insert into quiz (materia_id, argomento, verifica_id, domande) values ($1, 'Verifica', $2, '[]')`, [materia, v]);
      }
      // voti delle verifiche di oggi e qualche interrogazione: più impegno, voti più alti
      const verificheOggi = (await pg.query<{ materia_id: string }>(`select materia_id from verifiche where data = $1`, [oggi])).rows;
      const interrogazioni = caso(0.1) ? [{ materia_id: MATERIE[Math.floor(rng() * MATERIE.length)] }] : [];
      for (const v of [...verificheOggi, ...interrogazioni]) {
        const voto = Math.max(4, Math.min(10, Math.round((4.5 + 4.5 * imp + (rng() - 0.5) * 3) * 2) / 2));
        await pg.query(`insert into voti (nuvola_id, materia_id, data, voto) values ($1, $2, $3, $4)`, [`v${++nVoto}`, v.materia_id, oggi, voto]);
      }
      const pNota = { disciplinare: 0.004 + (1 - imp) * 0.02, didattica: 0.01 + (1 - imp) * 0.04, merito: 0.004 * imp };
      for (const [tipo, p] of Object.entries(pNota)) if (caso(p)) await pg.query(`insert into note (data, tipo, testo) values ($1, $2, 'Nota')`, [oggi, tipo]);
      if (caso(0.05)) await pg.query(`insert into fogli_firma (titolo, scadenza) values ('Foglio', $1)`, [R.iso(piu(d, 3))]);
      await passiEForzieri(db);
    }

    // ---- pomeriggio: il genitore storna le furbate di ieri; Lani fa compiti, ripasso, studio
    orologio(alle(d, '15:00'));
    for (const id of furbate.splice(0)) {
      await come(PAPA, `select storna_spunta('compito', '${id}')`);
      await pg.query(`update compiti set fatto_il = null, corretto_da = $1, corretto_il = now() where id = $2`, [PAPA, id]);
      // a volte lo rifà davvero (passi base, una volta sola), a volte prova a rispuntarlo due volte
      if (caso(0.5)) {
        orologio(alle(d, '16:00'));
        await pg.query(`update compiti set fatto_il = now() where id = $1`, [id]);
        await passi('compito', id);
        await passi('compito', id);
      }
    }
    orologio(alle(d, '17:00'));
    const daFare = (await pg.query<{ id: string; scadenza: string }>(`select id, scadenza::text from compiti where fatto_il is null and corretto_il is null and scadenza > $1 order by scadenza`, [oggi])).rows;
    for (const c of daFare) {
      const domani = c.scadenza === R.iso(R.prossimoGiornoDiScuola(d));
      const fatto = caso(domani ? imp : imp * 0.25);
      const finto = !fatto && domani && profilo.furbetta && caso(0.5);
      if (!fatto && !finto) continue;
      await pg.query(`update compiti set fatto_il = now() where id = $1`, [c.id]);
      await passi('compito', c.id);
      if (profilo.furbetta) await passi('compito', c.id); // ritenta: idempotente
      if (finto && caso(0.6)) furbate.push(c.id);
    }
    // compiti scaduti spuntati in ritardo: niente passi (la regola lo dice, il simulatore lo prova)
    if (profilo.furbetta) {
      const scaduto = await una<string | null>(`select id as v from compiti where fatto_il is null and scadenza < '${oggi}' limit 1`);
      if (scaduto) {
        const prima = await una<number>(`select coalesce(sum(passi), 0)::int as v from movimenti_passi`);
        await pg.query(`update compiti set fatto_il = now() where id = $1`, [scaduto]);
        await passi('compito', scaduto);
        if ((await una<number>(`select coalesce(sum(passi), 0)::int as v from movimenti_passi`)) !== prima) ferma(d, 'un compito scaduto spuntato in ritardo ha dato passi');
      }
    }
    for (const s of (await pg.query<{ id: string }>(`select id from sessioni_ripasso where data_prevista = $1 and fatta_il is null`, [oggi])).rows)
      if (caso(imp)) {
        await pg.query(`update sessioni_ripasso set fatta_il = now() where id = $1`, [s.id]);
        await passi('ripasso', s.id);
      }
    // studio facoltativo: giri di flash card e quiz (la furbetta ne prova 6 al giorno)
    const giri = profilo.furbetta ? 6 : Math.floor(rng() * 4 * imp);
    for (let i = 0; i < giri; i++) {
      orologio(alle(d, `18:${String(10 + i * 5).padStart(2, '0')}`));
      const carte = 8 + Math.floor(rng() * 5);
      const veloce = profilo.furbetta && caso(0.3); // carte girate troppo in fretta
      const id = await una<string>(`insert into flashcard_giri (iniziato_il, fatto_il, carte, sapevo, quasi, non_sapevo) values (now() - interval '${veloce ? carte : carte * 9} seconds', now(), ${carte}, ${carte - 2}, 1, 1) returning id as v`);
      await passi('flashcard', id);
    }
    const quiz = await una<string | null>(`select q.id as v from quiz q join verifiche v on v.id = q.verifica_id where v.data > '${oggi}' order by v.data limit 1`);
    if (quiz && caso(imp * 0.6))
      for (let i = 0; i < (profilo.furbetta ? 5 : 1 + Math.floor(rng() * 2)); i++) {
        const giuste = Math.min(10, Math.round(6 + 4 * imp + (rng() - 0.5) * 2));
        const id = await una<string>(`insert into quiz_tentativi (quiz_id, numero, giuste, totale) values ('${quiz}', 0, ${giuste}, 10) returning id as v`);
        await passi('quiz', id);
      }
    // foglio: Lani lo dà, un genitore lo conferma il giorno dopo
    for (const f of (await pg.query<{ id: string; dato: boolean }>(`select id, dato_il is not null as dato from fogli_firma where consegnato_il is null`)).rows) {
      if (f.dato) {
        await pg.query(`update fogli_firma set consegnato_il = now() where id = $1`, [f.id]);
        await passi('foglio', f.id);
      } else if (caso(imp)) await pg.query(`update fogli_firma set dato_il = now() where id = $1`, [f.id]);
    }

    // ---- sera: gesti, qualche sgridata, cartella e borsa
    orologio(alle(d, '19:00'));
    // i gesti li notano i genitori; con la furbetta ogni gesto arriva due volte (doppio tocco)
    const notati = VOCI.filter(() => caso(imp * 0.5));
    const voci = profilo.furbetta ? notati.flatMap((v) => [v, v]) : notati;
    for (const voce of voci) {
      const id = await una<string>(`insert into gesti_casa (data, voce, dato_da) values ('${oggi}', '${voce}', '${PAPA}') returning id as v`);
      await passi('gesto', id);
    }
    if (caso(0.03 + (1 - imp) * 0.05)) {
      const tipo = profilo.furbetta && caso(0.5) ? 'balla' : caso(0.8) ? 'bagno' : 'antisportivo';
      const id = await una<string>(`insert into sgridate (data, tipo, dato_da) values ('${oggi}', '${tipo}', '${PAPA}') returning id as v`);
      await passi('sgridata', id);
    }
    orologio(alle(d, '20:15'));
    const borsaDomani = (await pg.query<{ titolo: string }>(`select titolo from impegni_famiglia where (inizio at time zone 'Europe/Rome')::date = $1`, [R.iso(piu(d, 1))])).rows.map((x) => x.titolo);
    const cartella = domaniScuola && caso(imp);
    const borsa = C.serveBorsa(borsaDomani) && caso(imp);
    if (cartella || borsa) {
      await pg.query(`insert into serate (data, cartella_il, borsa_il) values ($1, ${cartella ? 'now()' : 'null'}, ${borsa ? 'now()' : 'null'})`, [oggi]);
      await passi('serata', oggi);
    }

    // ---- domenica sera: chiavi
    if (d.getDay() === 0) {
      orologio(alle(d, '21:30'));
      await contaChiavi(db, R.lunedi(d));
    }

    // ---- fine giornata: invarianti
    orologio(alle(d, '23:50'));
    const saldo = await una<number>(`select passi::int as v from saldo_passi`);
    if (saldo < 0) ferma(d, `saldo sotto zero (${saldo})`);
    if (await una<number>(`select (count(*) - count(distinct (motivo, riferimento)))::int as v from movimenti_passi`)) ferma(d, 'due movimenti con lo stesso motivo e riferimento');
    const caselle = await una<number>(`select coalesce(max(n), 0)::int as v from (select count(*) n from movimenti_passi where motivo in ('flashcard', 'quiz', 'video') group by motivo, split_part(riferimento, ':', 2)) x`);
    if (caselle > R.CONFIG.passi.studio_facoltativo.max_al_giorno_per_tipo) ferma(d, `${caselle} caselle di studio dello stesso tipo in un giorno`);
    const gesti = await una<number>(`select coalesce(max(s), 0)::int as v from (select sum(passi) s from movimenti_passi where motivo = 'gesto' group by giorno) x`);
    if (gesti > R.CONFIG.passi.gesti_casa.tetto_giornaliero) ferma(d, `gesti di casa oltre il tetto (${gesti})`);
    const rifatti = await una<number>(`select count(*)::int as v from movimenti_passi r where motivo = 'compito_rifatto' and not exists (select 1 from movimenti_passi s where s.motivo = 'storno' and s.riferimento = 'compito:' || r.riferimento)`);
    if (rifatti) ferma(d, 'compito rifatto senza storno');
    const stornoNonEsatto = await una<number>(`select count(*)::int as v from movimenti_passi s join movimenti_passi m on s.riferimento = m.motivo || ':' || m.riferimento where s.motivo = 'storno' and s.passi <> -m.passi`);
    if (stornoNonEsatto) ferma(d, 'storno diverso dai passi della spunta');
    for (const s of (await pg.query<{ inizio: string; chiavi: number; passi_obbligatori_possibili: number; passi_obbligatori_fatti: number; cose_possibili: number; cose_fatte: number; note: number }>(`select * from settimane where inizio >= $1`, [R.iso(piu(d, -6))])).rows) {
      const attese = R.chiaviSettimana({ passiPossibili: s.passi_obbligatori_possibili, passiFatti: s.passi_obbligatori_fatti, cosePossibili: s.cose_possibili, coseFatte: s.cose_fatte, note: s.note });
      if (s.chiavi !== attese || s.chiavi < 0 || s.chiavi > 3 || (s.note > 0 && s.chiavi > 1)) ferma(d, `chiavi della settimana ${s.inizio} incoerenti (${s.chiavi} invece di ${attese})`);
    }
    const pos = R.posizione(saldo);
    const chiaviTot = await una<number>(`select chiavi::int as v from chiavi_totali`);
    for (const f of (await pg.query<{ n: number; stato: string }>(`select n, stato::text from forzieri`)).rows) {
      const conf = R.CONFIG.forzieri[f.n - 1];
      if (f.stato === 'aperto' && !aperti.has(f.n)) {
        aperti.add(f.n);
        if (pos.tappeFatte < conf.tappa || chiaviTot < conf.chiavi) ferma(d, `forziere ${f.n} aperto con tappa ${pos.tappeFatte}/${conf.tappa} e chiavi ${chiaviTot}/${conf.chiavi}`);
      }
      if (f.stato === 'enigma' && pos.tappeFatte < conf.tappa - 1) ferma(d, `enigma del forziere ${f.n} comparso prima di una tappa dal forziere`);
    }
    for (const f of (await come(LANI, `select n, stato::text, premio from forzieri_lani`)).rows as { n: number; stato: string; premio: string | null }[])
      if (f.premio && !['aperto', 'consegnato'].includes(f.stato)) ferma(d, `Lani vede il premio del forziere ${f.n} chiuso`);
    if (!scuola && R.bandierina(d) !== R.bandierina(piu(d, -1))) ferma(d, 'la bandierina si muove in un giorno senza scuola');
    const figurine = await una<number>(`select count(*)::int as v from figurine where sbloccata_il is not null`);
    if (figurine > ALBUM.length) ferma(d, `${figurine} figurine, l'album ne ha ${ALBUM.length}`);
    for (const p of (await pg.query<{ titolo: string; testo: string; posa: string; ora: string; situazione: string }>(`select titolo, testo, posa, to_char(creato_il at time zone 'Europe/Rome', 'HH24:MI') ora, situazione from popup_coda where (creato_il at time zone 'Europe/Rome')::date = $1`, [oggi])).rows) {
      if (parole(p.titolo) > 4 || parole(p.testo) > 25) ferma(d, `popup "${p.situazione}" oltre i limiti del copione: "${p.titolo}" / "${p.testo}"`);
      if (/\p{Extended_Pictographic}/u.test(p.titolo + p.testo)) ferma(d, `popup "${p.situazione}" con emoji`);
      if (p.ora >= '21:00' && ['arrabbiato', 'dispettoso'].includes(TONO.get(p.posa) ?? '') && /^(bagno|balla|antisportivo)/.test(p.situazione)) ferma(d, `rimprovero dei genitori accodato alle ${p.ora}`);
    }

    const motivi: Record<string, number> = {};
    for (const m of (await pg.query<{ motivo: string; p: number }>(`select motivo, sum(round(passi * moltiplicatore))::int p from movimenti_passi where giorno = $1 group by motivo`, [oggi])).rows) motivi[m.motivo] = m.p;
    giorni.push({ giorno: oggi, saldo, bandierina: R.bandierina(d), tappa: pos.tappeFatte, motivi });
  }

  // ultima domenica dopo la fine: chiavi dell'ultima settimana (il gioco finisce di venerdì)
  const settimane = (await pg.query<{ inizio: string; chiavi: number; rimonta: boolean; cose_possibili: number; cose_fatte: number; note: number }>(`select inizio::text, chiavi, rimonta, cose_possibili, cose_fatte, note from settimane order by inizio`)).rows.map((s) => ({
    inizio: s.inizio,
    chiavi: s.chiavi,
    rimonta: s.rimonta,
    possibili: s.cose_possibili,
    fatte: s.cose_fatte,
    note: s.note,
  }));
  const forzieri = (await pg.query<{ n: number; aperto: string | null }>(`select n, (aperto_il at time zone 'Europe/Rome')::date::text aperto from forzieri order by n`)).rows.map((f) => ({
    n: f.n,
    enigma: giorni.find((g) => g.tappa >= R.CONFIG.forzieri[f.n - 1].tappa - 1)?.giorno ?? null,
    aperto: f.aperto,
  }));
  const cima = giorni.find((g) => R.posizione(g.saldo).inCima)?.giorno ?? null;
  const figurine = await una<number>(`select count(*)::int as v from figurine where sbloccata_il is not null`);
  const popup = await una<number>(`select count(*)::int as v from popup_coda`);
  await pg.close();
  return { profilo, giorni, settimane, forzieri, cima, figurine, popup };
}

// ---------------------------------------------------------------- uscita in file

/** CSV per la taratura: una riga per giorno e motivo (passi già col moltiplicatore della rimonta). */
export function csv(r: Risultato): string {
  const righe = ['giorno,motivo,passi,saldo,bandierina'];
  for (const g of r.giorni) {
    const motivi = Object.entries(g.motivi);
    if (!motivi.length) righe.push(`${g.giorno},,0,${g.saldo},${g.bandierina}`);
    for (const [m, p] of motivi) righe.push(`${g.giorno},${m},${p},${g.saldo},${g.bandierina}`);
  }
  return righe.join('\n') + '\n';
}

export function rapporto(r: Risultato): string {
  const ch = r.settimane.map((s) => s.chiavi);
  const media = ch.length ? (ch.reduce((a, b) => a + b, 0) / ch.length).toFixed(2) : '0';
  const fine = r.giorni[r.giorni.length - 1];
  // un punto ogni lunedì: passi e bandierina
  const lunedi = r.giorni.filter((g) => R.giorno(g.giorno).getDay() === 1);
  const grafico = [
    '```mermaid',
    'xychart-beta',
    `  title "Passi (barre) e bandierina (linea), ${r.profilo.nome}"`,
    `  x-axis [${lunedi.map((g) => `"${g.giorno.slice(5)}"`).join(', ')}]`,
    `  y-axis "passi" 0 --> ${R.CONFIG.percorso.totale_passi}`,
    `  bar [${lunedi.map((g) => g.saldo).join(', ')}]`,
    `  line [${lunedi.map((g) => g.bandierina).join(', ')}]`,
    '```',
  ].join('\n');
  return `# Simulazione: ${r.profilo.nome}

Profilo: ${r.profilo.descrizione} (seme ${r.profilo.seme}). Dal ${r.giorni[0].giorno} al ${fine.giorno}, codice vero dei passi, delle chiavi, di voti e note e dei forzieri su PGlite con le migrazioni vere. Rigenerare con \`npm run simula:anno\`; i passi per giorno e per motivo sono in \`${r.profilo.nome}.csv\`.

| | |
|---|---|
| Passi a fine anno | ${fine.saldo} su ${R.CONFIG.percorso.totale_passi} (tappa ${fine.tappa} di ${R.CONFIG.percorso.costi_tappe.length}) |
| Cima | ${r.cima ?? 'non raggiunta'} |
| Chiavi | ${ch.reduce((a, b) => a + b, 0)} in ${ch.length} settimane, media ${media} |
| Settimane con rimonta | ${r.settimane.filter((s) => s.rimonta).length} |
| Forzieri aperti | ${r.forzieri.filter((f) => f.aperto).length} di 9 |
| Figurine | ${r.figurine} di ${ALBUM.length} |
| Popup accodati | ${r.popup} |

${grafico}

## Passi per motivo

| Motivo | Passi |
|---|---|
${Object.entries(r.giorni.reduce<Record<string, number>>((t, g) => { for (const [m, p] of Object.entries(g.motivi)) t[m] = (t[m] ?? 0) + p; return t; }, {}))
  .sort((x, y) => y[1] - x[1])
  .map(([m, p]) => `| ${m} | ${p} |`)
  .join('\n')}

## Forzieri

| Forziere | Tappa | Chiavi | Enigma visibile dal | Aperto il |
|---|---|---|---|---|
${r.forzieri.map((f) => { const c = R.CONFIG.forzieri[f.n - 1]; return `| ${f.n} | ${c.tappa} | ${c.chiavi} | ${f.enigma ?? '-'} | ${f.aperto ?? '-'} |`; }).join('\n')}

## Chiavi per settimana

| Settimana | Cose fatte / possibili | Note | Chiavi | Rimonta |
|---|---|---|---|---|
${r.settimane.map((s) => `| ${s.inizio} | ${s.fatte} / ${s.possibili} | ${s.note} | ${s.chiavi} | ${s.rimonta ? 'sì' : ''} |`).join('\n')}
`;
}
