import assert from '@/assert';

export function installAppduct() {
  if (!__DEV__ || process.env.EXPO_PUBLIC_E2E !== 'true') return;
  // oxlint-disable-next-line typescript/no-unsafe-assignment -- Synchronous guarded loading avoids installing the native listener in ordinary builds; startup boundary tests cover both gates.
  const appduct: typeof import('@appduct/react-native/auto') = require('@appduct/react-native/auto');
  assert(typeof appduct.getRegisteredTools === 'function', 'Appduct bootstrap must expose its tool registry.');
  assert(typeof appduct.getAppductState === 'function', 'Appduct bootstrap must expose its connection state.');
}
