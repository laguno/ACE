import type { CapacitorConfig } from '@capacitor/cli';

// Guscio Android di ACE (docs/07-installazione.md): una WebView che apre la produzione, così Family
// Link conta il tempo su ACE e non su Chrome, e gli aggiornamenti arrivano senza reinstallare.
// webDir serve solo a "cap sync": con server.url la pagina viene sempre dalla rete.
const config: CapacitorConfig = {
  appId: 'it.messori.ace',
  appName: 'ACE',
  webDir: 'dist',
  server: { url: 'https://ace-passino.vercel.app', cleartext: false },
  android: { allowMixedContent: false },
  plugins: {
    PushNotifications: { presentationOptions: ['alert', 'sound'] },
    // barre di sistema gestite da MainActivity (margini, fondo rosa); icone chiare sul rosa
    SystemBars: { insetsHandling: 'disable', style: 'DARK' },
  },
};

export default config;
