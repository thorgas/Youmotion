import * as WebBrowser from 'expo-web-browser';
import * as Schema from 'effect/Schema';

import assert from '@/assert';
import { SOURCE_CODE_URL } from '@/constants';

export class SourceCodeBrowserError extends Schema.TaggedError<SourceCodeBrowserError>()(
  'SourceCodeBrowserError',
  { cause: Schema.Unknown },
) {}

type SourceCodeBrowserTestMode = 'success' | 'failure' | 'native';
let testMode: SourceCodeBrowserTestMode = 'native';
let testUrls: string[] = [];

function requireBrowserTestMode() {
  assert(__DEV__, 'Source code browser test control requires a development build.');
  assert(process.env.EXPO_PUBLIC_E2E === 'true', 'Source code browser test control requires explicit E2E mode.');
}

export function configureSourceCodeBrowserTest({ mode }: { mode: SourceCodeBrowserTestMode }) {
  requireBrowserTestMode();
  assert(mode === 'success' || mode === 'failure' || mode === 'native', 'Browser test mode must be supported.');
  testMode = mode;
  testUrls = [];
  assert(testUrls.length === 0, 'A new browser test must discard previous requests.');
}

export function readSourceCodeBrowserTest() {
  requireBrowserTestMode();
  const result: { mode: SourceCodeBrowserTestMode; urls: readonly string[] } = { mode: testMode, urls: [...testUrls] };
  assert(Array.isArray(result.urls), 'Browser test requests must be an array.');
  assert(result.urls.every((url) => url === SOURCE_CODE_URL), 'Browser test requests must target the configured repository.');
  return result;
}

export async function openSourceCode() {
  try {
    if (__DEV__ && process.env.EXPO_PUBLIC_E2E === 'true') {
      testUrls.push(SOURCE_CODE_URL);
      if (testMode === 'failure') {
        throw new Error('Simulated source code browser launch failure.');
      }
      if (testMode === 'success') return;
    }
    await WebBrowser.openBrowserAsync(SOURCE_CODE_URL, {
      dismissButtonStyle: 'close',
      enableBarCollapsing: true,
      showTitle: true,
    });
  } catch (cause) {
    throw SourceCodeBrowserError.make({ cause });
  }
}
