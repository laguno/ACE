import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// typescript-eslint strict. no-undef spento sui file TypeScript: lo controlla già tsc (consiglio di typescript-eslint).
export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'coverage', '.claude', '.vercel', 'e2e/risultati', 'playwright-report', '.lighthouseci', 'public/push-sw.js'] },
  js.configs.recommended,
  tseslint.configs.strict,
  { files: ['**/*.{ts,tsx}'], rules: { 'no-undef': 'off' } },
  { files: ['**/*.{js,mjs,cjs}'], languageOptions: { globals: { process: 'readonly', console: 'readonly', URL: 'readonly', setTimeout: 'readonly', fetch: 'readonly', Buffer: 'readonly' } } },
);
