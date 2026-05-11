import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'public/api/**',
      'data/**',
      'lib/crawler.js',
      'lib/job-normalizer.js',
    ],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}', 'server/**/*.js', 'lib/**/*.js', 'scripts/**/*.{js,mjs}', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-console': 'off',
      'no-empty': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^(React|_)' }],
      'no-useless-escape': 'warn',
      'preserve-caught-error': 'off',
    },
  },
];
