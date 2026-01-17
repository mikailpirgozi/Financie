import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/build/**',
      '**/.expo/**',
      '**/android/**',
      '**/ios/**',
      '**/coverage/**',
      '**/*.config.js',
      '**/*.config.mjs',
      '**/babel.config.js',
    ],
  },

  // Base config for all TypeScript files
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // TypeScript files configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.es2021,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },

  // Web app specific (Next.js)
  {
    files: ['apps/web/**/*.ts', 'apps/web/**/*.tsx'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        React: 'readonly',
        JSX: 'readonly',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      // React hooks rules - using only the essential ones
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Disable overly strict new rules for now
      'react-hooks/static-components': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/incompatible-library': 'off',
      // Allow unused error variables in catch blocks
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_|^error$|^err$|^actionTypes$',
        caughtErrorsIgnorePattern: '^_|^error$|^err$'
      }],
    },
  },

  // Mobile app specific (React Native)
  {
    files: ['apps/mobile/**/*.ts', 'apps/mobile/**/*.tsx'],
    languageOptions: {
      globals: {
        ...globals.browser,
        __DEV__: 'readonly',
      },
    },
    rules: {
      // Console logs are common in mobile development
      'no-console': 'off',
      // Allow unused error variables in catch blocks
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_|^error$|^err$',
        caughtErrorsIgnorePattern: '^_|^error$|^err$'
      }],
      // Allow case declarations (common pattern in RN)
      'no-case-declarations': 'off',
    },
  },

  // Packages
  {
    files: ['packages/**/*.ts', 'packages/**/*.tsx'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Test files
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    languageOptions: {
      globals: {
        ...globals.jest,
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  }
);
