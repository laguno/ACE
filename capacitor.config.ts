import type { CapacitorConfig } from '@capacitor/cli';

// Guscio Android di ACE (docs/07-installazione.md): una WebView che apre la produzione, così Family
// Link conta il tempo su ACE e non su Chrome, e gli aggiornamenti arrivano senza reinstallare.
// webDir serve solo a "cap sync": con server.url la pagina viene sempre dalla rete.
//
// "ACE Prova" (docs/10-ambiente-di-prova.md): con ACE_AMBIENTE=prova il guscio ha un altro
// identificatore e apre il sito di prova (ACE_URL_PROVA), così sta accanto ad ACE vera sul telefono.
// Lo imposta scripts\apk.ps1 -Ambiente prova; senza variabili questo file dà ACE vera, come prima.
const prova = process.env.ACE_AMBIENTE === 'prova';
if (prova && !process.env.ACE_URL_PROVA?.startsWith('https://')) throw new Error('ACE Prova: manca ACE_URL_PROVA (https://...), il sito di prova');

const config: CapacitorConfig = {
  appId: prova ? 'it.messori.ace.prova' : 'it.messori.ace',
  appName: prova ? 'ACE Prova' : 'ACE',
  webDir: 'dist',
  server: { url: prova ? process.env.ACE_URL_PROVA : 'https://ace-passino.vercel.app', cleartext: false },
  android: { allowMixedContent: false },
  plugins: {
    PushNotifications: { presentationOptions: ['alert', 'sound'] },
    // barre di sistema gestite da MainActivity (margini, fondo rosa); icone chiare sul rosa
    SystemBars: { insetsHandling: 'disable', style: 'DARK' },
  },
};

export default config;
