// Calendario di famiglia (iCal privato di Google): dagli eventi agli impegni, con le ripetizioni
// espanse e le eccezioni (un'occorrenza spostata o cancellata). Lo usa sync-calendario; la
// libreria ical.js si passa da fuori (in Deno arriva da npm:, nelle prove da node_modules).
import type ICALModulo from 'ical.js';

/** Un impegno di un giorno intero si salva a mezzanotte UTC con tutto_il_giorno = true. */
export type Impegno = { id: string; inizio: string; fine: string | null; titolo: string; tutto_il_giorno: boolean; aggiornato_il: string };

const MAX_RIPETIZIONI = 500;

/** Impegni con inizio tra `da` e `a` (compresi). Gli eventi con "privat" nel titolo restano fuori. */
export function impegni(ICAL: typeof ICALModulo, testo: string, da: Date, a: Date, ora = new Date().toISOString()): Impegno[] {
  const cal = new ICAL.Component(ICAL.parse(testo));
  for (const tz of cal.getAllSubcomponents('vtimezone')) ICAL.TimezoneService.register(tz);

  // le eccezioni (un'occorrenza spostata) hanno lo stesso UID e RECURRENCE-ID
  const eventi = cal.getAllSubcomponents('vevent').map((v) => new ICAL.Event(v));
  const principali = eventi.filter((e) => !e.isRecurrenceException());
  for (const ecc of eventi.filter((e) => e.isRecurrenceException())) principali.find((p) => p.uid === ecc.uid)?.relateException(ecc);

  const fuori: Impegno[] = [];
  for (const e of principali) {
    const titolo = (e.summary ?? '').trim();
    if (!titolo || /privat/i.test(titolo)) continue;
    const aggiungi = (inizio: ICALModulo.Time, fine: ICALModulo.Time | null, chiave: string, titoloOccorrenza = titolo) => {
      const i = inizio.toJSDate();
      if (i < da || i > a) return;
      fuori.push({
        id: chiave,
        inizio: i.toISOString(),
        fine: fine?.toJSDate().toISOString() ?? null,
        titolo: titoloOccorrenza,
        tutto_il_giorno: inizio.isDate,
        aggiornato_il: ora,
      });
    };
    if (!e.isRecurring()) {
      aggiungi(e.startDate, e.endDate, e.uid);
      continue;
    }
    const it = e.iterator();
    for (let t = it.next(), n = 0; t && n < MAX_RIPETIZIONI; t = it.next(), n++) {
      if (t.toJSDate() > a) break;
      const d = e.getOccurrenceDetails(t);
      const t2 = (d.item.summary ?? titolo).trim();
      if (/privat/i.test(t2)) continue;
      aggiungi(d.startDate, d.endDate, `${e.uid}:${t.toString()}`, t2);
    }
  }
  return fuori;
}
