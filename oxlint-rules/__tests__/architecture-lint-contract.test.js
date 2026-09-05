const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const packageJson = require('../../package.json');

const cwd = path.resolve(__dirname, '../..');
const eslint = path.join(cwd, 'node_modules', '.bin', 'eslint');
const buttonSource = readFileSync(
  path.join(cwd, 'src/components/ui/button.tsx'),
  'utf8',
);

const messagesFor = ({ code, filePath }) => {
  const result = spawnSync(
    eslint,
    ['--format', 'json', '--stdin', '--stdin-filename', filePath],
    { cwd, encoding: 'utf8', input: code },
  );
  if (result.error) throw result.error;
  const [lintResult] = JSON.parse(result.stdout);
  return lintResult.messages;
};

const configuredRulesFor = (filePath) => {
  const result = spawnSync(eslint, ['--print-config', filePath], {
    cwd,
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  return JSON.parse(result.stdout).rules;
};

const exportedRuleNames = () => {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      "import plugin from 'eslint-plugin-code-architecture'; console.log(JSON.stringify(Object.keys(plugin.rules)));",
    ],
    { cwd, encoding: 'utf8' },
  );
  if (result.error) throw result.error;
  return JSON.parse(result.stdout);
};

describe('architecture lint contract', () => {
  it('keeps the alpha plugin in the main verification path', () => {
    expect(packageJson.devDependencies['eslint-plugin-code-architecture']).toBe(
      '0.6.0-alpha.10',
    );
    expect(packageJson.scripts.lint).toContain('pnpm lint:architecture');
    expect(packageJson.scripts.verify).toContain('pnpm lint');
  });

  it('enables every Youmotion-applicable plugin rule as an error', () => {
    const configuredRules = configuredRulesFor(
      'src/components/ui/contract-fixture.tsx',
    );
    const exportedRules = exportedRuleNames();
    const applicableRules = [
      'centralize-domain-literals',
      'declarative-components',
      'effect-error-handling',
      'enforce-module-boundaries',
      'imports-first',
      'max-function-lines',
      'max-function-parameters',
      'no-barrel-files',
      'no-barrel-imports',
      'no-design-identity-overrides',
      'no-raw-design-properties',
      'no-raw-design-values',
      'no-root-owned-compound-parts',
      'no-unsafe-type-assertions',
      'no-unvalidated-json-parse',
      'prefer-composition-over-configuration',
      'prefer-design-system-components',
      'require-composable-root-children',
      'require-compound-component-api',
      'require-consumer-owned-compound-usage',
      'require-dismissible-modal-backdrop',
      'require-interactive-component-contract',
    ];
    const alphaRules = [
      'dependency-parameter-convention',
      'dependency-wrapper-shape',
      'named-imports',
      'no-exported-dependency-instances',
      'no-implicit-external-dependencies',
      'no-namespace-exports',
      'no-over-depending',
      'no-unasserted-return',
      'prefer-arrow-functions',
      'prefer-interface-over-type',
      'prefer-readonly-types',
      'require-contract-assertions',
      'sort-dependency-types',
      'top-down-declarations',
    ];

    expect(exportedRules).toHaveLength(37);
    expect(exportedRules.toSorted()).toEqual([
      ...applicableRules,
      ...alphaRules,
      'require-assertions',
    ].toSorted());
    expect(applicableRules).toHaveLength(22);
    for (const ruleName of applicableRules) {
      expect(configuredRules[`code-architecture/${ruleName}`]?.[0]).toBe(2);
    }
    expect(configuredRules['code-architecture/max-function-lines']).toEqual([
      2,
      { ignoreJSX: true, max: 70, skipBlankLines: false },
    ]);
    expect(configuredRulesFor(
      'src/features/analytics/domain/analytics-calendar.ts',
    )['code-architecture/require-assertions']).toEqual([
      2,
      expect.objectContaining({
        checkExpressionBodies: false,
        ignoreJSXCallbacks: true,
        ignoreNoInputClosures: true,
        minimum: 2,
        minimumStatements: 3,
      }),
    ]);
    expect(configuredRulesFor(
      'src/features/reminders/domain/contract-fixture.ts',
    )['code-architecture/require-contract-assertions']).toEqual([
      2,
      expect.objectContaining({
        checkParameters: true,
        checkReturns: false,
        minimumStatements: 5,
      }),
    ]);
    expect(configuredRulesFor(
      'src/features/reminders/domain/contract-fixture.ts',
    )['code-architecture/require-contract-assertions'][1]).not.toHaveProperty('assertionNames');
    expect(configuredRulesFor(
      'src/features/reminders/application/contract-fixture.ts',
    )['code-architecture/no-unasserted-return'][1]).not.toHaveProperty(
      'assertionNames',
    );
    expect(configuredRules['code-architecture/named-imports']).toEqual([
      2,
      {
        allowDefaultImportsFrom: [
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
        ],
        allowNamespaceImportsFrom: [
          '../infrastructure/*',
          '**/infrastructure/*',
          'effect/*',
          'expo-*',
          'react-native-reanimated',
        ],
      },
    ]);
  });

  it('enables every alpha.4 rule in a truthful production scope', () => {
    const sharedRules = configuredRulesFor('src/components/ui/contract-fixture.tsx');
    const domainRules = configuredRulesFor(
      'src/features/reminders/domain/contract-fixture.ts',
    );
    const applicationRules = configuredRulesFor(
      'src/features/reminders/application/contract-fixture.ts',
    );
    const ruleConfigurations = [sharedRules, domainRules, applicationRules];
    const alphaRules = [
      'dependency-parameter-convention',
      'dependency-wrapper-shape',
      'named-imports',
      'no-exported-dependency-instances',
      'no-implicit-external-dependencies',
      'no-namespace-exports',
      'no-over-depending',
      'no-unasserted-return',
      'prefer-arrow-functions',
      'prefer-interface-over-type',
      'prefer-readonly-types',
      'require-contract-assertions',
      'sort-dependency-types',
      'top-down-declarations',
    ];

    for (const ruleName of alphaRules) {
      expect(ruleConfigurations.some(
        (rules) => rules[`code-architecture/${ruleName}`]?.[0] === 2,
      )).toBe(true);
    }
    expect(domainRules['code-architecture/no-unasserted-return']?.[0]).toBe(0);
    expect(domainRules['code-architecture/require-assertions']?.[0]).toBe(2);
    expect(applicationRules['code-architecture/require-contract-assertions']?.[0]).toBe(0);
  });

  it('keeps narrow alpha exceptions from spreading', () => {
    const storeRules = configuredRulesFor(
      'src/features/settings/application/app-settings.store.ts',
    );
    const otherApplicationRules = configuredRulesFor(
      'src/features/settings/application/contract-fixture.ts',
    );
    const algorithmRules = configuredRulesFor(
      'src/features/analytics/domain/analytics-calendar.ts',
    );
    const interactionRule = [
      2,
      expect.objectContaining({
        contractComponents: ['AppBackButton', 'Button.Root', 'SettingsActionRow'],
        feedbackComponents: ['PressableScale'],
      }),
    ];

    expect(storeRules['code-architecture/no-exported-dependency-instances']?.[0]).toBe(2);
    expect(otherApplicationRules['code-architecture/no-exported-dependency-instances']?.[0]).toBe(2);
    expect(otherApplicationRules['code-architecture/no-unasserted-return']?.[1]?.allowedReturnCalls).toEqual([
      'assignments.some',
      'routeName.endsWith',
      'text.includes',
    ]);
    expect(algorithmRules['code-architecture/require-contract-assertions']).toBeUndefined();
    expect(algorithmRules['code-architecture/require-assertions']?.[0]).toBe(2);
    expect(configuredRulesFor(
      'src/components/ui/app-back-button.tsx',
    )['code-architecture/require-interactive-component-contract']).toEqual(interactionRule);
    expect(configuredRulesFor(
      'src/features/settings/ui/contract-fixture.tsx',
    )['code-architecture/require-interactive-component-contract']).toEqual(interactionRule);
    expect(configuredRulesFor(
      'src/components/ui/contract-fixture.tsx',
    )['code-architecture/require-interactive-component-contract']).toEqual(interactionRule);
  });

  it('does not trust an arbitrary project method that shares a predicate name', () => {
    const messages = messagesFor({
      code: `
        function loadResult(repository, input) {
          const normalized = prepare(input);
          validate(normalized);
          return repository.some(normalized);
        }
      `,
      filePath: 'src/features/reminders/application/trusted-return-fixture.ts',
    });

    expect(messages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'code-architecture/no-unasserted-return',
        severity: 2,
      }),
    ]));
  });

  it('limits logic functions without forcing JSX component extraction', () => {
    const logicBody = Array.from(
      { length: 70 },
      (_, index) => `const value${index} = ${index};`,
    ).join('\n');
    const jsxBody = Array.from(
      { length: 70 },
      (_, index) => `<Text key="${index}">${index}</Text>`,
    ).join('\n');
    const logicMessages = messagesFor({
      code: `function TooLong() {\n${logicBody}\nreturn value69;\n}`,
      filePath: 'src/components/ui/contract-fixture.tsx',
    });
    const jsxMessages = messagesFor({
      code: `function LongScreen() {\nreturn <>\n${jsxBody}\n</>;\n}`,
      filePath: 'src/components/ui/contract-fixture.tsx',
    });

    expect(logicMessages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'code-architecture/max-function-lines',
        severity: 2,
      }),
    ]));
    expect(jsxMessages).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'code-architecture/max-function-lines',
      }),
    ]));
  });

  it('requires assertions in production while excluding tests', () => {
    const code = `
      function summarize(values) {
        const total = values.length;
        const first = values[0];
        return { first, total };
      }
    `;
    const productionMessages = messagesFor({
      code,
      filePath: 'src/features/analytics/domain/analytics-calendar.ts',
    });
    const testMessages = messagesFor({
      code,
      filePath: 'src/features/analytics/domain/__tests__/contract-fixture.test.ts',
    });

    expect(productionMessages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'code-architecture/require-assertions',
        severity: 2,
      }),
    ]));
    expect(testMessages).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'code-architecture/require-assertions',
      }),
    ]));
  });

  it('keeps broad assertion density beside domain parameter contracts', () => {
    const messages = messagesFor({
      code: `
        function normalize(value) {
          const trimmed = value.trim();
          const result = trimmed.toLowerCase();
          return result;
        }
      `,
      filePath: 'src/features/reminders/domain/contract-fixture.ts',
    });

    expect(messages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'code-architecture/require-assertions',
        severity: 2,
      }),
    ]));
  });

  it('requires substantial worklets to use the recognized invariant helper', () => {
    const messages = messagesFor({
      code: `
        function updatePosition(value) {
          'worklet';
          const next = value + 1;
          return next;
        }
      `,
      filePath: 'src/features/check-in/ui/worklet-contract-fixture.ts',
    });

    expect(messages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'code-architecture/require-assertions',
        severity: 2,
      }),
    ]));
  });

  it('keeps contract and return assertion policies disjoint', () => {
    const domainCode = `
      function normalize(value) {
        const trimmed = value.trim();
        const lower = trimmed.toLowerCase();
        const compact = lower.replaceAll('--', '-');
        const result = compact.replaceAll(' ', '-');
        return result;
      }
    `;
    const applicationCode = `
      function loadValue(input) {
        const normalized = input.trim();
        const key = normalized.toLowerCase();
        return fetchValue(key);
      }
    `;
    const domainMessages = messagesFor({
      code: domainCode,
      filePath: 'src/features/reminders/domain/contract-fixture.ts',
    });
    const applicationMessages = messagesFor({
      code: applicationCode,
      filePath: 'src/features/reminders/application/contract-fixture.ts',
    });

    expect(domainMessages).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'code-architecture/require-contract-assertions' }),
    ]));
    expect(domainMessages).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'code-architecture/no-unasserted-return' }),
    ]));
    expect(applicationMessages).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'code-architecture/no-unasserted-return' }),
    ]));
    expect(applicationMessages).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'code-architecture/require-contract-assertions' }),
    ]));
  });

  it('limits exported dependency instances to the composition root', () => {
    const code = 'export const appSettingsStore = createAppSettingsStore();';
    const compositionRootMessages = messagesFor({
      code,
      filePath: 'src/app-stores.ts',
    });
    const ordinaryMessages = messagesFor({
      code,
      filePath: 'src/features/settings/application/contract-fixture.ts',
    });

    expect(compositionRootMessages).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'code-architecture/no-exported-dependency-instances' }),
    ]));
    expect(ordinaryMessages).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'code-architecture/no-exported-dependency-instances' }),
    ]));
  });

  it('rejects app store service locators outside UI composition consumers', () => {
    const code = `
      import { appSettingsStore } from '@/app-stores';
      export const readSettings = () => appSettingsStore.getSnapshot();
    `;
    const domainMessages = messagesFor({
      code,
      filePath: 'src/features/settings/domain/contract-fixture.ts',
    });
    const uiMessages = messagesFor({
      code,
      filePath: 'src/features/settings/ui/contract-fixture.tsx',
    });

    expect(domainMessages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'code-architecture/no-implicit-external-dependencies',
      }),
    ]));
    expect(uiMessages).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'code-architecture/no-implicit-external-dependencies',
      }),
    ]));
  });

  it('enables every built-in implicit external dependency group', () => {
    const messages = messagesFor({
      code: `
        Date.now();
        Math.random();
        console.info('contract');
        process.env.NODE_ENV;
        fetch('/contract');
        localStorage.getItem('contract');
        Intl.DateTimeFormat();
      `,
      filePath: 'src/features/reminders/application/contract-fixture.ts',
    }).filter(({ ruleId }) => (
      ruleId === 'code-architecture/no-implicit-external-dependencies'
    ));

    expect(messages).toHaveLength(7);
  });

  it.each([
    {
      code: `
        function AccordionRoot({ children }) {
          return <AccordionContext.Provider><Accordion.Trigger />{children}</AccordionContext.Provider>;
        }
      `,
      ruleName: 'no-root-owned-compound-parts',
    },
    {
      code: `
        function ConfiguredList({ items, showHeader, hideFooter }) {
          return <View>{showHeader && <Header />}{items.map((item) => <Item item={item} />)}{!hideFooter && <Footer />}</View>;
        }
      `,
      ruleName: 'prefer-composition-over-configuration',
    },
    {
      code: 'function FixedRoot() { return <FixedLayout />; }',
      ruleName: 'require-composable-root-children',
    },
    {
      code: `
        const CounterProvider = ({ children }) => <Context.Provider>{children}</Context.Provider>;
        const CounterDisplay = () => <Text />;
        export const Counter = { Provider: CounterProvider, Display: CounterDisplay };
      `,
      ruleName: 'require-compound-component-api',
    },
    {
      code: `
        import { Counter } from './counter';
        const view = <Counter.Provider><View /></Counter.Provider>;
      `,
      ruleName: 'require-consumer-owned-compound-usage',
    },
  ])('detects a $ruleName composition violation', ({ code, ruleName }) => {
    const messages = messagesFor({
      code,
      filePath: 'src/components/ui/contract-fixture.tsx',
    });

    expect(messages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: `code-architecture/${ruleName}`,
        severity: 2,
      }),
    ]));
  });

  it('enforces declarative components without banning named event delegates', () => {
    const messages = messagesFor({
      code: `
        function Example() {
          const [value] = useState(false);
          const pressed = () => send({ type: 'pressed' });
          return <Button onPress={pressed} value={value} />;
        }
      `,
      filePath: 'src/components/ui/contract-fixture.tsx',
    });

    expect(messages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'code-architecture/declarative-components',
        severity: 2,
      }),
    ]));
    expect(messages).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        message: expect.stringContaining('inline functions'),
      }),
    ]));
  });

  it('centralizes configured runtime vocabulary', () => {
    const messages = messagesFor({
      code: "const destination = '/today';",
      filePath: 'src/navigation/contract-fixture.ts',
    });

    expect(messages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'code-architecture/centralize-domain-literals',
        severity: 2,
      }),
    ]));
  });

  it('rejects unvalidated JSON parsing', () => {
    const messages = messagesFor({
      code: 'const parsed = JSON.parse(input);',
      filePath: 'src/features/data-safety/infrastructure/contract-fixture.ts',
    });

    expect(messages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'code-architecture/no-unvalidated-json-parse',
        severity: 2,
      }),
    ]));
  });

  it('reports configured raw design values in UI files', () => {
    const messages = messagesFor({
      code: "const styles = { backgroundColor: '#EDF0EB' };",
      filePath: 'src/components/ui/contract-fixture.ts',
    });

    expect(messages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'code-architecture/no-raw-design-values',
        severity: 2,
      }),
    ]));
  });

  it('protects shared button identity from consumer overrides', () => {
    const messages = messagesFor({
      code: `
        import { Button } from '@/components/ui/button';
        const view = <Button.Root label="Save" onPress={save} style={{ backgroundColor: '#fff' }} testID="save"><Button.Text>Save</Button.Text></Button.Root>;
      `,
      filePath: 'src/features/settings/ui/contract-fixture.tsx',
    });

    expect(messages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'code-architecture/no-design-identity-overrides',
        severity: 2,
      }),
    ]));
  });

  it('protects shared screen-heading typography from consumer overrides', () => {
    const messages = messagesFor({
      code: `
        import { ScreenHeading } from '@/components/ui/screen-heading';
        const view = <ScreenHeading.TitleText style={{ fontSize: 48 }}>Title</ScreenHeading.TitleText>;
      `,
      filePath: 'src/features/settings/ui/contract-fixture.tsx',
    });

    expect(messages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'code-architecture/no-design-identity-overrides',
        severity: 2,
      }),
    ]));
  });

  it('requires the shared button interaction contract', () => {
    const messages = messagesFor({
      code: `
        function ButtonRoot({ children, disabled, onPress }) {
          return <Pressable disabled={disabled} onPress={onPress}>{children}</Pressable>;
        }
      `,
      filePath: 'src/components/ui/contract-fixture.tsx',
    });

    expect(messages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'code-architecture/require-interactive-component-contract',
        severity: 2,
      }),
    ]));
  });

  it.each([
    {
      name: 'disabled forwarding',
      source: buttonSource.replace(
        'disabled={disabled || loading}',
        'disabled={false}',
      ),
    },
    {
      name: 'accessibility state',
      source: buttonSource.replace(
        '          accessibilityState={{ busy: loading, disabled: unavailable }}\n',
        '',
      ),
    },
    {
      name: 'loading disabled behavior',
      source: buttonSource
        .replace(
          'accessibilityState={{ busy: loading, disabled: unavailable }}',
          'accessibilityState={{ busy: loading, disabled }}',
        )
        .replace('disabled={disabled || loading}', 'disabled={disabled}'),
    },
  ])('protects ButtonRoot $name through its real provider structure', ({ source }) => {
    const messages = messagesFor({
      code: source,
      filePath: 'src/components/ui/button.tsx',
    });

    expect(messages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'code-architecture/require-interactive-component-contract',
        severity: 2,
      }),
    ]));
  });

  it('reports configured raw design values in JSX color properties', () => {
    const directMessages = messagesFor({
      code: 'const view = <ActivityIndicator color="#EDF0EB" />;',
      filePath: 'src/components/ui/contract-fixture.tsx',
    });
    const expressionMessages = messagesFor({
      code: 'const view = <Icon tintColor={"#EDF0EB"} />;',
      filePath: 'src/components/ui/contract-fixture.tsx',
    });

    for (const [messages, property] of [
      [directMessages, 'color'],
      [expressionMessages, 'tintColor'],
    ]) {
      expect(messages).toEqual(expect.arrayContaining([
        expect.objectContaining({
          message: `Raw design value '#EDF0EB' is not allowed for '${property}'. Use palette.selectionWash instead.`,
          ruleId: 'code-architecture/no-raw-design-values',
          severity: 2,
        }),
      ]));
    }
  });

  it('rejects previously unknown raw colors in design properties', () => {
    const messages = messagesFor({
      code: "const styles = { backgroundColor: '#8A3D35' };",
      filePath: 'src/features/settings/ui/contract-fixture.tsx',
    });

    expect(messages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'code-architecture/no-raw-design-properties',
        severity: 2,
      }),
    ]));
  });

  it('requires transparent modals to dismiss through the backdrop', () => {
    const messages = messagesFor({
      code: `
        import { Modal, View } from 'react-native';
        const view = <Modal onRequestClose={close} transparent><View /></Modal>;
      `,
      filePath: 'src/features/settings/ui/contract-fixture.tsx',
    });

    expect(messages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'code-architecture/require-dismissible-modal-backdrop',
        severity: 2,
      }),
    ]));
  });

  it('keeps migrated data-safety actions on the shared button', () => {
    const messages = messagesFor({
      code: `
        import { Pressable } from 'react-native';
        const view = <Pressable onPress={confirm}><Text>Replace data</Text></Pressable>;
      `,
      filePath: 'src/features/data-safety/ui/data-safety-controls.tsx',
    });

    expect(messages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'code-architecture/prefer-design-system-components',
        severity: 2,
      }),
    ]));
  });

  it('ignores raw design values in unrelated JSX properties', () => {
    const messages = messagesFor({
      code: 'const view = <Text testID="#EDF0EB" />;',
      filePath: 'src/components/ui/contract-fixture.tsx',
    });

    expect(messages).toEqual([]);
  });

  it('reports shared UI dependencies on feature-owned UI', () => {
    const messages = messagesFor({
      code: "import { palette } from '@/features/check-in/ui/theme';",
      filePath: 'src/components/ui/contract-fixture.ts',
    });

    expect(messages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'code-architecture/enforce-module-boundaries',
        severity: 2,
      }),
    ]));
  });

  it('enforces explicit dependencies between production features', () => {
    const forbiddenMessages = messagesFor({
      code: "import { DataSafetyControls } from '@/features/data-safety/ui/data-safety-controls';",
      filePath: 'src/features/check-in/ui/contract-fixture.tsx',
    });
    const allowedMessages = messagesFor({
      code: "import type { CheckIn } from '@/features/check-in/domain/check-in';",
      filePath: 'src/features/analytics/domain/contract-fixture.ts',
    });

    expect(forbiddenMessages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'code-architecture/enforce-module-boundaries',
        severity: 2,
      }),
    ]));
    expect(allowedMessages).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'code-architecture/enforce-module-boundaries',
      }),
    ]));
  });
});
