import { describe, expect, it } from 'vitest';
import { CONFIG, type Config } from './index';
import { blocchiPassi } from './come-passi';

// Ogni numero della pagina "Come si fanno i passi" viene dal config: si sostituisce ogni numero del
// config con un valore sentinella diverso e si controlla che nella pagina compaiano solo quelli
// (o i loro derivati: percentuali, valore assoluto, prodotti per l'anticipo) e le cifre dei nomi
// delle chiavi del config ("9-10", "media_7_5"). Un numero scritto a mano nel testo fa fallire.

function sentinelle(c: Config) {
  const valori: number[] = [];
  const cifreChiavi = new Set<string>();
  let n = 1000;
  const giro = (x: unknown): unknown => {
    if (typeof x === 'number') {
      n += 7;
      const s = x > 0 && x < 1 ? (n % 90) / 100 + 0.01 : x < 0 ? -n : n;
      valori.push(s);
      return s;
    }
    if (Array.isArray(x)) return x.map(giro);
    if (x && typeof x === 'object')
      return Object.fromEntries(
        Object.entries(x).map(([k, v]) => {
          for (const d of k.match(/\d+/g) ?? []) cifreChiavi.add(d);
          return [k, giro(v)];
        }),
      );
    return x;
  };
  return { finto: giro(structuredClone(c)) as Config, valori, cifreChiavi };
}

describe('Come si fanno i passi', () => {
  for (const rEvolution of [false, true]) {
    it(`nessun numero scritto a mano (R-Evolution ${rEvolution ? 'accesa' : 'spenta'})`, () => {
      const { finto, valori, cifreChiavi } = sentinelle(CONFIG);
      const ammessi = new Set<string>(cifreChiavi);
      for (const v of valori) {
        ammessi.add(String(Math.abs(v)));
        ammessi.add(String(Math.round(v * 100)));
      }
      // compiti in anticipo: base × moltiplicatore
      ammessi.add(String(Math.round(finto.passi.obbligatori.compiti * finto.passi.compiti_anticipo.moltiplicatore)));
      // orari dei dieci minuti: stringhe del config
      for (const d of `${finto.dieci_minuti.finestra.da} ${finto.dieci_minuti.finestra.a} ${finto.dieci_minuti.finestra.ultimo_avvio} ${finto.dieci_minuti.giorni_a_settimana}`.match(/\d+/g) ?? []) ammessi.add(d);
      const testo = JSON.stringify(blocchiPassi(finto, { rEvolution }));
      const trovati = testo.match(/\d+/g) ?? [];
      expect(trovati.length).toBeGreaterThan(10);
      expect(trovati.filter((d) => !ammessi.has(d))).toEqual([]);
    });
  }

  it('R-Evolution solo se accesa; una riga per voce con il numero a destra', () => {
    const spenta = blocchiPassi(CONFIG, { rEvolution: false });
    const accesa = blocchiPassi(CONFIG, { rEvolution: true });
    expect(spenta.map((b) => b.id)).toEqual(['ogni-giorno', 'studio', 'voti', 'casa', 'meno', 'chiavi']);
    expect(accesa.map((b) => b.id)).toContain('r-evolution');
    expect(spenta.flatMap((b) => b.voci).every((v) => v.testo && v.valore)).toBe(true);
    expect(spenta[0].voci[0]).toMatchObject({ testo: 'Compiti per domani fatti', valore: `+${CONFIG.passi.obbligatori.compiti}` });
  });

  it('glossario (18/11): icona e cosa fare per ogni voce, gesti di casa uno per uno', () => {
    const blocchi = blocchiPassi(CONFIG, { rEvolution: true });
    const voci = blocchi.filter((b) => b.id !== 'chiavi').flatMap((b) => b.voci);
    expect(voci.every((v) => v.icona)).toBe(true);
    // i voti hanno una sola spiegazione, sulla prima riga
    expect(voci.filter((v) => !v.spiega).every((v) => v.testo.startsWith('Voto da'))).toBe(true);
    const casa = blocchi.find((b) => b.id === 'casa')!;
    expect(casa.voci.map((v) => v.testo)).toEqual(['Scrivania in ordine', 'Lavastoviglie', 'Letto fatto', 'Vestiti in ordine']);
    expect(casa.voci.map((v) => v.valore)).toEqual(Object.values(CONFIG.passi.gesti_casa.voci).map((n) => `+${n}`));
    expect(casa.dettagli.join(' ')).toContain(`+${CONFIG.passi.gesti_casa.tetto_giornaliero}`);
  });
});
