import { useEffect, useState } from 'react';
import { supabase } from './supabase';

// Passi che salgono (decisione del signore, 9/11): se il saldo è cambiato dall'ultima volta che Lani
// l'ha visto (su qualsiasi dispositivo: lo ricorda il server con vedi_saldo), il numero va dal vecchio
// al nuovo in circa un secondo, con un piccolo "+N" che compare e svanisce. Con il movimento ridotto
// si vede subito il numero nuovo.

export type Saldo = { prima: number; adesso: number };

// due richieste insieme (StrictMode, due schermate montate di fila) condividono la stessa risposta:
// la seconda altrimenti troverebbe il saldo già visto e il numero non salirebbe
let inCorso: Promise<Saldo> | null = null;

/** Legge il saldo e quello visto l'ultima volta; da qui in poi il saldo risulta visto. */
export function vediSaldo(): Promise<Saldo> {
  inCorso ??= Promise.resolve(supabase.rpc('vedi_saldo').single<Saldo>())
    .then(async ({ data }) => {
      if (data) return data;
      // senza risposta il saldo non diventa 0: si legge com'è, senza farlo salire
      const { data: s } = await supabase.from('saldo_passi').select('passi').maybeSingle();
      const adesso = (s?.passi as number | undefined) ?? 0;
      return { prima: adesso, adesso };
    })
    .finally(() => (inCorso = null));
  return inCorso;
}

const DURATA = 1000;
const movimentoRidotto = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const formato = (n: number) => n.toLocaleString('it-IT');

/** Pillola del saldo per le testate (Oggi): impronta e numero che sale. */
export function PillolaSaldo() {
  const [saldo, setSaldo] = useState<Saldo>();
  useEffect(() => {
    vediSaldo().then(setSaldo);
  }, []);
  // mentre il saldo arriva la pillola tiene il suo posto (invisibile): prima compariva dopo e
  // spingeva giù le carte (Lighthouse, spostamento 0,25 sul Pomeriggio)
  if (!saldo)
    return (
      <span className="saldo" aria-hidden style={{ visibility: 'hidden' }}>
        <img src="/assets/oggetti/passo.webp" alt="" width={30} height={30} />
        <b>0</b>
      </span>
    );
  return (
    <span className="saldo">
      <img src="/assets/oggetti/passo.webp" alt="" width={30} height={30} />
      <Contapassi {...saldo} />
    </span>
  );
}

export function Contapassi({ prima, adesso, className = '' }: Saldo & { className?: string }) {
  const sale = prima !== adesso && !movimentoRidotto();
  const [mostrato, setMostrato] = useState(sale ? prima : adesso);

  useEffect(() => {
    if (!sale) {
      setMostrato(adesso);
      return;
    }
    let fotogramma = 0;
    let inizio: number | undefined;
    const passo = (t: number) => {
      inizio ??= t;
      const k = Math.min(1, (t - inizio) / DURATA);
      const piano = 1 - (1 - k) ** 3; // parte svelto e rallenta in fondo
      setMostrato(Math.round(prima + (adesso - prima) * piano));
      if (k < 1) fotogramma = requestAnimationFrame(passo);
    };
    fotogramma = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(fotogramma);
  }, [prima, adesso, sale]);

  const d = adesso - prima;
  return (
    <span className={`contapassi ${className}`}>
      <b aria-hidden>{formato(mostrato)}</b>
      <span className="solo-lettori" role="status">{formato(adesso)} passi</span>
      {sale && (
        <span className={`contapassi-delta ${d > 0 ? 'su' : 'giu'}`} aria-hidden>
          {d > 0 ? `+${formato(d)}` : `−${formato(-d)}`}
        </span>
      )}
    </span>
  );
}
