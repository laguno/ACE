// Copione dei popup e delle notifiche (docs/05-copione.md): testi, pose, priorità.
// Le regole di forma (titolo <= 4 parole, testo <= 25, niente emoji, notifiche <= 60 caratteri)
// sono controllate dai test su tutte le righe.
import config from '../../../data/config-gioco.json' with { type: 'json' };

export type Priorita = 1 | 2 | 3 | 4; // 1 bastone, 2 voto, 3 forziere/tappa, 4 altro

type Riga = { priorita: Priorita; posa: string; titolo: string; testo: string };

/** Popup del copione. {variabili} riempite da componi(). */
export const POPUP = {
  // voti (un solo popup per voto, in quest'ordine: recupero, migliorato, fascia)
  voto_recupero: { priorita: 2, posa: 'papa-applaude', titolo: 'Materia recuperata', testo: 'Recuperata {materia}: +{passi}. Questa è una rimonta.' },
  voto_migliorato: { priorita: 2, posa: 'papa-pollice', titolo: 'Voto migliorato', testo: 'Da {prima} a {voto} in {materia}: +{passi}.' },
  voto_9: { priorita: 2, posa: 'nonno-pollice', titolo: 'Voto alto', testo: '{voto} in {materia}. Il nonno ha alzato il pollice. Succede di rado.' },
  voto_7: { priorita: 2, posa: 'mamma-applaude', titolo: 'Bel voto', testo: '{voto} in {materia}: +{passi}. Le {n} sessioni di ripasso si vedono.' },
  // ponytail: variante senza sessioni (il copione dà solo quella con {n}): il testo si ferma ai passi
  voto_7_senza_ripasso: { priorita: 2, posa: 'mamma-applaude', titolo: 'Bel voto', testo: '{voto} in {materia}: +{passi}.' },
  voto_6: { priorita: 2, posa: 'lani-saluta', titolo: 'Sufficienza', testo: '{voto} in {materia}: sufficienza. Per il 7 il piano è pronto.' },
  voto_insufficiente: { priorita: 2, posa: 'lani-partita-persa', titolo: 'Si guarda avanti', testo: '{voto} in {materia}. Il piano per la prossima è già pronto.' },
  voto_insufficiente_ancora: { priorita: 2, posa: 'papa-ci-pensiamo', titolo: 'Ne parliamo stasera', testo: 'Di nuovo {materia}. Stasera ci guardiamo insieme il piano.' },
  // note (bastone)
  nota_disciplinare: { priorita: 1, posa: 'mamma-arrabbiata', titolo: 'Nota', testo: 'Nota disciplinare in {materia}. {passi}, e salta la seconda chiave. Stasera ne parliamo.' },
  nota_terza_dimenticanza: { priorita: 1, posa: 'papa-arrabbiato', titolo: 'Terza dimenticanza', testo: 'Terza nota per dimenticanze: {passi}. Da domani doppia spunta sulla cartella.' },
  nota_merito: { priorita: 2, posa: 'mamma-festeggia', titolo: 'Nota di merito', testo: 'Nota di merito in {materia}: +{passi}. Questa va sul frigo.' },
  // casa: gesti e sgridate segnati dai genitori
  gesto_papa: { priorita: 4, posa: 'papa-pollice', titolo: 'Passi di casa', testo: 'Papà: +{passi}, {cosa}.' },
  gesto_mamma: { priorita: 4, posa: 'mamma-pollice', titolo: 'Passi di casa', testo: 'Mamma: +{passi}, {cosa}.' },
  bagno_papa: { priorita: 1, posa: 'papa-arrabbiato', titolo: 'Bagno da sistemare', testo: 'Bagno da sistemare: {passi}. Asciugamani appesi, tappetino a posto, specchio pulito.' },
  bagno_mamma: { priorita: 1, posa: 'mamma-arrabbiata', titolo: 'Bagno da sistemare', testo: 'Bagno da sistemare: {passi}. Asciugamani appesi, tappetino a posto, specchio pulito.' },
  bagno_2: { priorita: 1, posa: 'lady-offesa', titolo: 'Di nuovo il bagno', testo: 'Di nuovo il bagno. Perfino Lady si rifiuta di entrarci. {passi}.' },
  bagno_3: { priorita: 1, posa: 'leo-sbuffa', titolo: 'Ancora il bagno', testo: 'Leo non entra in bagno dopo di te, puzzolona. {passi}.' },
  antisportivo: { priorita: 1, posa: 'papa-arrabbiato', titolo: 'In campo', testo: 'In campo non si fa così: {passi}. Il rispetto vale più di un punto.' },
  balla: { priorita: 1, posa: 'mamma-arrabbiata', titolo: 'Balla scoperta', testo: 'Balla scoperta: {cosa}. {passi}. Con la verità si perde sempre meno.' },
  // Astra
  tappa: { priorita: 3, posa: 'lani-contenta', titolo: 'Tappa raggiunta', testo: 'Tappa {tappa}! Alla prossima: {mancano_passi} passi.' },
  enigma_comparso: { priorita: 3, posa: 'lani-detective', titolo: 'Un biglietto', testo: 'Un biglietto vicino al forziere. Riesci a decifrarlo? Hai {n} tentativi.' },
  forziere_lucchetto: { priorita: 3, posa: 'papa-dispiaciuto', titolo: 'Servono chiavi', testo: 'Sei arrivata al forziere, ma servono {n} chiavi in più. Si apre appena le hai.' },
  forziere_aperto: { priorita: 3, posa: 'lani-sorpresa', titolo: 'Forziere aperto', testo: 'Forziere aperto! Dentro c’è: {premio}. E una figurina che non trovi altrove.' },
  cima: { priorita: 3, posa: 'lani-cima', titolo: 'In cima', testo: 'In cima! Per aspera ad astra. Tutta la famiglia è qui.' },
  chiavi_0: { priorita: 4, posa: 'mamma-dispiaciuta', titolo: 'Settimana storta', testo: 'Settimana storta: nessuna chiave. Lunedì si riparte da zero, non da sotto zero. Ogni giorno, passino passino.' },
  chiavi_1: { priorita: 4, posa: 'lani-saluta', titolo: 'Una chiave', testo: 'Una chiave. Per la seconda mancava: {cosa}.' },
  chiavi_2: { priorita: 4, posa: 'mamma-applaude', titolo: 'Due chiavi', testo: 'Due chiavi: quota fatta e nessuna nota. Per la terza: {cosa}.' },
  chiavi_3: { priorita: 4, posa: 'leo-festeggia', titolo: 'Tre chiavi', testo: 'Tre chiavi: tutto fatto. Leo non trova niente da prenderti in giro.' },
  // studio
  verifica_nuova: { priorita: 4, posa: 'lani-pensierosa', titolo: 'Verifica in arrivo', testo: 'Verifica di {materia}: {giorno}. Il piano è pronto: {n} sessioni da 15 minuti.' },
  verifica_nuova_una: { priorita: 4, posa: 'lani-pensierosa', titolo: 'Verifica in arrivo', testo: 'Verifica di {materia}: {giorno}. Il piano è pronto: una sessione da 15 minuti.' },
} satisfies Record<string, Riga>;

