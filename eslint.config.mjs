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
  'cursorColor',
  'fill',
  'floodColor',
  'overlayColor',
  'placeholderTextColor',
  'selectionColor',
  'shadowColor',
  'stopColor',
  'stroke',
  'textDecorationColor',
  'tintColor',
  'underlineColorAndroid',
  'accentColor',
  'tabBarActiveTintColor',
  'tabBarInactiveTintColor',
];

const domainLiterals = [
  { value: '/onboarding', replacement: 'APP_ROUTES.ONBOARDING' },
  { value: '/onboarding-pulse', replacement: 'APP_ROUTES.ONBOARDING_PULSE' },
  { value: '/onboarding-example', replacement: 'APP_ROUTES.ONBOARDING_EXAMPLE' },
  { value: '/today', replacement: 'APP_ROUTES.TODAY' },
  { value: '/history', replacement: 'APP_ROUTES.HISTORY' },
  { value: '/analytics', replacement: 'APP_ROUTES.ANALYTICS' },
  { value: '/settings', replacement: 'APP_ROUTES.SETTINGS' },
  { value: '/belief-library', replacement: 'APP_ROUTES.BELIEF_LIBRARY' },
  { value: '/belief-library-editor', replacement: 'APP_ROUTES.BELIEF_LIBRARY_EDITOR' },
  { value: '/leitsatz-reminder', replacement: 'APP_ROUTES.LEITSATZ_REMINDER' },
  { value: '/reminders', replacement: 'APP_ROUTES.REMINDERS' },
  { value: '/reflection', replacement: 'APP_ROUTES.REFLECTION' },
  { value: '/belief-system', replacement: 'APP_ROUTES.BELIEF_SYSTEM' },
  { value: '/belief-system-catalog', replacement: 'APP_ROUTES.BELIEF_SYSTEM_CATALOG' },
  { value: '/belief-system-editor', replacement: 'APP_ROUTES.BELIEF_SYSTEM_EDITOR' },
  { value: '/guiding-belief', replacement: 'APP_ROUTES.GUIDING_BELIEF' },
  { value: '/success', replacement: 'APP_ROUTES.SUCCESS' },
  { value: 'en-US', replacement: 'APP_LOCALES.ENGLISH' },
  { value: 'de-DE', replacement: 'APP_LOCALES.GERMAN' },
  { value: 'check_in', replacement: 'CHECK_IN_TABLE' },
  { value: 'belief_statement', replacement: 'BELIEF_STATEMENT_TABLE' },
  { value: 'app_settings', replacement: 'APP_SETTINGS_TABLE' },
  { value: 'reminder_schedule', replacement: 'REMINDER_SCHEDULE_TABLE' },
  { value: 'reminder_assignment', replacement: 'REMINDER_ASSIGNMENT_TABLE' },
  { value: 'database_migration', replacement: 'DATABASE_MIGRATION_TABLE' },
];

const namedDefaultImportSources = [
  '../infrastructure/*',
  '**/infrastructure/*',
  '**/*.json',
  '**/*.png',
  '@/app/(tabs)/_layout',
  '@/assert',
  '@react-native-async-storage/async-storage',
  '@wuba/react-native-echarts/svgChart',
  'effect/*',
  'expo-*',
  'react-native-reanimated',
  'react-native-svg',
];

