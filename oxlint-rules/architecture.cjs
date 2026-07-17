'use strict';

const frameworkPackages = /^(react|react-native|expo|expo-|xstate|@xstate\/|effect)/;
const bannedReactHooks = new Set(['useEffect', 'useState']);
const xstateHooks = new Set(['useMachine', 'useActor', 'useActorRef']);
const syncSchemaApis = new Set(['decodeSync', 'decodeUnknownSync', 'encodeSync', 'validateSync']);

const normalizedFilename = (context) => context.getFilename().replaceAll('\\', '/');

const noFrameworkInDomain = {
  meta: {
    type: 'problem',
    docs: { description: 'Keep domain modules independent from UI, state, and effect frameworks.' },
    messages: { forbidden: 'Domain code must not import framework package "{{source}}".' },
    schema: [],
  },
  create(context) {
    if (!normalizedFilename(context).includes('/domain/')) return {};
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (source === 'effect/Schema') return;
        if (typeof source === 'string' && frameworkPackages.test(source)) {
          context.report({ node, messageId: 'forbidden', data: { source } });
        }
      },
    };
  },
};

const uiCannotReachInfrastructure = {
  meta: {
    type: 'problem',
    docs: { description: 'UI may call application controllers, never infrastructure or orchestration libraries.' },
    messages: { forbidden: 'UI must use an application controller instead of importing "{{source}}".' },
    schema: [],
  },
  create(context) {
    if (!normalizedFilename(context).includes('/ui/')) return {};
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== 'string') return;
        const reachesInfrastructure = source.includes('/infrastructure/') || source.includes('../infrastructure');
        const reachesOrchestration = /^(xstate|effect)$/.test(source);
        if (reachesInfrastructure || reachesOrchestration) {
          context.report({ node, messageId: 'forbidden', data: { source } });
        }
      },
    };
  },
};

const featurePublicApi = {
  meta: {
    type: 'problem',
    docs: { description: 'Routes may import only explicit feature screen modules.' },
    messages: { deepImport: 'Routes may import only a feature UI module ending in -screen.' },
    schema: [],
  },
  create(context) {
    const filename = normalizedFilename(context);
    const isRoute = filename.includes('/src/app/');
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== 'string') return;
        if (!isRoute || !source.startsWith('@/features/')) return;
        if (!/^@\/features\/[^/]+\/ui\/[^/]+-screen$/.test(source)) {
          context.report({ node, messageId: 'deepImport' });
        }
      },
    };
  },
};

const noReactStateHooks = {
  meta: { type: 'problem', docs: { description: 'Use XState actors for state and side effects.' }, messages: { banned: '{{hook}} is banned. Model this with an XState actor.' }, schema: [] },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        const hook = callee.type === 'Identifier'
          ? callee.name
          : callee.type === 'MemberExpression' && callee.property.type === 'Identifier'
            ? callee.property.name
            : undefined;
        if (hook && bannedReactHooks.has(hook)) context.report({ node: callee, messageId: 'banned', data: { hook } });
      },
    };
  },
};

const singleXStateHook = {
  meta: { type: 'problem', docs: { description: 'Compose machines with actors instead of wiring multiple hooks.' }, messages: { multiple: 'This component uses multiple XState actor hooks. Compose machines with actors instead.' }, schema: [] },
  create(context) {
    const componentStack = [];
    const enter = (node) => componentStack.push({ node, calls: [] });
    const exit = () => {
      const component = componentStack.pop();
      if (!component || component.calls.length < 2) return;
      component.calls.slice(1).forEach((node) => context.report({ node, messageId: 'multiple' }));
    };
    return {
      FunctionDeclaration: enter,
      'FunctionDeclaration:exit': exit,
      ArrowFunctionExpression: enter,
      'ArrowFunctionExpression:exit': exit,
      FunctionExpression: enter,
      'FunctionExpression:exit': exit,
      CallExpression(node) {
        if (componentStack.length === 0 || node.callee.type !== 'Identifier') return;
        if (xstateHooks.has(node.callee.name)) componentStack[componentStack.length - 1].calls.push(node);
      },
    };
  },
};

const noInlineJsxCallbacks = {
  meta: { type: 'problem', docs: { description: 'Components display data and send named events.' }, messages: { inline: 'Do not create callbacks inside JSX. Pass an actor trigger or a named event delegate.' }, schema: [] },
  create(context) {
    return {
      JSXExpressionContainer(node) {
        if (node.expression.type === 'ArrowFunctionExpression' || node.expression.type === 'FunctionExpression') {
          context.report({ node: node.expression, messageId: 'inline' });
        }
      },
    };
  },
};

