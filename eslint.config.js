import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier';
import tseslint from 'typescript-eslint';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default [
  js.configs.recommended,

  ...tseslint.configs.recommended,

  ...compat.extends('expo'),

  {
    ignores: ['node_modules', '.expo', 'dist', 'build'],
  },

  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: {
      prettier,
    },
    rules: {
      'prettier/prettier': 'error',

      // React Native / Expo
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
];
