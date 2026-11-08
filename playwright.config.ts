import { defineConfig, devices } from '@playwright/test';

// Prove delle schermate a 390 px con un Supabase finto (e2e/finto.ts): nessun dato vero, nessuna
// credenziale. L'indirizzo finto fa sì che una richiesta non intercettata fallisca invece di
// arrivare al database di famiglia.
export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.e2e.ts',
  outputDir: 'e2e/risultati',
  use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', baseURL: 'http://localhost:5179', locale: 'it-IT', timezoneId: 'Europe/Rome' },
  webServer: {
    command: 'npx vite --port 5179 --strictPort',
    url: 'http://localhost:5179',
    reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: 'https://finto.supabase.test', VITE_SUPABASE_PUBLISHABLE_KEY: 'finta' },
  },
});