const namedNamespaceImportSources = [
  '../infrastructure/*',
  '**/infrastructure/*',
  'effect/*',
  'expo-*',
  'react-native-reanimated',
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
      'code-architecture/declarative-components': [
        'error',
        { forbidInlineFunctions: false },
      ],
      'code-architecture/effect-error-handling': 'error',
      'code-architecture/imports-first': 'error',
      'code-architecture/max-function-parameters': ['error', { max: 5 }],
      'code-architecture/named-imports': [
        'error',
        {
          allowDefaultImportsFrom: namedDefaultImportSources,
          allowNamespaceImportsFrom: namedNamespaceImportSources,
        },
      ],
      'code-architecture/no-barrel-files': 'error',
      'code-architecture/no-barrel-imports': [
        'error',
        {
          checkLocalIndex: true,
          packages: ['effect', '@effect/platform'],
        },
      ],
      'code-architecture/no-design-identity-overrides': [
        'error',
        {
          allowedFiles: ['src/components/ui/**'],
          components: [
            {
              identityProperties: [
                'backgroundColor',
                'borderColor',
                'borderRadius',
                'color',
                'fontFamily',
                'fontSize',
              ],
              names: ['Button.Root', 'Button.Text'],
              styleAttributes: ['style'],
            },
            {
              identityProperties: [
                'color',
                'fontFamily',
                'fontSize',
                'letterSpacing',
                'lineHeight',
              ],
              names: ['ScreenHeading.EyebrowText', 'ScreenHeading.TitleText'],
              styleAttributes: ['style'],
            },
            {
              identityProperties: ['backgroundColor'],
              names: ['Dialog.Root'],
              styleAttributes: ['style'],
            },
          ],
        },
      ],
      'code-architecture/require-dismissible-modal-backdrop': [
        'error',
        {
          surfaces: [
            {
              backdropElements: ['Pressable'],
              name: 'Modal',
              outsidePressAttributes: ['onPress'],
              requestCloseAttributes: ['onRequestClose'],
              transparentAttribute: 'transparent',
            },
          ],
        },
      ],
      'code-architecture/no-root-owned-compound-parts': 'error',
      'code-architecture/no-namespace-exports': 'error',
      'code-architecture/no-unsafe-type-assertions': 'error',
      'code-architecture/no-unvalidated-json-parse': 'error',
      'code-architecture/prefer-composition-over-configuration': 'error',
      'code-architecture/prefer-design-system-components': [
        'error',
        {
          allowInside: ['src/components/ui/**'],
          consumers: ['src/features/data-safety/ui/data-safety-controls.tsx'],
          replacements: [
            {
              from: 'react-native',
              imported: ['Button', 'Pressable', 'TouchableOpacity'],
              replacement: '@/components/ui/button',
            },
          ],
        },
      ],
      'code-architecture/require-composable-root-children': 'error',
      'code-architecture/require-compound-component-api': 'error',
      'code-architecture/require-consumer-owned-compound-usage': 'error',
    },
  },
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    ignores: [
      'src/components/ui/app-back-button.tsx',
      'src/components/ui/settings-action-row.tsx',
    ],
    rules: {
      'code-architecture/require-interactive-component-contract': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'code-architecture/dependency-parameter-convention': 'error',
      'code-architecture/dependency-wrapper-shape': 'error',
      'code-architecture/no-exported-dependency-instances': [
        'error',
        {
          compositionRoots: ['src/app-stores.ts'],
          root: '.',
        },
      ],
      'code-architecture/no-over-depending': 'error',
      'code-architecture/sort-dependency-types': 'error',
    },
  },
  {
    files: [
      'src/features/**/domain/**/*.{ts,tsx}',
      'src/features/**/application/**/*.{ts,tsx}',
      'src/navigation/**/*.{ts,tsx}',
    ],
    ignores: [
      'src/**/__tests__/**',
      'src/**/*.test.{ts,tsx}',
      'src/test-utils/**',
      'src/testing/**',
    ],
    rules: {
      'code-architecture/no-implicit-external-dependencies': [
        'error',
        {
          compositionRoots: [
            'src/app/**',
            'src/**/infrastructure/**',
            'src/navigation/app-navigation.machine.ts',
          ],
          root: '.',
          serviceLocators: [
            {
              module: '@/app-stores',
              imports: [
                'analyticsStore',
                'appSettingsStore',
                'checkInHistoryStore',
                'historyTimeframeStore',
              ],
              dependency: 'a store passed in through props or context',
              replacement: 'the injected store',
            },
          ],
        },
      ],
      'code-architecture/no-unasserted-return': [
        'error',
        {
          ignoreDelegates: true,
          ignoreDirectCallbacks: true,
          ignoreJSXCallbacks: true,
          ignoreJSXComponents: true,
          ignoreNoInputClosures: true,
          ignoreReactHooks: true,
          ignoreTrivialConstructors: true,
          minimumStatements: 3,
        },
      ],
      'code-architecture/prefer-interface-over-type': 'error',
      'code-architecture/prefer-arrow-functions': [
        'error',
        {
          allowDefaultExports: true,
          allowGenerators: true,
          allowHoisted: true,
          allowNamedExports: true,
          allowRecursive: true,
        },
      ],
      'code-architecture/prefer-readonly-types': [
        'error',
        { collectionScope: 'contracts' },
      ],
      'code-architecture/top-down-declarations': [
        'error',
        {
          preserveRuntimeDependencies: true,
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/**/__tests__/**',
      'src/**/*.harness.{ts,tsx}',
      'src/**/*.test.{ts,tsx}',
      'src/test-utils/**',
      'src/testing/**',
    ],
    rules: {
      'code-architecture/require-assertions': [
        'error',
        {
          ignoreJSXCallbacks: true,
          ignoreNoInputClosures: true,
          minimum: 2,
          minimumStatements: 3,
        },
      ],
    },
  },
  {
    files: [
      'src/features/history/application/check-in-history.store.ts',
      'src/features/history/application/history-filter.ts',
      'src/features/beliefs/application/guiding-belief-library.ts',
      'src/navigation/app-router.adapter.ts',
    ],
    rules: {
      'code-architecture/no-unasserted-return': 'off',
    },
  },
  {
    files: ['src/features/**/domain/**/*.{ts,tsx}'],
    rules: {
      'code-architecture/no-unasserted-return': 'off',
    },
  },
  {
    files: ['src/features/**/domain/**/*.{ts,tsx}'],
    ignores: [
      'src/features/analytics/domain/analytics-calendar.ts',
      'src/features/analytics/domain/analytics-timeframe.ts',
      'src/features/analytics/domain/check-in-analytics.ts',
      'src/features/beliefs/domain/belief-statement.ts',
      'src/features/check-in/domain/belief-system.ts',
      'src/features/check-in/domain/emotion-selection.ts',
    ],
    rules: {
      'code-architecture/require-assertions': 'off',
      'code-architecture/require-contract-assertions': [
        'error',
        {
          checkParameters: true,
          checkReturns: false,
          ignoreDelegates: true,
          ignoreDirectCallbacks: true,
          ignoreJSXCallbacks: true,
          ignoreJSXComponents: true,
          ignoreNoInputClosures: true,
          ignoreReactHooks: true,
          ignoreTrivialConstructors: true,
          minimumStatements: 5,
        },
      ],
    },
  },
  {
    files: [
      'src/features/**/application/**/*.{ts,tsx}',
      'src/navigation/**/*.{ts,tsx}',
    ],
    rules: {
      'code-architecture/require-contract-assertions': 'off',
    },
  },
  {
    files: [
      'src/**/__tests__/**',
      'src/**/*.harness.{ts,tsx}',
      'src/**/*.test.{ts,tsx}',
      'src/test-utils/**',
      'src/testing/**',
    ],
    rules: {
      'code-architecture/no-namespace-exports': 'off',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/**/__tests__/**',
      'src/**/*.harness.{ts,tsx}',
      'src/**/*.test.{ts,tsx}',
      'src/features/**/infrastructure/migrations/**',
    ],
    rules: {
      'code-architecture/centralize-domain-literals': [
        'error',
        {
          constantsFiles: ['src/constants.ts'],
          literals: domainLiterals,
        },
      ],
      'code-architecture/max-function-lines': [
        'error',
        { ignoreJSX: true, max: 70 },
      ],
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
        'error',
        {
          allowedFiles: ['src/theme.ts'],
          values: [
            {
              properties: colorProperties,
              replacement: 'palette.paper',
              value: '#F9F7F4',
            },
            {
              properties: colorProperties,
              replacement: 'palette.paperRaised',
              value: '#FCFBF9',
            },
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
              replacement: 'palette.danger',
              value: '#9D4E42',
            },
            {
              properties: colorProperties,
              replacement: 'palette.selectionWash',
              value: '#EDF0EB',
            },
            {
              properties: colorProperties,
              replacement: 'actionColors.primaryForeground',
              value: '#FFFFFF',
            },
            {
              properties: colorProperties,
              replacement: 'palette.hairline',
              value: 'rgba(42, 39, 34, 0.12)',
            },
            {
              properties: colorProperties,
              replacement: 'palette.whiteWash',
              value: 'rgba(255, 255, 255, 0.72)',
            },
          ],
        },
      ],
      'code-architecture/no-raw-design-properties': [
        'error',
        {
          allowedFiles: ['src/theme.ts'],
          properties: [
            {
              allowedValues: ['none', 'transparent'],
              names: colorProperties,
              replacement: 'semantic color tokens from @/theme',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/**/__tests__/**',
      'src/**/*.harness.{ts,tsx}',
      'src/**/*.test.{ts,tsx}',
    ],
    rules: {
      'code-architecture/no-raw-design-properties': 'off',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/**/__tests__/**',
      'src/**/*.harness.{ts,tsx}',
      'src/**/*.test.{ts,tsx}',
      'src/test-utils/**',
      'src/testing/**',
    ],
    rules: {
      'code-architecture/enforce-module-boundaries': [
        'error',
        {
          aliases: [{ prefix: '@/', target: 'src/' }],
          modules: [
            { name: 'shared-ui', pattern: 'src/components/**', allow: [] },
            {
              name: 'analytics',
              pattern: 'src/features/analytics/**',
              allow: ['beliefs', 'beliefs-domain', 'check-in', 'navigation', 'shared-ui'],
            },
            { name: 'beliefs-domain', pattern: 'src/features/beliefs/domain/**', allow: [] },
            {
              name: 'beliefs',
              pattern: 'src/features/beliefs/**',
              allow: ['beliefs-domain', 'check-in', 'navigation', 'reminders', 'shared-ui'],
            },
            {
              name: 'check-in',
              pattern: 'src/features/check-in/**',
              allow: ['beliefs', 'beliefs-domain', 'navigation', 'shared-ui'],
            },
            {
              name: 'data-safety',
              pattern: 'src/features/data-safety/**',
              allow: ['beliefs', 'beliefs-domain', 'check-in', 'navigation', 'settings', 'shared-ui'],
            },
            { name: 'feedback', pattern: 'src/features/feedback/**', allow: ['shared-ui'] },
            {
              name: 'history',
              pattern: 'src/features/history/**',
              allow: ['analytics', 'beliefs', 'beliefs-domain', 'check-in', 'navigation', 'shared-ui'],
            },
            {
              name: 'onboarding',
              pattern: 'src/features/onboarding/**',
              allow: ['check-in', 'navigation', 'shared-ui'],
            },
            {
              name: 'reminders',
              pattern: 'src/features/reminders/**',
              allow: ['beliefs-domain', 'navigation', 'shared-ui'],
            },
            {
              name: 'settings',
              pattern: 'src/features/settings/**',
              allow: ['beliefs', 'data-safety', 'feedback', 'navigation', 'shared-ui'],
            },
            { name: 'startup', pattern: 'src/features/startup/**', allow: [] },
            {
              name: 'navigation',
              pattern: 'src/navigation/**',
              allow: [
                'analytics',
                'beliefs',
                'beliefs-domain',
                'check-in',
                'data-safety',
                'feedback',
                'history',
                'onboarding',
                'reminders',
                'settings',
                'shared-ui',
                'startup',
              ],
            },
            {
              name: 'app',
              pattern: 'src/app/**',
              allow: [
                'analytics',
                'beliefs',
                'check-in',
                'data-safety',
                'feedback',
                'history',
                'onboarding',
                'reminders',
                'settings',
                'shared-ui',
                'startup',
                'navigation',
              ],
            },
          ],
        },
      ],
    },
  },
);
