// Motore della pallavolo (docs/09-gioco-pallavolo.md §3.2): funzioni pure, passo fisso a 60 Hz,
// nessuna grafica. Stesso seme e stessi comandi = stessa partita su ogni dispositivo: qui dentro
// solo + - * / e Math.sqrt (esatti per lo standard). Niente sin, cos, pow, hypot né Math.random:
// cambiano da un motore JavaScript all'altro e una partita rigiocata non tornerebbe uguale.
//
// Unità: campo largo 1000, y verso l'alto, pavimento a 0. Lato 0 a sinistra, lato 1 a destra.
// Il ciclo a passo fisso (accumulatore del tempo) sta in chi disegna, non qui.

export const HZ = 60;

/** Misure e fisica: da tarare con la grafica e con Lani, non sono regole del gioco. */
export const M = {
  largo: 1000,
  reteX: 500,
  reteAlta: 230,
  reteMezza: 6,
  raggio: 28, // palla
  gravita: 0.35, // palla, per tic
  vMax: 20, // caduta massima: sotto raggio + reteMezza, così la palla non attraversa la rete
  raggioG: 40, // giocatore: cerchio di tocco (mani alzate; il centro lo dà cerchio()) e mezza larghezza.
  // Era 50 col tocco al petto: con le mani alzate un cerchio largo copriva quasi tutto il campo e gli
  // scambi CPU contro CPU non finivano più (taratura del 20/11 con partite simulate).
  mano: 1, // centro del cerchio = mano × altezza disegnata (cm × uPerCm), cioè alla cima della testa
  centroG: 175, // centro per l'altezza di default con la rete di 224 cm: solo per chi disegna senza stato
  passoG: 6, // velocità piena del giocatore
  accelG: 1.5, // partenza: velocità piena in 4 tic
  frenaG: 2, // frenata (e inversione) più decisa: da piena a ferma in 3 tic
  salto: 13,
  memoriaSalto: 8, // salto premuto in aria: parte se si tocca terra entro memoriaSalto - 2 tic
  gravitaG: 0.6,
  tocco: 13, // velocità della palla dopo un tocco (da terra o in salto)
  // Schiacciata, solo col comando: in aria, palla dal proprio lato sopra la rete e entro
  // margineSchiaccia dal cerchio di tocco. La palla va verso l'altro campo più in giù che può
  // (fino a schiacciaGiu) passando sopra la rete; in orizzontale da schiacciaVx a schiacciaVxMax,
  // più veloce quando serve per scendere anche da lontano.
  margineSchiaccia: 30,
  schiacciaVx: 16,
  schiacciaVxMax: 24,
  schiacciaGiu: 16,
  memoriaSchiaccia: 14, // tic in cui il comando premuto resta valido (premuto un filo prima)
  perdonoSchiaccia: 8, // premuto fino a tanti tic dopo il proprio tocco in aria: la palla è schiacciata lo stesso
  durataSchiaccia: 14, // tic di animazione; intanto chi ha schiacciato non ritocca la palla
  casa: [250, 750],
  altoBattuta: 330,
  attesa: 60, // tic fermi prima che la palla della battuta scenda
  pausaTocco: 12, // tic entro cui lo stesso contatto non conta come un tocco in più
  tocchiMax: 3,
  scartoIA: 30, // la CPU si mette dietro la palla di tanto, per mandarla verso la rete
  saltoIA: [70, 110, 220], // la CPU salta con la palla in discesa entro [0] in x e tra [1] e [2] sopra il centro
  schiacciaIA: 200, // la CPU schiaccia solo con la palla entro tanto dalla rete: da lontano la palla resta tesa e bassa
  // Altezze (docs/11 §2.1): le mani stanno alla cima vera della testa (cm × uPerCm), il salto è
  // uguale per tutti. Sotto manoMin le mani restano a manoMin: altrimenti la gattina (25 cm) non
  // arriverebbe mai a una palla sopra la rete (prova nei test).
  CM_DEFAULT: 170, // come altezza_default_cm di data/config-gioco.json
  manoMin: 80,
  // Corpo: capsula verticale dai piedi alla testa, di raggio corpo. La palla non lo attraversa:
  // la ribatte in alto verso la rete (bagher) a vy = alzata e vx = bagherVx.
  corpo: 18,
  bagherVx: 3,
  alzata: 10, // vy minima di un tocco normale e del bagher: il proprio tocco non manda la palla giù
  perdonoVicino: 20, // il perdono della schiacciata vale solo con la palla ancora sopra le mani: entro tanto in x dal cerchio
  // Mossa finale (docs/11 §3.2): parametri per tipo. "dist" = distanza dalla rete, nel campo avversario,
  // dove la palla tocca terra (calcolata col volo vero, pareti escluse).
  fulmine: 1.4, // schiacciata: velocità e giù massimo × fulmine (più veloce e più ripida)
  drittoVx: 17, // palla tesa
  drittoSopra: 12, // passa la rete a tanto sopra la cima
  bombaVy: 17, // altissima
  bombaDist: 430, // a 70 dalla linea di fondo
  furbaVy: 12,
  furbaDist: 70, // subito dietro la rete
  espVy: 12,
  espDist: 250,
  espLento: 0.35, // in cima al volo vx × espLento...
  espRiparte: 6, // ...finché la palla scende a più di espRiparte, poi vx × espVeloce (della vx di partenza)
  espVeloce: 1.8,
  dispettoVy: 13,
  dispettoDist: 440,
  dispettoGiro: 330, // scendendo, a tanto dalla rete nel campo avversario vx si inverte
  fischioTic: 60, // comandi dell'altra parte spenti per 1 s
  scattoTic: 180, // 3 s di corsa e salto × scatto
  scatto: 1.3,
  specialeIA: 0.35, // la CPU a barra piena usa la mossa con questa probabilità a ogni tocco (estratta dal seme)
} as const;

