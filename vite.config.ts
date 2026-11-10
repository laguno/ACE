import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Icona provvisoria: pallone. Alternative pronte in public/icone/ (saluta, passo): la sceglie Lani.
const ICONA = 'pallone';

export default defineConfig({
  // le copie di lavoro degli agenti (.claude/worktrees) non sono prove di questo ramo
  test: {
    exclude: [...configDefaults.exclude, '.claude/**'],
    // le Edge Functions importano da npm: come Deno; nelle prove le stesse librerie, o finti senza rete
    alias: {
      'npm:@supabase/supabase-js@2': '@supabase/supabase-js',
      'npm:ical.js@2.1.0': 'ical.js',
      'npm:@anthropic-ai/sdk': fileURLToPath(new URL('./supabase/functions/_prove/anthropic-finto.ts', import.meta.url)),
      'npm:web-push@3.6.7': fileURLToPath(new URL('./supabase/functions/_prove/web-push-finto.ts', import.meta.url)),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icone/*.png'],
      manifest: {
        name: 'ACE',
        short_name: 'ACE',
        description: "L'app di famiglia di Lani",
        lang: 'it',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#C2185B',
        background_color: '#FFF6FA',
        icons: [
          { src: `/icone/${ICONA}-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `/icone/${ICONA}-512.png`, sizes: '512x512', type: 'image/png' },
          { src: `/icone/${ICONA}-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,webp,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        importScripts: ['push-sw.js'],
        // Senza rete: le letture di Supabase (GET /rest/v1) vanno prima in rete e, se la rete non
        // c'è, si prende l'ultima risposta salvata. Così Lani vede l'ultima situazione, non una
        // pagina vuota. Fuori la tabella forzieri dei genitori (premi): solo forzieri_lani.
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/rest/v1/') && url.pathname !== '/rest/v1/forzieri',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ace-dati',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 3600 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
});
