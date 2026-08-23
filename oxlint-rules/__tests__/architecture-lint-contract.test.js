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

describe('architecture lint contract', () => {
  it('keeps the alpha plugin in the main verification path', () => {
    expect(packageJson.devDependencies['eslint-plugin-code-architecture']).toBe(
      '0.4.0-alpha.1',
    );
    expect(packageJson.scripts.lint).toContain('pnpm lint:architecture');
    expect(packageJson.scripts.verify).toContain('pnpm lint');
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
        severity: 1,
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
          message: `Raw design value '#EDF0EB' is not allowed for '${property}'. Use a shared semantic selection-wash token instead.`,
          ruleId: 'code-architecture/no-raw-design-values',
          severity: 1,
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
        severity: 1,
      }),
    ]));
  });
});
