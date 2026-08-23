const { spawnSync } = require('node:child_process');
const path = require('node:path');

const packageJson = require('../../package.json');

const cwd = path.resolve(__dirname, '../..');
const eslint = path.join(cwd, 'node_modules', '.bin', 'eslint');

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
      '0.4.0-alpha.1',
    );
    expect(packageJson.scripts.lint).toContain('pnpm lint:architecture');
    expect(packageJson.scripts.verify).toContain('pnpm lint');
  });

  it('enables every Youmotion-applicable plugin rule as an error', () => {
    const configuredRules = configuredRulesFor(
      'src/components/ui/contract-fixture.tsx',
    );
    const applicableRules = exportedRuleNames()
      .filter((ruleName) => ruleName !== 'require-assertions');

    expect(applicableRules).toHaveLength(17);
    for (const ruleName of applicableRules) {
      expect(configuredRules[`code-architecture/${ruleName}`]?.[0]).toBe(2);
    }
    expect(configuredRules['code-architecture/require-assertions']).toBeUndefined();
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
      expect(messages).toEqual([
        expect.objectContaining({
          message: `Raw design value '#EDF0EB' is not allowed for '${property}'. Use palette.selectionWash instead.`,
          ruleId: 'code-architecture/no-raw-design-values',
          severity: 2,
        }),
      ]);
    }
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
});
