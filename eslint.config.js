import tseslint from 'typescript-eslint';
import importX from 'eslint-plugin-import-x';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import { builtinModules } from 'node:module';
import { defineConfig } from 'eslint/config';

const DOMGlobals = ['window', 'document'];
const NodeGlobals = ['module', 'require'];

const banConstEnum = {
  selector: 'TSEnumDeclaration[const=true]',
  message: 'Please use non-const enums. This project automatically inlines enums.',
};

export default defineConfig(
  {
    ignores: [
      '**/dist/',
      '**/temp/',
      '**/coverage/',
      '.idea/',
      'explorations/',
      'dts-build/packages',
      'playground',
      '**/.next/',
      '**/.turbo/',
      '**/pnpm-lock.yaml',
    ],
  },
  {
    files: ['**/*.js', '**/*.ts', '**/*.tsx'],
    extends: [
      tseslint.configs.base,
      eslintConfigPrettier, // Disable conflicting rules
    ],
    plugins: {
      'import-x': importX,
      prettier: prettier,
      react: react,
      'react-hooks': reactHooks,
    },
    rules: {
      'prettier/prettier': 'warn',
      'no-debugger': 'error',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-restricted-globals': ['error', ...DOMGlobals, ...NodeGlobals],
      'sort-imports': ['error', { ignoreDeclarationSort: true }],

      'import-x/no-nodejs-modules': [
        'error',
        { allow: builtinModules.map((mod) => `node:${mod}`) },
      ],

      // TypeScript Rules
      '@typescript-eslint/prefer-ts-expect-error': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          fixStyle: 'inline-type-imports',
          disallowTypeAnnotations: false,
        },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  // React: only TSX/JSX; explicit version avoids ESLint 10 + plugin-react "detect" crash
  {
    files: ['**/*.tsx', '**/*.jsx'],
    plugins: {
      react: react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: {
        version: '19',
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
    },
  },
  // JavaScript files
  {
    files: ['*.js'],
    rules: {
      'no-unused-vars': ['error', { vars: 'all', args: 'none' }],
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  // Browser / React apps may use DOM globals
  {
    files: ['apps/desktop/src/**', 'packages/ui/**'],
    rules: {
      'no-restricted-globals': ['error', ...NodeGlobals],
    },
  },
  // packages/ui is a component library where { ...props } spread in forwardRef is standard practice
  {
    files: ['packages/ui/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', banConstEnum],
    },
  },
  // apps/desktop: forbid raw H5 elements in favor of @sqlgui/ui components
  {
    files: ['apps/desktop/src/**/*.{ts,tsx}'],
    rules: {
      'react/forbid-elements': [
        'error',
        {
          forbid: [
            {
              element: 'button',
              message: 'Use Button or IconButton from @sqlgui/ui instead.',
            },
            {
              element: 'input',
              message: 'Use Input from @sqlgui/ui instead.',
            },
            {
              element: 'textarea',
              message: 'Use Textarea from @sqlgui/ui instead.',
            },
            {
              element: 'select',
              message: 'Use Select from @sqlgui/ui instead.',
            },
            {
              element: 'option',
              message: 'Use Select from @sqlgui/ui instead.',
            },
            {
              element: 'dialog',
              message: 'Use Dialog from @sqlgui/ui instead.',
            },
          ],
        },
      ],
    },
  },
  // ConnectionsTree: intentionally syncs internal tree state with external profile list
  {
    files: ['apps/desktop/src/workbench/connections/ConnectionsTree.tsx'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  // Config files and scripts
  {
    files: [
      'eslint.config.js',
      'rollup*.config.js',
      'rolldown.config.ts',
      '**/vite.config.ts',
      'scripts/**',
      './*.{js,ts}',
      'packages/*/*.js',
      'packages/sqlgui-sdk/**/*.ts',
      'packages/sqlgui-api/**/*.ts',
      'packages/extension-schema/**/*.ts',
    ],
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-syntax': ['error', banConstEnum],
      'no-console': 'off',
      'import-x/no-nodejs-modules': 'off',
    },
  },
);
