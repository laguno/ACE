// Tipi minimi per controllare le Edge Functions con tsc (npm run tipi:funzioni), senza Deno installato.
// supabase-js e ical.js arrivano da node_modules (stesse versioni); SDK di Anthropic e web-push non
// sono nel progetto: any.
declare const Deno: {
  env: { get(nome: string): string | undefined };
  serve(gestore: (req: Request) => Response | Promise<Response>): void;
};
declare module 'npm:@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js';
}
declare module 'npm:ical.js@2.1.0' {
  import ICAL from 'ical.js';
  export default ICAL;
}
declare module 'npm:@anthropic-ai/sdk';
declare module 'npm:web-push@3.6.7';
