// ESLint flat config (ESLint 9, typescript-eslint 8).
// Same intent as the former .eslintrc.json; see the comments for rules that
// newer plugin versions added and that are kept off on purpose.
//
// eslint-suppressions.json lists existing code that typescript-eslint 8
// reports with its stricter type-aware checks (await-thenable,
// no-base-to-string, no-unsafe-enum-comparison, only-throw-error,
// prefer-promise-reject-errors). The rules stay on for new code; fixing the
// listed places would change runtime behaviour, so that is left for separate
// changes. ESLint fails when a suppression is no longer needed: remove it with
// `npx eslint --prune-suppressions frontend framework cypress`.
import js from '@eslint/js';
import i18next from 'eslint-plugin-i18next';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import noOnlyTests from 'eslint-plugin-no-only-tests';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/*.cjs', 'framework/publish/'],
  },
  {
    files: ['**/*.{js,mjs,ts,tsx,mts,cts}'],
    extends: [
      js.configs.recommended,
      jsxA11y.flatConfigs.recommended,
      react.configs.flat.recommended,
      tseslint.configs.recommendedTypeChecked,
      prettierRecommended,
      i18next.configs['flat/recommended'],
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'no-only-tests': noOnlyTests,
      'react-hooks': reactHooks,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      eqeqeq: ['error', 'always'],
      semi: ['error', 'always'],
      'no-only-tests/no-only-tests': 'error',
      // The rules of eslint-plugin-react-hooks 4 "recommended". Version 7's
      // recommended config adds the React Compiler rules (purity, refs,
      // set-state-in-effect, ...). The UI does not use the React Compiler and
      // those rules report ~220 existing patterns; revisit with React 19.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // New in typescript-eslint 8 recommended. Reports Chai assertions
      // (`expect(x).to.be.true`) in the Cypress tests and `a && b()` calls.
      '@typescript-eslint/no-unused-expressions': 'off',
      // Replaces ban-types for `{}`. Empty interfaces (generated hub types,
      // `interface A extends B {}`) were allowed before and stay allowed.
      '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'always' }],
      'react/react-in-jsx-scope': 'off',
      'no-console': 'error',
      'jsx-a11y/no-autofocus': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          destructuredArrayIgnorePattern: '^_',
          // ESLint 9 / typescript-eslint 8 changed the default to 'all'.
          caughtErrors: 'none',
        },
      ],
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-only',
          'jsx-attributes': {
            include: [
              'label',
              'placeholderText',
              'placeholder',
              'helperText',
              'description',
              'title',
              'subtitle',
            ],
          },
        },
      ],
      'no-restricted-exports': ['error', { restrictDefaultExports: { direct: true } }],
    },
  }
);
