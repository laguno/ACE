// Biglietto dell'enigma (data/enigmi.json): testo semplice; i blocchi tra due righe ``` (griglie,
// tabelle, striscia dell'alfabeto, messaggi in codice) a larghezza fissa, leggibili anche a 360 px.
// Una riga troppo lunga va a capo invece di uscire dal biglietto.

export function Biglietto({ testo, aiutino }: { testo: string; aiutino?: string | null }) {
  const pezzi = testo.split(/^```\s*$/m);
  return (
    <div className="biglietto">
      {pezzi.map((p, i) => {
        const t = p.replace(/^\n+|\n+$/g, '');
        if (!t) return null;
        return i % 2 ? (
          <pre key={i} className="biglietto-blocco">
            {t}
          </pre>
        ) : (
          <p key={i}>{t}</p>
        );
      })}
      {aiutino && (
        <p className="biglietto-aiutino">
          <b>Aiutino:</b> {aiutino}
        </p>
      )}
    </div>
  );
}
