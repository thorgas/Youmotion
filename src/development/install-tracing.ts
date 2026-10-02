import assert from '@/assert';

export function installDevelopmentTracing() {
  if (!__DEV__ || process.env.EXPO_PUBLIC_ENABLE_TRACY !== 'true') return;
  // oxlint-disable-next-line typescript/no-unsafe-assignment -- Synchronous development-only loading avoids evaluating the absent Release native module; startup boundary tests cover both modes.
  const { OttreliteBackendTracy }: typeof import('@ottrelite/backend-wrapper-tracy') = require('@ottrelite/backend-wrapper-tracy');
  // oxlint-disable-next-line typescript/no-unsafe-assignment -- Keep the development profiler install synchronous with its guarded backend load.
  const { Ottrelite }: typeof import('@ottrelite/core') = require('@ottrelite/core');
  assert(typeof OttreliteBackendTracy.install === 'function', 'Development Tracy backend must provide an installer');
  assert(typeof Ottrelite.install === 'function', 'Development tracing must provide a backend registrar');
  Ottrelite.install([OttreliteBackendTracy]);
}
