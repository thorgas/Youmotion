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
          allowDefaultImportsFrom: [
            '../infrastructure/local-reminder.scheduler',
            '../infrastructure/reminder.repository',
            '@/app/(tabs)/_layout',
            '@/assert',
            '@/assets/images/app-logo-transparent.png',
            '@/features/data-safety/infrastructure/data-archive.repository',
            '@/features/reminders/infrastructure/local-reminder.scheduler',
            '@/translations/de-DE.json',
            '@react-native-async-storage/async-storage',
            '@wuba/react-native-echarts/svgChart',
            'effect/Effect',
            'effect/Schema',
            'expo-constants',
            'expo-document-picker',
            'expo-mail-composer',
            'expo-notifications',
            'expo-sharing',
            'expo-splash-screen',
            'expo-updates',
            'react-native-reanimated',
            'react-native-svg',
          ],
          allowNamespaceImportsFrom: [
            '../infrastructure/local-reminder.scheduler',
            '../infrastructure/reminder.repository',
            '@/features/data-safety/infrastructure/data-archive.repository',
            '@/features/reminders/infrastructure/local-reminder.scheduler',
            'effect/Effect',
            'effect/Schema',
            'expo-document-picker',
            'expo-haptics',
            'expo-mail-composer',
            'expo-notifications',
            'expo-sharing',
            'expo-splash-screen',
            'expo-updates',
            'react-native-reanimated',
          ],
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
      'code-architecture/require-interactive-component-contract': [
        'error',
        {
          componentNames: ['ButtonRoot'],
          contentProps: ['children'],
          disabledAttributes: ['disabled'],
          disabledProps: ['disabled'],
          feedbackAttributes: ['rippleColor'],
          feedbackStateNames: ['pressed', 'active'],
          roleAttributes: ['accessibilityRole', 'role'],
          stateAttributes: ['accessibilityState', 'aria-disabled'],
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'code-architecture/dependency-parameter-convention': 'error',
      'code-architecture/dependency-wrapper-shape': 'error',
      'code-architecture/no-exported-dependency-instances': 'error',
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
          capabilities: [
            {
              dependency: 'Time',
              replacement: 'an injected clock dependency',
              selector: 'Date.now',
            },
          ],
          compositionRoots: [
            'src/app/**',
            'src/**/infrastructure/**',
            'src/navigation/app-navigation.machine.ts',
          ],
          root: '.',
        },
      ],
      'code-architecture/no-unasserted-return': [
        'error',
        {
          assertionNames: [
            'assert',
            'assertDefined',
            'assertWorkletInvariant',
            'nodeAssert',
            'nodeAssert.ok',
          ],
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
          allowedFiles: [
            '**/src/features/analytics/domain/analytics-calendar.ts',
            '**/src/features/analytics/domain/analytics-timeframe.ts',
            '**/src/features/analytics/domain/check-in-analytics.ts',
            '**/src/features/check-in/application/check-in-history.store.ts',
            '**/src/features/check-in/domain/belief-system.ts',
            '**/src/features/check-in/domain/emotion-selection.ts',
            '**/src/features/feedback/application/feedback.machine.ts',
            '**/src/navigation/app-navigation.machine.ts',
            '**/src/navigation/app-router.adapter.ts',
            '**/src/navigation/tab-bar-icon.tsx',
          ],
        },
      ],
      'code-architecture/prefer-readonly-types': [
        'error',
        { collectionScope: 'contracts' },
      ],
      'code-architecture/top-down-declarations': [
        'error',
        {
          allowedFiles: [
            '**/src/features/analytics/domain/analytics-calendar.ts',
            '**/src/features/analytics/domain/analytics-timeframe.ts',
            '**/src/features/check-in/domain/emotion-selection.ts',
          ],
          preserveRuntimeDependencies: true,
        },
      ],
    },
  },
  {
    files: ['src/features/settings/application/app-settings.store.ts'],
    rules: {
      'code-architecture/no-exported-dependency-instances': 'off',
    },
  },
  {
    files: [
      'src/features/check-in/application/check-in-history.store.ts',
      'src/features/check-in/application/history-filter.ts',
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
      'src/features/check-in/domain/belief-statement.ts',
      'src/features/check-in/domain/belief-system.ts',
      'src/features/check-in/domain/emotion-selection.ts',
    ],
    rules: {
      'code-architecture/require-assertions': 'off',
      'code-architecture/require-contract-assertions': [
        'error',
        {
          assertionNames: [
            'assert',
            'assertDefined',
            'assertWorkletInvariant',
            'nodeAssert',
            'nodeAssert.ok',
          ],
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
          assertionNames: [
            'assert',
            'assertDefined',
            'assertWorkletInvariant',
            'nodeAssert',
            'nodeAssert.ok',
          ],
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
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'code-architecture/enforce-module-boundaries': [
        'error',
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
  {
    files: ['src/features/**/domain/**/*.{ts,tsx}'],
    ignores: [
      'src/features/analytics/domain/analytics-calendar.ts',
      'src/features/analytics/domain/analytics-timeframe.ts',
      'src/features/analytics/domain/check-in-analytics.ts',
      'src/features/check-in/domain/belief-statement.ts',
      'src/features/check-in/domain/belief-system.ts',
      'src/features/check-in/domain/emotion-selection.ts',
    ],
    rules: {
      'code-architecture/require-assertions': 'off',
    },
  },
);
