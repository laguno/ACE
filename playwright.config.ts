import { defineConfig, devices } from '@playwright/test';

// Prove delle schermate a 390 px con un Supabase finto (e2e/finto.ts): nessun dato vero, nessuna
// credenziale. L'indirizzo finto fa sì che una richiesta non intercettata fallisca invece di
// arrivare al database di famiglia.
// Due server: vite in sviluppo per quasi tutte le prove; la build vera (con il service worker) per
// le prove di rete assente e aggiornamento (e2e/pwa.e2e.ts). Porte spostabili con PORTA_PROVE,
// se un'altra copia del progetto ha già le sue prove accese.
const PORTA = Number(process.env.PORTA_PROVE ?? 5179);
const FINTO = { VITE_SUPABASE_URL: 'https://finto.supabase.test', VITE_SUPABASE_PUBLISHABLE_KEY: 'finta' };
process.env.PORTA_PROVE = String(PORTA);
// le richieste fatte dal service worker passano anche loro da context.route (Supabase finto)
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';

export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.e2e.ts',
  outputDir: 'e2e/risultati',
  use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', baseURL: `http://localhost:${PORTA}`, locale: 'it-IT', timezoneId: 'Europe/Rome' },
  webServer: [
    { command: `npx vite --port ${PORTA} --strictPort`, url: `http://localhost:${PORTA}`, reuseExistingServer: false, env: FINTO },
    {
      command: `npx vite build --outDir dist-prove --emptyOutDir && npx vite preview --outDir dist-prove --port ${PORTA + 2} --strictPort`,
      url: `http://localhost:${PORTA + 2}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: FINTO,
    },
  ],
});
