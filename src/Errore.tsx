import { Component, type ReactNode } from 'react';
import { registraErrore } from './errori';

// Se una schermata si rompe, niente pagina bianca: un messaggio e il pulsante per ripartire.
// L'errore va nel registro (scheda Stato dei genitori). Testo da approvare (rapporto, Da decidere).
export default class Errore extends Component<{ children: ReactNode }, { rotto: boolean }> {
  state = { rotto: false };

  static getDerivedStateFromError() {
    return { rotto: true };
  }

  componentDidCatch(e: unknown) {
    registraErrore('schermata', e);
  }

  render() {
    if (!this.state.rotto) return this.props.children;
    return (
      <main className="errore-app">
        <h1>Qualcosa non va</h1>
        <p>Non è colpa tua. Riapri ACE e riprova.</p>
        <button className="principale" onClick={() => location.reload()}>
          Riapri ACE
        </button>
      </main>
    );
  }
}
