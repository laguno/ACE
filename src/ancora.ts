// Un tocco su una voce della tabellina apre la schermata giusta e porta al punto in cui si fa
// (attributo data-ancora, o id). La schermata può arrivare dopo (caricata al primo tocco, dati in
// arrivo): si cerca il punto per un paio di secondi, poi si lascia stare.

let giro: ReturnType<typeof setInterval> | undefined;

export function cercaAncora(id: string | undefined) {
  clearInterval(giro);
  if (!id) return void window.scrollTo?.({ top: 0 });
  let n = 0;
  giro = setInterval(() => {
    const el = document.querySelector(`[data-ancora="${id}"], #${CSS.escape(id)}`);
    if (el || ++n > 40) {
      clearInterval(giro);
      el?.scrollIntoView({ block: 'start', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }, 50);
}
