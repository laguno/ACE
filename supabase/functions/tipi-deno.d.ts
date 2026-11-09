// Tipi minimi per controllare le Edge Functions con tsc (npm run tipi:funzioni), senza Deno installato.
// supabase-js arriva da node_modules; SDK di Anthropic, ical.js e web-push non sono nel progetto: any.
declare const Deno: {
  env: { get(nome: string): string | undefined };
  serve(gestore: (req: Request) => Response | Promise<Response>): void;
};
declare module 'npm:@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js';
}
declare module 'npm:@anthropic-ai/sdk';
declare module 'npm:ical.js@2.1.0' {
  // deno-lint-ignore no-explicit-any
  const ICAL: any;
  namespace ICAL {
    // deno-lint-ignore no-explicit-any
    type Time = any;
    // deno-lint-ignore no-explicit-any
    type Component = any;
    // deno-lint-ignore no-explicit-any
    type Event = any;
  }
  export default ICAL;
}
declare module 'npm:web-push@3.6.7';
