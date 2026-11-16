// Configurazione di Vercel (al posto di vercel.json, che è statico: se ne può avere uno solo).
// Questo file gira al build, quindi la CSP nomina il progetto Supabase dell'ambiente:
// VITE_SUPABASE_URL di Production per ACE vera, di Preview per ace-prova (docs/10-ambiente-di-prova.md).
// Senza la variabile vale la produzione: una preview non configurata resta bloccata, mai il contrario.
// Un indirizzo scritto male fa fallire il build (new URL), non pubblica una CSP sbagliata.
const supabase = new URL(process.env.VITE_SUPABASE_URL || 'https://qonullxzhqvbfpiibqye.supabase.co').host;

export const config = {
  headers: [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        {
          key: 'Content-Security-Policy',
          value: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob: https://${supabase}; font-src 'self'; connect-src 'self' https://${supabase} wss://${supabase}; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`,
        },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      ],
    },
  ],
};
