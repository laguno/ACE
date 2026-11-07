import { useState } from 'react';

// R-Evolution resta nascosta nello sprint 1: comparirà con un popup di annuncio.
const VOCI = ['Oggi', 'Studio', 'Sera', 'Astra'] as const;
type Voce = (typeof VOCI)[number];

export default function App() {
  const [voce, setVoce] = useState<Voce>('Oggi');
  return (
    <>
      <main>
        <h1>{voce}</h1>
      </main>
      <nav className="barra" aria-label="Sezioni">
        {VOCI.map((v) => (
          <button key={v} aria-current={v === voce ? 'page' : undefined} onClick={() => setVoce(v)}>
            {v}
          </button>
        ))}
      </nav>
    </>
  );
}