export type Lato = 0 | 1;
/** Palla: x, y del centro. */
export type Palla = { x: number; y: number; vx: number; vy: number };
/** Giocatore: x al centro, y ai piedi; cm = altezza del personaggio; schiaccia = tic di animazione rimasti. */
export type Corpo = Palla & { cm: number; schiaccia: number };

export type Comandi = { sx: boolean; dx: boolean; salta: boolean; schiaccia: boolean; speciale: boolean };
export const FERMO: Comandi = { sx: false, dx: false, salta: false, schiaccia: false, speciale: false };

export type TipoFinisher = 'fulmine' | 'dritto' | 'bomba' | 'furba' | 'esperienza' | 'fischio' | 'scatto' | 'dispetto';
/** subito = carica a chi subisce un punto; armato = tic per cui resta armato il tocco. Numeri dalla config. */
export type OpzioniCarica = { max: number; tocco: number; schiacciata: number; punto: number; subito: number; armato: number };
const CARICA: OpzioniCarica = { max: 100, tocco: 8, schiacciata: 15, punto: 20, subito: 10, armato: 90 };

/** Tutto JSON: si salva, si confronta, si rigioca. */
export type Stato = {
  tic: number;
  seme: number; // stato del generatore casuale
  palla: Palla;
  giocatori: [Corpo, Corpo];
  uPerCm: number; // unità di campo per cm: M.reteAlta / altezza vera della rete
  prima: [Comandi, Comandi]; // comandi del tic precedente: il salto parte sul fronte di pressione
  memoriaSalto: [number, number]; // tic rimasti al salto premuto in aria (0 = nessuno)
  memoriaSchiaccia: [number, number]; // tic rimasti al comando schiaccia premuto (0 = nessuno)
  punti: [number, number];
  durata: number; // tic di gioco: scaduti, la partita finisce al primo punto che non lascia la parità
  battuta: Lato;
  attesa: number; // tic che mancano alla discesa della palla di battuta
  tocchi: number; // tocchi di fila di latoTocchi
  latoTocchi: Lato | null;
  ticTocco: number; // tic dell'ultimo contatto
  mira: number; // da -1 a 1, estratta a ogni tocco: l'imprecisione della CPU
  vincitore: Lato | null;
  // ultimo contatto con la palla (anche quelli entro pausaTocco), per vibrazione e scintille di chi disegna
  tocco: { tic: number; lato: Lato; schiacciata: boolean } | null;
  // mossa finale (docs/11 §3.2)
  carica: [number, number]; // 0..caricaMax
  caricaMax: number;
  opzioniCarica: OpzioniCarica;
  armato: [number, number]; // tic rimasti al tocco armato, 0 = no
  finisher: { lato: Lato; tipo: TipoFinisher; tic: number } | null; // ultima mossa partita (tic = s.tic)
  tipi: [TipoFinisher, TipoFinisher];
  attivo: [number, number]; // tic rimasti a fischio o scatto di quel lato
};

