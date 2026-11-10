// SDK di Anthropic finto per le prove delle funzioni: nessuna chiamata vera all'IA.
// Le risposte si mettono in coda (testo JSON, come output_config json_schema) e le chiamate si contano.
type Stato = { coda: unknown[]; chiamate: Record<string, unknown>[]; rifiuta: boolean };
// su globalThis: vi.resetModules rifà il modulo, la prova e la funzione devono vedere la stessa coda
const g = globalThis as unknown as { __iaAce?: Stato };
export const ia: Stato = (g.__iaAce ??= { coda: [], chiamate: [], rifiuta: false });

export default class Anthropic {
  beta = {
    messages: {
      create: async (p: Record<string, unknown>) => {
        ia.chiamate.push(p);
        if (ia.rifiuta) return { stop_reason: 'refusal', content: [] };
        const r = ia.coda.shift();
        if (r instanceof Error) throw r;
        if (r === undefined) throw new Error('anthropic finto: coda vuota');
        return { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(r) }] };
      },
    },
  };
}
