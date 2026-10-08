import assert from '@/assert';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { configureSourceCodeBrowserTest, readSourceCodeBrowserTest } from '@/features/source-code/infrastructure/source-code-browser';

export const SourceCodeBrowserInputSchema = Schema.Struct({ mode: Schema.Literal('success', 'failure', 'native') });
export const SourceCodeBrowserResultSchema = Schema.Struct({ mode: Schema.Literal('success', 'failure', 'native'), urls: Schema.Array(Schema.String) });

export async function configureSourceCodeBrowser(input: unknown) {
  const decoded = await Effect.runPromise(Schema.decodeUnknown(SourceCodeBrowserInputSchema)(input));
  assert(decoded.mode === 'success' || decoded.mode === 'failure' || decoded.mode === 'native', 'E2E browser mode must be supported.');
  configureSourceCodeBrowserTest(decoded);
  const result = readSourceCodeBrowserTest();
  assert(Array.isArray(result.urls), 'Browser test results require a request array.');
  assert(result.mode === 'success' || result.mode === 'failure' || result.mode === 'native', 'Browser test result mode must be supported.');
  return result;
}

export function readSourceCodeBrowser() {
  const result = readSourceCodeBrowserTest();
  assert(Array.isArray(result.urls), 'Browser test results require a request array.');
  assert(result.mode === 'success' || result.mode === 'failure' || result.mode === 'native', 'Browser test result mode must be supported.');
  return result;
}
