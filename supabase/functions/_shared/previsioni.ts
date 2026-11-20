// Voto previsto (blocco D, 19/11/2026): a ogni giro di sync-nuvola lega i voti veri alle verifiche
// con una previsione di Lani e dà i passi se la previsione era vicina (importo provvisorio in
// config-gioco.json, metacognizione.voto_previsto, da confermare con il signore).
// Idempotente come il resto: registra_passi con motivo 'voto_previsto' e riferimento la verifica.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import * as R from '../../../src/lib/regole/index.ts';
import * as D from '../../../src/lib/regole/metacognizione.ts';
import { Passo } from './voti.ts';

export async function passiPrevisioni(db: SupabaseClient): Promise<number> {
  const { data: previste, error } = await db.from('voti_previsti').select('verifica_id, voto, verifiche(id, materia_id, data, tipo)');
  if (error) throw new Passo(`voti_previsti: ${error.message}`);
  if (!previste?.length) return 0;
  const verifiche = previste.map((p) => p.verifiche as unknown as D.VerificaDaAbbinare).filter(Boolean);
  const da = verifiche.reduce((m, v) => (v.data < m ? v.data : m), verifiche[0]?.data ?? R.CONFIG.periodo.inizio);
  const { data: voti, error: e2 } = await db.from('voti').select('id, materia_id, data, voto, tipo').gte('data', da);
  if (e2) throw new Passo(`voti: ${e2.message}`);
  const abbinati = D.abbinaVoti(verifiche, (voti ?? []).map((v) => ({ ...v, voto: Number(v.voto) })));
  let presi = 0;
  for (const p of previste) {
    const vero = abbinati.get(p.verifica_id);
    if (!vero || vero.data < R.CONFIG.periodo.inizio) continue;
    const passi = D.passiPrevisione(Number(p.voto), vero.voto);
    if (!passi) continue;
    const { data, error: e3 } = await db.rpc('registra_passi', { p_motivo: 'voto_previsto', p_riferimento: p.verifica_id, p_passi: passi, p_giorno: vero.data });
    if (e3) throw new Passo(`registra_passi: ${e3.message}`);
    if (data) presi += passi;
  }
  return presi;
}
