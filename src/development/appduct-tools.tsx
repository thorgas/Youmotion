import { useAppductTool } from '@appduct/react-native';
import * as JSONSchema from 'effect/JSONSchema';
import * as Schema from 'effect/Schema';
import assert from '@/assert';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import { OnboardingToolResultSchema, readOnboardingState, skipOnboarding } from './appduct-onboarding';
import { FixtureToolInputSchema, FixtureToolResultSchema, seedArchiveFixture } from './appduct-fixture';

import { configureSourceCodeBrowser, readSourceCodeBrowser, SourceCodeBrowserInputSchema, SourceCodeBrowserResultSchema } from './appduct-source-code';

const inputSchema = {
  schema: Schema.standardSchemaV1(Schema.Struct({})),
  jsonSchema: { type: 'object', properties: {}, additionalProperties: false },
};
const outputSchema = {
  schema: Schema.standardSchemaV1(OnboardingToolResultSchema),
  jsonSchema: JSONSchema.make(OnboardingToolResultSchema),
};

export function AppductTools() {
  const actor = useAppNavigationActor();
  assert(actor.getSnapshot().status === 'active', 'Appduct tools require the active app actor.');
  assert(actor.getSnapshot().context.onboardingSelection === null || actor.getSnapshot().context.onboardingEntryPoint !== null, 'A practice selection requires an onboarding entry point.');
  const enabled = __DEV__ && process.env.EXPO_PUBLIC_E2E === 'true';
  useAppductTool({
    name: 'skip_onboarding',
    description: 'Skip onboarding through the navigation actor and wait for persisted completion. Requires an E2E development build; does not create journal entries. Safe to repeat.',
    inputSchema,
    outputSchema,
    annotations: { idempotentHint: true, destructiveHint: false },
    timeoutMs: 20_000,
    handler: (...call) => skipOnboarding({ actor, signal: call[1].signal }),
  }, undefined, { enabled });
  useAppductTool({
    name: 'get_onboarding_state',
    description: 'Read persisted onboarding completion from the native database.',
    inputSchema,
    outputSchema,
    annotations: { readOnlyHint: true },
    handler: readOnboardingState,
  }, undefined, { enabled });
  useAppductTool({
    name: 'seed_archive_fixture',
    description: 'Replace the disposable test journal with the committed synthetic archive: 133 moments and 15 guiding beliefs. Restart the app afterwards to hydrate its stores.',
    inputSchema: {
      schema: Schema.standardSchemaV1(FixtureToolInputSchema),
      jsonSchema: JSONSchema.make(FixtureToolInputSchema),
    },
    outputSchema: {
      schema: Schema.standardSchemaV1(FixtureToolResultSchema),
      jsonSchema: JSONSchema.make(FixtureToolResultSchema),
    },
    annotations: { destructiveHint: true, idempotentHint: true },
    timeoutMs: 30_000,
    handler: seedArchiveFixture,
  }, undefined, { enabled });
  useAppductTool({
    name: 'configure_source_code_browser',
    description: 'Configure a memory-only browser outcome in an explicit E2E development build. Accepts no destination or journal data. Native restores the normal browser.',
    inputSchema: {
      schema: Schema.standardSchemaV1(SourceCodeBrowserInputSchema),
      jsonSchema: JSONSchema.make(SourceCodeBrowserInputSchema),
    },
    outputSchema: {
      schema: Schema.standardSchemaV1(SourceCodeBrowserResultSchema),
      jsonSchema: JSONSchema.make(SourceCodeBrowserResultSchema),
    },
    annotations: { idempotentHint: true },
    handler: configureSourceCodeBrowser,
  }, undefined, { enabled });
  useAppductTool({
    name: 'read_source_code_browser',
    description: 'Read only the public repository URLs requested through the E2E browser adapter. Contains no journal data.',
    inputSchema,
    outputSchema: {
      schema: Schema.standardSchemaV1(SourceCodeBrowserResultSchema),
      jsonSchema: JSONSchema.make(SourceCodeBrowserResultSchema),
    },
    annotations: { readOnlyHint: true },
    handler: readSourceCodeBrowser,
  }, undefined, { enabled });
  return null;
}
