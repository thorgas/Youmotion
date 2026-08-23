import architecture from 'eslint-plugin-code-architecture';
import tseslint from 'typescript-eslint';

const colorProperties = [
  'backgroundColor',
  'borderBottomColor',
  'borderColor',
  'borderLeftColor',
  'borderRightColor',
  'borderTopColor',
  'color',
  'shadowColor',
  'textDecorationColor',
  'tintColor',
];

export default tseslint.config(
  {
    ignores: [
      '.agents/**',
      '.expo/**',
      'artifacts/**',
      'coverage/**',
      'dist/**',
      'node_modules/**',
      'src/translations/**',
      'vendor/**',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { parser: tseslint.parser },
    plugins: { 'code-architecture': architecture },
    rules: {
      'code-architecture/no-unsafe-type-assertions': 'error',
      'code-architecture/no-unvalidated-json-parse': 'error',
    },
  },
  {
    files: [
      'src/app/**/*.{ts,tsx}',
      'src/components/**/*.{ts,tsx}',
      'src/features/**/ui/**/*.{ts,tsx}',
      'src/navigation/**/*.{ts,tsx}',
    ],
    rules: {
      'code-architecture/no-raw-design-values': [
        'warn',
        {
          allowedFiles: ['src/features/check-in/ui/theme.ts'],
          values: [
            {
              properties: colorProperties,
              replacement: 'palette.ink',
              value: '#2A2722',
            },
            {
              properties: colorProperties,
              replacement: 'palette.inkMuted',
              value: '#6F6760',
            },
            {
              properties: colorProperties,
              replacement: 'palette.moss',
              value: '#5E6F61',
            },
            {
              properties: colorProperties,
              replacement: 'a shared semantic selection-wash token',
              value: '#EDF0EB',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'code-architecture/enforce-module-boundaries': [
        'warn',
        {
          aliases: [{ prefix: '@/', target: 'src/' }],
          modules: [
            { name: 'shared-ui', pattern: 'src/components/**', allow: [] },
            { name: 'features', pattern: 'src/features/**' },
          ],
        },
      ],
    },
  },
);