/** mulberry32: [numero in 0..1, seme nuovo]. */
export function caso(seme: number): [number, number] {
  const a = (seme + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}

function estrai(s: Stato): number {
  const [v, seme] = caso(s.seme);
  s.seme = seme;
  return v;
}

function servi(s: Stato, lato: Lato): void {
  s.giocatori = [
    { x: M.casa[0], y: 0, vx: 0, vy: 0, cm: s.giocatori[0].cm, schiaccia: 0 },
    { x: M.casa[1], y: 0, vx: 0, vy: 0, cm: s.giocatori[1].cm, schiaccia: 0 },
  ];
  s.palla = { x: M.casa[lato], y: M.altoBattuta, vx: 0, vy: 0 };
  s.battuta = lato;
  s.attesa = M.attesa;
  s.tocchi = 0;
  s.latoTocchi = null;
  s.mira = estrai(s) * 2 - 1;
  s.memoriaSalto = [0, 0];
  s.memoriaSchiaccia = [0, 0];
}

/**
 * Partita nuova, a tempo: il seme decide chi batte per primo. durata in tic (secondi × HZ), dai
 * secondi di data/config-gioco.json; cm dei due lati e reteCm da pallavolo.altezze_cm e rete_cm.
 */
export function nuovaPartita(
  seme: number,
  durata: number,
  cm: [number, number] = [M.CM_DEFAULT, M.CM_DEFAULT],
  reteCm = 224,
  finisher: [TipoFinisher, TipoFinisher] = ['fulmine', 'fulmine'],
  opzioni?: { carica?: OpzioniCarica },
): Stato {
  const opz = opzioni?.carica ?? CARICA;
  const s: Stato = {
    tic: 0,
    seme: seme | 0,
    palla: { x: 0, y: 0, vx: 0, vy: 0 },
    giocatori: [
      { x: 0, y: 0, vx: 0, vy: 0, cm: cm[0], schiaccia: 0 },
      { x: 0, y: 0, vx: 0, vy: 0, cm: cm[1], schiaccia: 0 },
    ],
    uPerCm: M.reteAlta / reteCm,
    prima: [FERMO, FERMO],
    memoriaSalto: [0, 0],
    memoriaSchiaccia: [0, 0],
    punti: [0, 0],
    durata,
    battuta: 0,
    attesa: 0,
    tocchi: 0,
    latoTocchi: null,
    ticTocco: 0,
    mira: 0,
    vincitore: null,
    tocco: null,
    carica: [0, 0],
    caricaMax: opz.max,
    opzioniCarica: { ...opz },
    armato: [0, 0],
    finisher: null,
    tipi: [finisher[0], finisher[1]],
    attivo: [0, 0],
  };
  servi(s, estrai(s) < 0.5 ? 0 : 1);
  return s;
}

// Rally point, a tempo: vince chi ha più punti quando il tempo è scaduto. Lo scambio in corso si
// finisce sempre (si controlla solo a punto fatto) e in parità si va avanti: decide il punto dopo.
function punto(s: Stato, lato: Lato): void {
  s.punti[lato]++;
  carica(s, lato, s.opzioniCarica.punto);
  carica(s, lato === 0 ? 1 : 0, s.opzioniCarica.subito);
  if (s.tic >= s.durata && s.punti[0] !== s.punti[1])
    s.vincitore = s.punti[0] > s.punti[1] ? 0 : 1;
  else servi(s, lato);
}

function carica(s: Stato, lato: Lato, n: number): void {
  s.carica[lato] = Math.min(s.carica[lato] + n, s.caricaMax);
}

/** Barra piena e tocco non già armato: il pulsante speciale si accende. */
export function puoSpeciale(s: Stato, lato: Lato): boolean {
  return s.vincitore === null && s.armato[lato] === 0 && s.carica[lato] >= s.caricaMax;
}

const LATI = [0, 1] as const;
const MIN_X = [M.raggioG, M.reteX + M.reteMezza + M.raggioG];
const MAX_X = [M.reteX - M.reteMezza - M.raggioG, M.largo - M.raggioG];

function pareti(p: Palla): void {
  if (p.x < M.raggio) {
    p.x = M.raggio;
    p.vx = -p.vx;
  } else if (p.x > M.largo - M.raggio) {
    p.x = M.largo - M.raggio;
    p.vx = -p.vx;
  }
}

/**
 * Cerchio di tocco del giocatore (le mani alzate): [quota del centro sopra i piedi, raggio]. Il
 * centro è alla cima della testa (mano × cm × uPerCm, non sotto manoMin); il raggio è uguale per tutti.
 */
export function cerchio(s: Stato, g: Corpo): [number, number] {
  return [M.mano * Math.max(g.cm * s.uPerCm, M.manoMin), M.raggioG];
}

// rete: un'asta con la cima tonda. xPrima dice da che lato stava la palla: da sotto non passa.
function rete(p: Palla, xPrima: number): void {
  const dxR = p.x - M.reteX;
  const lim = M.raggio + M.reteMezza;
  if (p.y < M.reteAlta) {
    if (Math.abs(dxR) < lim || (xPrima - M.reteX) * dxR < 0) {
      const lato = xPrima < M.reteX ? -1 : 1;
      p.x = M.reteX + lato * lim;
      p.vx = lato * Math.abs(p.vx);
    }
  } else {
    const dy = p.y - M.reteAlta;
    const d2 = dxR * dxR + dy * dy;
    if (d2 < lim * lim) {
      const d = Math.sqrt(d2);
      const nx = d > 0 ? dxR / d : 0;
      const ny = d > 0 ? dy / d : 1;
      p.x = M.reteX + nx * lim;
      p.y = M.reteAlta + ny * lim;
      const vn = p.vx * nx + p.vy * ny;
      if (vn < 0) {
        p.vx -= 2 * vn * nx;
        p.vy -= 2 * vn * ny;
      }
    }
  }
}

/**
 * La palla si può schiacciare? Giocatore in aria e non già in schiacciata, palla dal suo lato e
 * sopra la rete, centro della palla entro margine dal cerchio di tocco.
 */
function aTiro(s: Stato, l: Lato, margine: number): boolean {
  const g = s.giocatori[l];
  const p = s.palla;
  if (g.y <= 0 || g.schiaccia > 0 || p.y <= M.reteAlta) return false;
  if (l === 0 ? p.x >= M.reteX : p.x <= M.reteX) return false;
  const [centro, raggio] = cerchio(s, g);
  const dx = p.x - g.x;
  const dy = p.y - g.y - centro;
  const d2 = dx * dx + dy * dy;
  // appena toccata in aria da lui con un tocco normale: vale ancora (comando premuto un filo tardi),
  // ma solo con la palla ancora vicina, altrimenti cambierebbe direzione lontano in aria
  const t = s.tocco;
  const vicino = Math.abs(dx) < M.raggio + raggio + M.perdonoVicino;
  if (t && t.lato === l && !t.schiacciata && s.tic - t.tic <= M.perdonoSchiaccia && vicino)
    return true;
  const r = M.raggio + raggio + margine;
  return r > 0 && d2 < r * r;
}

/**
 * Schiacciata del lato l. Dopo n tic la palla è a y + n·vy − g·n(n+1)/2 e deve essere ancora a
 * quota `sopra` quando ha superato la cima tonda della rete (x = reteX ± lim): la traiettoria
 * scende, quindi sopra la rete passa tutta. Si sceglie la vy più in giù che lo permette (non oltre
 * schiacciaGiu). Da lontano serve più velocità orizzontale per scendere: con vy = −1 il tempo
 * massimo è nGiu (radice di g/2·n² + (1+g/2)·n = h), da cui vx = distanza / nGiu, nei limiti.
 */
function schiaccia(p: Palla, l: Lato, f = 1): void {
  const lim = M.raggio + M.reteMezza;
  const sopra = M.reteAlta + lim + 4;
  const dist = Math.abs(M.reteX + (l === 0 ? 1 : -1) * lim - p.x);
  const h = p.y - sopra;
  const a = 1 + M.gravita / 2;
  const nGiu = h > 0 ? (Math.sqrt(a * a + 2 * M.gravita * h) - a) / M.gravita : 0;
  const vx = Math.min(
    nGiu > 0 ? Math.max(M.schiacciaVx * f, dist / nGiu) : M.schiacciaVxMax * f,
    M.schiacciaVxMax * f,
  );
  sopraRete(p, l, vx, sopra, M.schiacciaGiu * f);
}

/** vx data; vy perché la palla passi la cima della rete a quota `sopra` (non più in giù di −giu). */
function sopraRete(p: Palla, l: Lato, vx: number, sopra: number, giu: number): void {
  const dir = l === 0 ? 1 : -1;
  const lim = M.raggio + M.reteMezza;
  const d = Math.abs(M.reteX - p.x);
  // a quota `sopra` sia sul bordo vicino della cima tonda (palla in salita) sia su quello lontano (in discesa)
  const vy = (n: number) => (sopra - p.y) / n + (M.gravita * (n + 1)) / 2;
  p.vx = dir * vx;
  // (da sotto la cima e vicino alla rete non si passa: lì al massimo M.tocco, e la rete la ribatte)
  p.vy = Math.max(-giu, Math.min(vy(Math.max((d - lim) / vx, 1)), M.tocco), vy(Math.max((d + lim) / vx, 1)));
}

/**
 * Palla lanciata a vy (o più, finché passa sopra la rete) che tocca terra a `dist` dalla rete nel
 * campo avversario: il volo si conta tic per tic, come in passo.
 */
function lancia(p: Palla, l: Lato, vy: number, dist: number): void {
  const lim = M.raggio + M.reteMezza;
  for (let su = vy; ; su++) {
    const ys: number[] = [];
    for (let y = p.y, v = su; ys.length < 1000 && (v > 0 || y > M.raggio); ) {
      v = Math.max(v - M.gravita, -M.vMax);
      y += v;
      ys.push(y);
    }
    p.vy = su;
    p.vx = (M.reteX + (l === 0 ? 1 : -1) * dist - p.x) / Math.max(ys.length, 1);
    const sbatte = ys.some(
      (y, i) => y < M.reteAlta + lim && Math.abs(p.x + p.vx * (i + 1) - M.reteX) < lim + Math.abs(p.vx),
    );
    if (!sbatte || su >= M.vMax) return;
  }
}

/** Tocco armato: parte la mossa finale del lato l. La palla è già stata toccata normalmente. */
function mossa(s: Stato, l: Lato): void {
  const p = s.palla;
  const tipo = s.tipi[l];
  s.armato[l] = 0;
  s.carica[l] = 0;
  s.finisher = { lato: l, tipo, tic: s.tic };
  if (tipo === 'fulmine') {
    schiaccia(p, l, p.y > M.reteAlta + M.raggio + M.reteMezza ? M.fulmine : 1); // da sotto la cima: veloce come una normale
    s.giocatori[l].schiaccia = M.durataSchiaccia;
  } else if (tipo === 'dritto')
    sopraRete(p, l, M.drittoVx, M.reteAlta + M.raggio + M.reteMezza + M.drittoSopra, M.schiacciaGiu);
  else if (tipo === 'bomba') lancia(p, l, M.bombaVy, M.bombaDist);
  else if (tipo === 'furba') lancia(p, l, M.furbaVy, M.furbaDist);
  else if (tipo === 'esperienza') lancia(p, l, M.espVy, M.espDist);
  else if (tipo === 'dispetto') lancia(p, l, M.dispettoVy, M.dispettoDist);
  else s.attivo[l] = tipo === 'fischio' ? M.fischioTic : M.scattoTic;
}

/**
 * Premendo schiaccia adesso, la schiacciata del lato partirebbe entro la finestra del comando?
 * Per accendere il pulsante. Si prova davvero: memoriaSchiaccia passi del motore con il comando
 * premuto e gli altri fermi (chi gioca intanto si muove, quindi è una previsione, non una promessa).
 */
export function puoSchiacciare(s: Stato, lato: Lato): boolean {
  const g = s.giocatori[lato];
  if (s.vincitore !== null || g.y <= 0 || g.schiaccia > 0) return false;
  const c: [Comandi, Comandi] = [FERMO, FERMO];
  c[lato] = { ...FERMO, schiaccia: true };
  const prima: [Comandi, Comandi] = [s.prima[0], s.prima[1]];
  prima[lato] = FERMO; // così il comando è una pressione nuova
  let t: Stato = { ...s, prima };
  const punti = s.punti[0] + s.punti[1];
  for (let i = 0; i < M.memoriaSchiaccia; i++) {
    t = passo(t, c);
    if (t.punti[0] + t.punti[1] !== punti) return false;
    if (t.tocco && t.tocco.tic === t.tic && t.tocco.lato === lato && t.tocco.schiacciata) return true;
  }
  return false;
}

/** Un sessantesimo di secondo. Non tocca lo stato ricevuto. A partita finita lo restituisce com'è. */
export function passo(
  prima: Stato,
  comandi: readonly [Comandi, Comandi],
): Stato {
  if (prima.vincitore !== null) return prima;
  // fischio: per M.fischioTic i comandi dell'altra parte sono spenti
  const spento = (l: Lato) => {
    const a = l === 0 ? 1 : 0;
    return prima.tipi[a] === 'fischio' && prima.attivo[a] > 0;
  };
  comandi = [spento(0) ? FERMO : comandi[0], spento(1) ? FERMO : comandi[1]];
  const s: Stato = {
    ...prima,
    tic: prima.tic + 1,
    palla: { ...prima.palla },
    giocatori: [{ ...prima.giocatori[0] }, { ...prima.giocatori[1] }],
    punti: [prima.punti[0], prima.punti[1]],
    prima: [{ ...comandi[0] }, { ...comandi[1] }],
    memoriaSalto: [prima.memoriaSalto[0], prima.memoriaSalto[1]],
    memoriaSchiaccia: [prima.memoriaSchiaccia[0], prima.memoriaSchiaccia[1]],
    carica: [prima.carica[0], prima.carica[1]],
    armato: [prima.armato[0], prima.armato[1]],
    attivo: [prima.attivo[0], prima.attivo[1]],
  };

  // Comandi reattivi. Il salto parte solo su una pressione nuova (tenere il tasto non fa rimbalzare);
  // premuto in aria resta in memoria M.memoriaSalto tic e parte all'atterraggio. Niente "coyote"
  // (salto concesso appena lasciata terra): qui si lascia terra solo saltando.
  for (const l of LATI) {
    const g = s.giocatori[l];
    const c = comandi[l];
    // speciale: sul fronte, a barra piena, arma il prossimo tocco per opzioniCarica.armato tic
    if (c.speciale && !prima.prima[l].speciale && puoSpeciale(prima, l)) s.armato[l] = s.opzioniCarica.armato;
    else if (s.armato[l] > 0) s.armato[l]--;
    const k = s.tipi[l] === 'scatto' && s.attivo[l] > 0 ? M.scatto : 1; // scatto: corsa e salto × M.scatto
    if (s.attivo[l] > 0) s.attivo[l]--;
    if (c.salta && !prima.prima[l].salta) s.memoriaSalto[l] = M.memoriaSalto;
    if (s.memoriaSalto[l] > 0 && g.y === 0) {
      g.vy = M.salto * k;
      s.memoriaSalto[l] = 0;
    } else if (s.memoriaSalto[l] > 0) s.memoriaSalto[l]--;
    if (c.schiaccia && !prima.prima[l].schiaccia) s.memoriaSchiaccia[l] = M.memoriaSchiaccia;
    else if (s.memoriaSchiaccia[l] > 0) s.memoriaSchiaccia[l]--;
    if (g.schiaccia > 0) g.schiaccia--;
    // velocità verso quella voluta: si parte con accelG, si frena (o si inverte) con frenaG
    const voluta = ((c.dx ? 1 : 0) - (c.sx ? 1 : 0)) * M.passoG * k;
    const freno = (voluta === 0 || g.vx * voluta < 0 ? M.frenaG : M.accelG) * k;
    g.vx = g.vx < voluta ? Math.min(g.vx + freno, voluta) : Math.max(g.vx - freno, voluta);
    const x = Math.min(Math.max(g.x + g.vx, MIN_X[l]), MAX_X[l]);
    if (x !== g.x + g.vx) g.vx = 0; // contro la rete o il fondo ci si ferma
    g.x = x;
    g.vy -= M.gravitaG;
    g.y += g.vy;
    if (g.y <= 0) {
      g.y = 0;
      g.vy = 0;
    }
  }

  if (s.attesa > 0) {
    s.attesa--;
    return s;
  }

  const p = s.palla;
  const xPrima = p.x;
  const vyPrima = p.vy;
  p.vy = Math.max(p.vy - M.gravita, -M.vMax);
  p.x += p.vx;
  p.y += p.vy;
  pareti(p);

  // mosse che cambiano la palla in volo, finché nessuno la ritocca dopo la mossa
  const f = s.finisher;
  if (f && s.latoTocchi === f.lato && s.ticTocco === f.tic) {
    const dir = f.lato === 0 ? 1 : -1;
    if (f.tipo === 'esperienza') {
      if (vyPrima > 0 && p.vy <= 0) p.vx *= M.espLento; // in cima rallenta...
      else if (vyPrima >= -M.espRiparte && p.vy < -M.espRiparte) p.vx *= M.espVeloce / M.espLento; // ...poi accelera
    } else if (
      f.tipo === 'dispetto' &&
      p.vy < 0 &&
      (xPrima - M.reteX) * dir < M.dispettoGiro &&
      (p.x - M.reteX) * dir >= M.dispettoGiro
    )
      p.vx = -p.vx;
  }

  rete(p, xPrima);
  const xLato = p.x;

  // tocchi: la palla riparte lungo la linea centro del giocatore → centro della palla, oppure,
  // con il comando, è schiacciata. La schiacciata automatica di prima (ogni tocco in aria più
  // forte) è tolta: col pulsante sarebbe stata un doppione, e una palla che parte forte senza
  // averlo chiesto è difficile da controllare per chi gioca.
  for (const l of LATI) {
    const g = s.giocatori[l];
    if (g.schiaccia > 0) continue; // ha appena schiacciato: la palla se ne va, non la ritocca
    const fl = s.finisher; // idem subito dopo la propria mossa finale
    if (fl && fl.lato === l && s.tic - fl.tic < M.durataSchiaccia) continue;
    const [centro, raggio] = cerchio(s, g);
    const R = M.raggio + raggio;
    const cx = g.x;
    const cy = g.y + centro;
    const dx = p.x - cx;
    const dy = p.y - cy;
    const d2 = dx * dx + dy * dy;
    // corpo: capsula dai piedi alla testa. La palla non passa: bagher in alto verso la rete
    const by = Math.min(Math.max(p.y, g.y), g.y + g.cm * s.uPerCm);
    const bx = p.x - g.x;
    const b2 = bx * bx + (p.y - by) * (p.y - by);
    const Rb = M.raggio + M.corpo;
    const corpo = b2 < Rb * Rb;
    if (s.memoriaSchiaccia[l] > 0 && aTiro(s, l, M.margineSchiaccia)) {
      schiaccia(p, l);
      g.schiaccia = M.durataSchiaccia;
      s.memoriaSchiaccia[l] = 0;
    } else if (d2 < R * R && !(corpo && dy < 0)) {
      // mani: sopra il centro del cerchio, o di lato senza toccare il corpo
      const d = Math.sqrt(d2);
      const nx = d > 0 ? dx / d : 0;
      const ny = d > 0 ? dy / d : 1;
      p.x = cx + nx * R;
      p.y = cy + ny * R;
      p.vx = nx * M.tocco;
      p.vy = Math.max(ny * M.tocco, M.alzata); // mai verso terra: la palla presa di lato o da sotto sale
    } else if (corpo) {
      const b = Math.sqrt(b2);
      const dir = l === 0 ? 1 : -1;
      p.x = g.x + (b > 0 ? bx / b : dir) * Rb;
      p.y = by + (b > 0 ? (p.y - by) / b : 0) * Rb;
      p.vx = dir * M.bagherVx;
      p.vy = M.alzata;
    } else continue;
    const nuovo = s.latoTocchi !== l || s.tic - s.ticTocco > M.pausaTocco;
    if (nuovo) carica(s, l, g.schiaccia === M.durataSchiaccia ? s.opzioniCarica.schiacciata : s.opzioniCarica.tocco);
    if (s.armato[l] > 0) mossa(s, l);
    s.tocco = { tic: s.tic, lato: l, schiacciata: g.schiaccia === M.durataSchiaccia };
    s.ticTocco = s.tic;
    if (!nuovo) continue;
    s.tocchi = s.latoTocchi === l ? s.tocchi + 1 : 1;
    s.latoTocchi = l;
    s.mira = estrai(s) * 2 - 1;
    if (s.tocchi > M.tocchiMax) {
      pareti(p);
      punto(s, l === 0 ? 1 : 0);
      return s;
    }
  }
  // un tocco a ridosso della rete o del muro non deve spingere la palla dall'altra parte
  rete(p, xLato);
  pareti(p);

  if (p.y - M.raggio <= 0) punto(s, p.x < M.reteX ? 1 : 0);
  return s;
}

/**
 * CPU: funzione pura dello stato. Va dove scenderà la palla, un po' dietro per mandarla verso la
 * rete; dal secondo tocco salta e, se la palla è a tiro, schiaccia. `errore` (in unità di campo) è
 * quanto sbaglia la mira: 0 = precisa. Sbaglia anche il tempo della schiacciata: preme quando la
 * palla è entro margineSchiaccia + mira × errore, cioè a volte troppo presto (il comando scade) o
 * mai (tocco normale). mira cambia a ogni tocco: deterministico, senza estrazioni in più.
 * ponytail: la previsione ignora la rete; se la CPU sembra tonta sotto rete, aggiungerla qui.
 */
export function ia(s: Stato, lato: Lato, errore: number): Comandi {
  const g = s.giocatori[lato];
  let { x, y, vx, vy } = s.palla;
  const [centro, raggio] = cerchio(s, g);
  const quota = centro + raggio + M.raggio;
  for (let i = 0; i < 300 && (vy > 0 || y > quota); i++) {
    vy = Math.max(vy - M.gravita, -M.vMax);
    x += vx;
    y += vy;
    if (x < M.raggio) {
      x = M.raggio;
      vx = -vx;
    } else if (x > M.largo - M.raggio) {
      x = M.largo - M.raggio;
      vx = -vx;
    }
  }
  const mia = lato === 0 ? x < M.reteX : x > M.reteX;
  const meta = mia
    ? x + (lato === 0 ? -1 : 1) * M.scartoIA + s.mira * errore
    : M.casa[lato];
  const dx = meta - g.x;
  const alta = s.palla.y - (g.y + centro);
  const salta =
    mia &&
    s.attesa === 0 &&
    s.tocchi >= 1 &&
    s.palla.vy < 0 &&
    Math.abs(s.palla.x - g.x) < M.saltoIA[0] &&
    alta > M.saltoIA[1] &&
    alta < M.saltoIA[2];
  const schiaccia =
    Math.abs(s.palla.x - M.reteX) < M.schiacciaIA &&
    aTiro(s, lato, M.margineSchiaccia + s.mira * errore);
  // mossa finale: a barra piena, con la palla in arrivo, una volta ogni tanto. Il numero viene dal
  // seme, che cambia a ogni tocco: deterministico, e ia resta pura (non estrae).
  const speciale =
    mia && s.attesa === 0 && puoSpeciale(s, lato) && caso(s.seme + lato)[0] < M.specialeIA;
  return { sx: dx < -M.passoG, dx: dx > M.passoG, salta, schiaccia, speciale };
}
