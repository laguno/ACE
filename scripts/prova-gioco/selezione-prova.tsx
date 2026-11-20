// Pagina di prova: monta Selezione da sola e mostra l'ultima scelta passata a onGioca.
import { createRoot } from 'react-dom/client';
import '../../src/stile.css';
import Selezione from '../../src/gioco/Selezione';

createRoot(document.getElementById('root')!).render(
  <Selezione onGioca={(s) => ((window as unknown as { scelta: unknown }).scelta = s)} />,
);
