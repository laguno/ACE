import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Icona provvisoria: pallone. Alternative pronte in public/icone/ (saluta, passo): la sceglie Lani.
const ICONA = 'pallone';

export default defineConfig({
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
      },
    }),
  ],
});
