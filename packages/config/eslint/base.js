import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default [
  {
    ignores: [
      '**/.svelte-kit/**',
      '**/.turbo/**',
      '**/.wrangler/**',
      '**/build/**',
      '**/coverage/**',
      '**/dist/**',
      '**/migrations/**',
      '**/node_modules/**',
      '**/src-tauri/target/**',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  {
    files: ['**/*.svelte', '**/*.svelte.js', '**/*.svelte.ts'],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
      },
    },
  },
  {
    languageOptions: {
      parserOptions: {
        // Matches the TypeScript parser setup so Svelte files parse the same way.
        extraFileExtensions: ['.svelte'],
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // No base path is configured, so resolve() would be a no-op. Kit 3 also types
      // the argument as a route id, while the app links to root-absolute paths.
      'svelte/no-navigation-without-resolve': ['error', { ignoreGoto: true, ignoreLinks: true }],
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      // Ambient declarations augment globals without referencing them.
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];