export type ChiavePopup = keyof typeof POPUP;

/** Notifiche push: titolo sempre "ACE", testo <= 60 caratteri, mai rimproveri. */
export const NOTIFICHE = {
  mattina: 'Oggi {cose}',
  mattina_partita: 'Partita alle {ora}. Borsa pronta?',
  mattina_tranquilla: 'Giornata tranquilla. Apri per la cosa da ricordare',
  compiti_nuovi: '{n} compiti nuovi. Primo: {materia}, è per domani',
  chiusura: 'Bart ti aspetta: chiusura della sera, 10 minuti',
  chiusura_domenica: 'Domenica sera: prepariamo la settimana',
  sollecito: 'Mancano ancora {n} cose per chiudere la giornata',
  genitori_riepilogo: 'Riepilogo della settimana di Lani: {chiavi} chiavi',
} as const;

export type ChiaveNotifica = keyof typeof NOTIFICHE;

export const riempi = (t: string, v: Record<string, string | number>) =>
  t.replace(/\{(\w+)\}/g, (_, k) => (v[k] === undefined ? `{${k}}` : String(v[k])));

export function componi(chiave: ChiavePopup, v: Record<string, string | number> = {}) {
  const r: Riga = POPUP[chiave];
  return { priorita: r.priorita, posa: r.posa, titolo: r.titolo, testo: riempi(r.testo, v) };
}

export function notifica(chiave: ChiaveNotifica, v: Record<string, string | number> = {}) {
  return { titolo: 'ACE', testo: riempi(NOTIFICHE[chiave], v).slice(0, config.notifiche.caratteri_max) };
}

/** Le pose arrabbiate e dispettose (serie nera) e quelle dei genitori arrabbiati. */
export const posaGenitoreArrabbiato = (posa: string) => /^(papa|mamma)-arrabbiat/.test(posa);

/** Dopo le 21:00 niente rimproveri di mamma e papà: aspettano la mattina dopo. */
export function popupMostrabile(p: { priorita: number; posa: string }, ora: string): boolean {
  return !(p.priorita === 1 && posaGenitoreArrabbiato(p.posa) && ora >= config.notifiche.silenzio_rimproveri_dopo);
}

/** Quale popup del voto (docs/05: recupero, poi migliorato, poi fascia). */
export function popupVoto(voto: number, precedente?: number, insufficienzeMateria = 0, sessioni = 0): ChiavePopup {
  if (precedente !== undefined && precedente < 6 && voto >= 6) return 'voto_recupero';
  if (precedente !== undefined && voto > precedente && voto >= 6) return 'voto_migliorato';
  if (voto >= 9) return 'voto_9';
  if (voto >= 7) return sessioni ? 'voto_7' : 'voto_7_senza_ripasso';
  if (voto >= 6) return 'voto_6';
  return insufficienzeMateria >= 2 ? 'voto_insufficiente_ancora' : 'voto_insufficiente';
}

/** "lani-contenta" -> "Lani contenta" (nome della figurina). */
export const nomeFigurina = (posa: string) => posa.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());

/** "7.5" -> "7½", "8" -> "8": i voti come li scrive la scuola. */
export const votoScritto = (v: number) => (v % 1 === 0.5 ? `${Math.floor(v)}½` : String(Math.round(v * 100) / 100).replace('.', ','));
