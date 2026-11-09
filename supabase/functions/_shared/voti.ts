// Passi di voti e note, condivisi da sync-nuvola e dal simulatore dell'anno.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import * as K from '../../../src/lib/copione/index.ts';
import * as R from '../../../src/lib/regole/index.ts';
import { aggiornaForzieri } from './forzieri.ts';
import { accoda } from './popup.ts';

/** Errore con un messaggio che si può mostrare ai genitori (sync_log). */
export class Passo extends Error {}

// Rilegge dal database (non da Nuvola) e chiama registra_passi, che è idempotente: ogni giro
// ricalcola tutto e scrive solo i movimenti nuovi. Contano solo voti e note dall'inizio del gioco
// (config.periodo.inizio); i voti di prima servono solo da "precedente".
async function registra(db: SupabaseClient, motivo: string, riferimento: string, passi: number, giorno: string) {
  if (passi === 0) return 0;
  const { data, error } = await db.rpc('registra_passi', {
    p_motivo: motivo,
    p_riferimento: riferimento,
    p_passi: passi,
    p_giorno: giorno,
  });
  if (error) throw new Passo(`registra_passi: ${error.message}`);
  return data ? passi : 0;
}

/** Passi di voti e note, poi i forzieri. */
export async function passiEForzieri(db: SupabaseClient) {
  const passi = await passiVotiENote(db);
  return { passi, forzieri: await aggiornaForzieri(db, passi) };
}

const segno = (n: number) => String(n).replace('-', '−');

export async function passiVotiENote(db: SupabaseClient) {
  const inizio = R.CONFIG.periodo.inizio;
  let presi = 0;
  const { data: materie } = await db.from('materie').select('id, nome');
  const nome = (id: string | null) => materie?.find((m) => m.id === id)?.nome ?? 'una materia';

  const { data: voti, error: e1 } = await db.from('voti').select('id, materia_id, data, voto').order('data').order('nuvola_id');
  if (e1) throw new Passo(`voti: ${e1.message}`);
  // sessioni di ripasso fatte, per il popup "Le {n} sessioni di ripasso si vedono"
  const { data: sessioni } = await db.from('sessioni_ripasso').select('verifiche(materia_id, data)').not('fatta_il', 'is', null);
  // passi già dati per ogni voto (voto + correzioni), per accorgersi dei voti corretti dal docente
  const { data: mov } = await db.from('movimenti_passi').select('motivo, riferimento, passi').in('motivo', ['voto', 'voto_corretto']);
  const dati = new Map<string, number>();
  for (const m of mov ?? []) {
    const id = m.motivo === 'voto' ? m.riferimento : m.riferimento.split(':')[0];
    dati.set(id, (dati.get(id) ?? 0) + m.passi);
  }
  const perMateria = Map.groupBy(voti ?? [], (v) => v.materia_id);
  for (const lista of perMateria.values()) {
    const numeri = lista.map((v) => Number(v.voto));
    const passi = R.passiVotiMateria(numeri);
    for (const [i, v] of lista.entries()) {
      if (v.data < inizio) continue;
      const dato = dati.get(v.id);
      presi += await registra(db, 'voto', v.id, passi[i], v.data);
      // voto corretto dal docente dopo i passi: un movimento con la sola differenza (revisione di Jarvis)
      if (dato !== undefined && passi[i] !== dato)
        presi += await registra(db, 'voto_corretto', `${v.id}:${numeri[i]}`, passi[i] - dato, R.iso(R.giornoRoma(new Date())));
      // ponytail: conta le sessioni delle verifiche della stessa materia fatte nei 14 giorni prima del voto
      const da = R.iso(new Date(R.giorno(v.data).getTime() - 14 * 864e5));
      const fatte = (sessioni ?? []).filter((s) => {
        const ver = s.verifiche as unknown as { materia_id: string; data: string } | null;
        return !!ver && ver.materia_id === v.materia_id && ver.data <= v.data && ver.data >= da;
      }).length;
      const insufficienze = numeri.slice(0, i + 1).filter((x) => x < 6).length;
      await accoda(db, `voto:${v.id}`, K.popupVoto(numeri[i], i ? numeri[i - 1] : undefined, insufficienze, fatte), {
        voto: K.votoScritto(numeri[i]),
        prima: i ? K.votoScritto(numeri[i - 1]) : '',
        materia: nome(v.materia_id),
        passi: passi[i],
        n: fatte,
      });
    }
  }

  const { data: note, error: e2 } = await db
    .from('note')
    .select('id, data, tipo, materia_id')
    .gte('data', inizio)
    .order('data')
    .order('nuvola_id');
  if (e2) throw new Passo(`note: ${e2.message}`);
  for (const n of note ?? []) {
    const p = R.passiNota(n.tipo);
    presi += await registra(db, 'nota', n.id, p, n.data);
    if (n.tipo === 'disciplinare') await accoda(db, `nota:${n.id}`, 'nota_disciplinare', { materia: nome(n.materia_id), passi: segno(p) });
    if (n.tipo === 'merito') await accoda(db, `nota:${n.id}`, 'nota_merito', { materia: nome(n.materia_id), passi: p });
  }
  const didattiche = (note ?? []).filter((n) => n.tipo === 'didattica');
  for (const id of R.malusDimenticanze(didattiche.map((n) => n.id))) {
    const n = didattiche.find((x) => x.id === id)!;
    const p = R.CONFIG.passi.malus.note_dimenticanza_ogni_3;
    presi += await registra(db, 'note_dimenticanza', id, p, n.data);
    await accoda(db, `dimenticanze:${id}`, 'nota_terza_dimenticanza', { passi: segno(p) });
  }
  return presi;
}
