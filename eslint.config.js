import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Rules shared by every block (applied last so they win):
// - empty `catch {}` is used deliberately for best-effort storage/network calls;
// - unused caught errors and `_`-prefixed names are intentional;
// - react-hooks/set-state-in-effect (new in react-hooks 7): every hit restores a
//   saved choice from localStorage after mount so SSR/prerendered markup matches
//   hydration, or kicks off a fetch whose state lives in the component. That is
//   the pattern the rule warns about, but here it is on purpose.
export default defineConfig([
  globalIgnores(['dist', 'dist-ssr', 'node_modules', '.wrangler']),

  // React app (browser)
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Vite config (Node, TS)
  {
    files: ['vite.config.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
  },

  // Cloudflare Pages advanced-mode worker
  {
    files: ['_worker.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.serviceworker,
    },
  },

  // Service worker served from public/
  {
    files: ['public/sw.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.serviceworker },
  },

  // Node scripts and servers
  {
    files: ['scripts/**/*.{js,mjs,cjs}', 'public/**/*.cjs', 'neural-server/**/*.mjs', '*.config.js', 'webhook-server-no-docker.js', 'eslint.config.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
  },

  {
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: { 'react-hooks/set-state-in-effect': 'off' },
  },
])
