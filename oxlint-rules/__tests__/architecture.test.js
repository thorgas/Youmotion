const { RuleTester } = require('eslint');
const architecture = require('../architecture.cjs');

const tester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: 'module' } });

tester.run('no-slow-english-locale-lowercase', architecture.rules['no-slow-english-locale-lowercase'], {
  valid: [
    { code: 'value.toLowerCase();', filename: '/repo/src/search.ts' },
    { code: 'value.toLocaleLowerCase();', filename: '/repo/src/search.ts' },
    { code: "value.toLocaleLowerCase('de');", filename: '/repo/src/search.ts' },
    { code: "value.toLocaleLowerCase('en-US');", filename: '/repo/src/search.ts' },
    { code: "value.toLocaleUpperCase('en'); left.localeCompare(right, 'en');", filename: '/repo/src/search.ts' },
    { code: "value.toLocaleLowerCase('en');", filename: '/repo/src/__tests__/search.test.ts' },
    { code: "value.toLocaleLowerCase('en');", filename: '/repo/scripts/tool.js' },
    { code: "value[method]('en');", filename: '/repo/src/search.ts' },
    { code: "const lower = value.toLocaleLowerCase;", filename: '/repo/src/search.ts' },
  ],
  invalid: [
    { code: "value.toLocaleLowerCase('en');", filename: '/repo/src/search.ts', errors: [{ messageId: 'slow' }] },
    { code: "value['toLocaleLowerCase']('en');", filename: '/repo/src/search.ts', errors: [{ messageId: 'slow' }] },
    { code: "value?.toLocaleLowerCase('en');", filename: '/repo/src/search.ts', errors: [{ messageId: 'slow' }] },
    { code: "value.toLocaleLowerCase?.('en');", filename: '/repo/src/search.ts', errors: [{ messageId: 'slow' }] },
  ],
});

tester.run('no-unsupported-hermes-apis', require('../architecture.cjs').rules['no-unsupported-hermes-apis'], {
  valid: [
    { code: 'const sorted = values.slice().sort();', filename: '/repo/src/domain/candidates.ts' },
    { code: 'values.toSorted();', filename: '/repo/src/__tests__/candidates.test.ts' },
  ],
  invalid: [
    { code: 'values.toSorted();', filename: '/repo/src/domain/candidates.ts', errors: [{ messageId: 'unsupported' }] },
    { code: "values['toSorted']();", filename: '/repo/src/ui/screen.ts', errors: [{ messageId: 'unsupported' }] },
    { code: 'values?.toSorted();', filename: '/repo/src/domain/candidates.ts', errors: [{ messageId: 'unsupported' }] },
  ],
});

tester.run('no-framework-in-domain', architecture.rules['no-framework-in-domain'], {
  valid: [{ code: "import { clamp } from './math';", filename: '/app/src/features/check-in/domain/value.ts' }],
  invalid: [{
    code: "import React from 'react';",
    filename: '/app/src/features/check-in/domain/value.ts',
    errors: [{ messageId: 'forbidden' }],
  }],
});

tester.run('ui-cannot-reach-infrastructure', architecture.rules['ui-cannot-reach-infrastructure'], {
  valid: [{ code: "import { useFlow } from '../application/use-flow';", filename: '/app/src/features/check-in/ui/screen.tsx' }],
  invalid: [{
    code: "import { save } from '../infrastructure/repository';",
    filename: '/app/src/features/check-in/ui/screen.tsx',
    errors: [{ messageId: 'forbidden' }],
  }],
});

tester.run('feature-public-api', architecture.rules['feature-public-api'], {
  valid: [{ code: "import { Screen } from '@/features/check-in/ui/check-in-screen';", filename: '/app/src/app/index.tsx' }],
  invalid: [{
    code: "import { Screen } from '@/features/check-in/ui/screen';",
    filename: '/app/src/app/index.tsx',
    errors: [{ messageId: 'deepImport' }],
  }],
});

tester.run('no-react-state-hooks', architecture.rules['no-react-state-hooks'], {
  valid: [{ code: 'useMachine(machine);' }],
  invalid: [{ code: 'useEffect(() => {}, []);', errors: [{ messageId: 'banned' }] }],
});

tester.run('single-xstate-hook', architecture.rules['single-xstate-hook'], {
  valid: [{ code: 'function Screen() { useMachine(machine); }' }],
  invalid: [{ code: 'function Screen() { useMachine(one); useActor(two); }', errors: [{ messageId: 'multiple' }] }],
});

tester.run('no-inline-jsx-callbacks', architecture.rules['no-inline-jsx-callbacks'], {
  valid: [{ code: 'const view = <Button onPress={actor.trigger.save} />;', languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } }],
  invalid: [{ code: 'const view = <Button onPress={() => save()} />;', languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } }, errors: [{ messageId: 'inline' }] }],
});

tester.run('no-multiple-function-params', architecture.rules['no-multiple-function-params'], {
  valid: [
    { code: 'function run({ value, limit }) {}' },
    {
      code: 'function assert(condition: unknown, message: string): asserts condition {}',
      languageOptions: { parser: require('typescript-eslint').parser },
    },
  ],
  invalid: [{ code: 'function run(value, limit) {}', errors: [{ messageId: 'multiple' }] }],
});

tester.run('no-type-assertion', architecture.rules['no-type-assertion'], {
  valid: [{ code: 'const value = input;', languageOptions: { parser: require('typescript-eslint').parser } }],
  invalid: [{ code: 'const value = input as string;', languageOptions: { parser: require('typescript-eslint').parser }, errors: [{ messageId: 'assertion' }] }],
});

tester.run('no-comments', architecture.rules['no-comments'], {
  valid: [{ code: '/* oxlint-disable jsx-a11y/no-autofocus -- This flow opens directly into writing. */\nconst value = true;\n/* oxlint-enable jsx-a11y/no-autofocus */' }],
  invalid: [
    { code: '/* Explain this code. */\nconst value = true;', errors: [{ messageId: 'comment' }] },
    { code: '/* oxlint-disable jsx-a11y/no-autofocus */\nconst value = true;', errors: [{ messageId: 'comment' }] },
  ],
});