const noMultipleFunctionParams = {
  meta: { type: 'problem', docs: { description: 'Functions with multiple inputs accept one object parameter.' }, messages: { multiple: 'Use one object parameter so call sites are explicit and extensible.' }, schema: [] },
  create(context) {
    const check = (node) => {
      if (node.parent?.type === 'CallExpression') return;
      if (
        node.params.length === 2
        && node.params[0].type === 'Identifier'
        && ['context', '_context'].includes(node.params[0].name)
        && node.params[1].type === 'Identifier'
        && node.params[1].name === 'event'
      ) return;
      if (node.params.length === 2 && node.params[1].type === 'Identifier' && node.params[1].name === 'enq') return;
      if (node.params.length > 1) context.report({ node, messageId: 'multiple' });
    };
    return { FunctionDeclaration: check, FunctionExpression: check, ArrowFunctionExpression: check };
  },
};

const noTypeAssertion = {
  meta: { type: 'problem', docs: { description: 'Validate unknown data with Effect Schema; never assert types.' }, messages: { assertion: 'Type assertions bypass validation. Decode with Effect Schema or use satisfies.' }, schema: [] },
  create(context) {
    return {
      TSAsExpression(node) { context.report({ node, messageId: 'assertion' }); },
      TSTypeAssertion(node) { context.report({ node, messageId: 'assertion' }); },
    };
  },
};

const noSwitch = {
  meta: { type: 'problem', docs: { description: 'Use Effect Match for exhaustive branching.' }, messages: { switch: 'Use Match from effect/Match for exhaustive branching instead of switch.' }, schema: [] },
  create(context) { return { SwitchStatement(node) { context.report({ node, messageId: 'switch' }); } }; },
};

const noSyncSchemaApis = {
  meta: { type: 'problem', docs: { description: 'Keep Schema failures in the Effect error channel.' }, messages: { sync: 'Use the effectful Schema API so parse failures remain typed.' }, schema: [] },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type !== 'MemberExpression' || node.callee.property.type !== 'Identifier') return;
        if (syncSchemaApis.has(node.callee.property.name)) context.report({ node, messageId: 'sync' });
      },
    };
  },
};

const noBarrelFiles = {
  meta: { type: 'problem', docs: { description: 'Use direct imports and explicit module paths.' }, messages: { barrel: 'Barrel files are forbidden. Import the owning module directly.' }, schema: [] },
  create(context) {
    const filename = normalizedFilename(context);
    if (!/\/index\.[jt]sx?$/.test(filename)) return {};
    return {
      ExportNamedDeclaration(node) { context.report({ node, messageId: 'barrel' }); },
      ExportAllDeclaration(node) { context.report({ node, messageId: 'barrel' }); },
    };
  },
};

const noComments = {
  meta: { type: 'problem', docs: { description: 'Prefer expressive types and names over explanatory comments.' }, messages: { comment: 'Remove the comment and make the code express the invariant directly.' }, schema: [] },
  create(context) {
    return {
      Program() {
        context.sourceCode.getAllComments().forEach((comment) => {
          const value = comment.value.trim();
          const isExistingToolDirective = /(eslint|@ts-|istanbul|c8)/.test(value);
          const isReasonedOxlintDisable = /^oxlint-disable(?:-next-line|-line)?\s+\S.*\s--\s+\S/.test(value);
          const isOxlintEnable = /^oxlint-enable\b/.test(value);
          if (!isExistingToolDirective && !isReasonedOxlintDisable && !isOxlintEnable) {
            context.report({ node: comment, messageId: 'comment' });
          }
        });
      },
    };
  },
};

module.exports = {
  meta: { name: 'architecture' },
  rules: {
    'no-framework-in-domain': noFrameworkInDomain,
    'ui-cannot-reach-infrastructure': uiCannotReachInfrastructure,
    'feature-public-api': featurePublicApi,
    'no-react-state-hooks': noReactStateHooks,
    'single-xstate-hook': singleXStateHook,
    'no-inline-jsx-callbacks': noInlineJsxCallbacks,
    'no-multiple-function-params': noMultipleFunctionParams,
    'no-type-assertion': noTypeAssertion,
    'no-switch': noSwitch,
    'no-sync-schema-apis': noSyncSchemaApis,
    'no-barrel-files': noBarrelFiles,
    'no-comments': noComments,
  },
};
