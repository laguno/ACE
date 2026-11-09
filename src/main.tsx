import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// font dentro l'app (niente richieste a Google, funzionano offline): Baloo 2 per titoli e numeri, Nunito per il testo
import '@fontsource/baloo-2/800.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
// corsivo vero per il motto di Astra e il biglietto dell'enigma (prima il browser lo inclinava da solo)
import '@fontsource/nunito/600-italic.css';
import '@fontsource/nunito/800-italic.css';
import './stile.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
