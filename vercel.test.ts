// La CSP di vercel.ts segue l'ambiente: nomina solo il progetto Supabase di VITE_SUPABASE_URL.
import { afterEach, expect, it, vi } from 'vitest';

const csp = async () => {
  vi.resetModules();
  const { config } = await import('./vercel');
  return config.headers[0].headers.find((h) => h.key === 'Content-Security-Policy')!.value;
};

afterEach(() => vi.unstubAllEnvs());

it('senza variabile vale la produzione', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', '');
  expect(await csp()).toContain('connect-src \'self\' https://qonullxzhqvbfpiibqye.supabase.co wss://qonullxzhqvbfpiibqye.supabase.co;');
});

it("in prova nomina solo il progetto di prova, mai quello vero", async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://prova.supabase.test/');
  const v = await csp();
  expect(v).toContain('img-src \'self\' data: blob: https://prova.supabase.test;');
  expect(v).toContain('connect-src \'self\' https://prova.supabase.test wss://prova.supabase.test;');
  expect(v).not.toContain('qonullxzhqvbfpiibqye');
});

it('un indirizzo scritto male ferma il build', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'non un indirizzo');
  await expect(csp()).rejects.toThrow();
});
