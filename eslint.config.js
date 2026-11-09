import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// typescript-eslint strict. no-undef spento sui file TypeScript: lo controlla già tsc (consiglio di typescript-eslint).
export default tseslint.config(
  { ignores: ['dist', 'dist-lh', 'dev-dist', 'coverage', '.claude', '.agents', '.vercel', 'e2e/risultati', 'playwright-report', '.lighthouseci', 'public/push-sw.js'] },
  js.configs.recommended,
  tseslint.configs.strict,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-undef': 'off',
      // ({ [id]: _, ...resto }) toglie una chiave: il nome scartato non è un errore
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
  },
  // nelle prove un null fa fallire la prova da solo: il "!" lì non nasconde niente
  { files: ['**/*.test.ts', 'e2e/**/*.ts'], rules: { '@typescript-eslint/no-non-null-assertion': 'off' } },
  // tipi di librerie che nel progetto non ci sono (SDK di Anthropic, ical.js, web-push): any voluto
  { files: ['**/*.d.ts'], rules: { '@typescript-eslint/no-explicit-any': 'off' } },
  { files: ['**/*.{js,mjs,cjs}'], languageOptions: { globals: { process: 'readonly', console: 'readonly', URL: 'readonly', setTimeout: 'readonly', fetch: 'readonly', Buffer: 'readonly' } } },
);
