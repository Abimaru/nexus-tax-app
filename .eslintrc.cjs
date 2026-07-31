/**
 * Configuración ESLint base del monorepo NexusTax.
 * Los paquetes heredan esta configuración por cascada; apps/web añade
 * `eslint-config-next` en su propio `.eslintrc`.
 */
/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  env: {
    es2022: true,
    browser: true,
    node: true,
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    // Sin `any` injustificado (requisito §17). Se permite silenciar puntualmente.
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
    ],
    '@typescript-eslint/consistent-type-imports': [
      'warn',
      { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
    ],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    eqeqeq: ['error', 'smart'],
  },
  ignorePatterns: [
    'node_modules',
    'dist',
    '.next',
    'out',
    'coverage',
    'playwright-report',
    'test-results',
    '*.config.js',
    '*.config.cjs',
    '*.config.mjs',
  ],
};
