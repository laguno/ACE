// Medie dei voti come le fa la scuola: ogni voto pesa quanto dice Nuvola (peso in %) e i voti che
// Nuvola non calcola nella media (fa_media falso) restano fuori. Nuvola non mostra la sua media,
// quindi la formula è quella standard: somma di voto per peso, diviso la somma dei pesi.
// Un voto non ancora sincronizzato (peso e fa_media assenti) vale peso 100 e fa media.

export type VotoPesato = { voto: number | string; peso?: number | string | null; fa_media?: boolean | null };

/** Media pesata di una materia; null se non c'è nessun voto che fa media (o i pesi sono tutti zero). */
export function mediaPesata(voti: VotoPesato[]): number | null {
  let somma = 0;
  let pesi = 0;
  for (const v of voti) {
    if (v.fa_media === false) continue;
    const p = v.peso == null ? 100 : Number(v.peso);
    somma += Number(v.voto) * p;
    pesi += p;
  }
  return pesi > 0 ? somma / pesi : null;
}

/** Media generale = media delle medie per materia (come la pagella); le materie senza media non contano. */
export function mediaGenerale(voti: (VotoPesato & { materia_id: string })[]): number | null {
  const perMateria = Map.groupBy(voti, (v) => v.materia_id);
  const medie = [...perMateria.values()].map(mediaPesata).filter((m): m is number => m !== null);
  return medie.length ? medie.reduce((a, b) => a + b, 0) / medie.length : null;
}
