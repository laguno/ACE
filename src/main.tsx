import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App, { SenzaRete } from './App';
import Errore from './Errore';
import { ascoltaErrori } from './errori';
// font dentro l'app (niente richieste a Google, funzionano offline): Baloo 2 per titoli e numeri, Nunito per il testo.
// Solo l'alfabeto latino (all'italiano basta): niente cirillico, greco e vietnamita da scaricare.
import '@fontsource/baloo-2/latin-800.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
// corsivo vero per il motto di Astra e il biglietto dell'enigma (prima il browser lo inclinava da solo)
import '@fontsource/nunito/latin-600-italic.css';
import '@fontsource/nunito/latin-800-italic.css';
import './stile.css';

ascoltaErrori();

// Versione nuova: il service worker nuovo prende il posto del vecchio e la pagina si ricarica da sola
// (autoUpdate). Il browser però la cerca solo quando l'app si apre da zero: un'app lasciata in
// sottofondo sul telefono resterebbe vecchia per giorni. Si controlla anche a ogni rientro.
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (reg) document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && reg.update().catch(() => {}));
  },
});

const radice = document.getElementById('root');
if (!radice) throw new Error('manca #root in index.html');
createRoot(radice).render(
  <StrictMode>
    <SenzaRete />
    <Errore>
      <Suspense fallback={null}>
        <App />
      </Suspense>
    </Errore>
  </StrictMode>,
);
