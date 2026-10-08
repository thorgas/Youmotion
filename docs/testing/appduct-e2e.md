# Appduct E2E tests

The `e2e` mobile engine runs deterministic Pulse, Settings and restart tests on
iOS simulators and Android emulators. It calls Appduct's `skip_onboarding`
instead of tapping onboarding pages. No model provider or AI credentials are
needed. CLI telemetry is disabled by the package scripts. Setup waits for the
Appduct session to publish all three required tools before invoking them.

Use Node 22.22.3+ on the Node 22 branch, or Node 24.8+. Install with `pnpm install`.
Rebuild the development app after adding Appduct; Expo Go and existing binaries
without its native module cannot connect.

Use a **dedicated disposable device**: each test clears Youmotion's app data,
checks fresh onboarding, invokes the shortcut twice to prove idempotency, then
restores the committed synthetic archive (133 moments, 15 guiding beliefs).
The tests never use a personal journal. Fixture restoration has Appduct's
`destructiveHint`; do not override a daemon policy denial.

```sh
pnpm exec agent-device devices
EXPO_PUBLIC_E2E=true pnpm exec expo prebuild --platform ios
EXPO_PUBLIC_E2E=true pnpm ios --device '<dedicated simulator>' --no-bundler
pnpm start:e2e
```

In a second terminal:

```sh
E2E_PLATFORM=ios E2E_DEVICE='<dedicated simulator UDID or name>' pnpm test:e2e:appduct:list
E2E_PLATFORM=ios E2E_DEVICE='<dedicated simulator UDID or name>' pnpm test:e2e:appduct
```

For Android, build with `EXPO_PUBLIC_E2E=true pnpm android --device
<emulator-serial> --no-bundler`, forward Metro with `adb -s <emulator-serial>
reverse tcp:8091 tcp:8091`, and set `E2E_PLATFORM=android` and `E2E_DEVICE` to
that serial. The Appduct bootstrap reaches its host daemon through the
private-network address in the generated link. Host and device must be able to
reach each other. Each cleared Android install shows Expo's developer-menu
onboarding; setup taps its Continue button and closes the menu with Back
before asserting Youmotion's welcome screen.

If Appduct's default port 8443 is occupied, use a task-owned state directory
with an OS-assigned port. This does not alter the user's Appduct configuration
or tool policies:

```sh
mkdir -p /tmp/youmotion-appduct-e2e
printf '{"wssPort":0}\n' > /tmp/youmotion-appduct-e2e/config.json
APPDUCT_STATE_DIR=/tmp/youmotion-appduct-e2e E2E_PLATFORM=ios E2E_DEVICE='<dedicated simulator>' pnpm test:e2e:appduct
```

Do not overwrite that config if the directory already belongs to another run.

Appduct sessions are minted per test and selected by their returned session ID,
so another connected app is never selected implicitly. Client connections close
in `finally`; the shared daemon is left running for other sessions.

Tools live in `src/development/appduct-tools.tsx`. They register only when
`__DEV__` and `EXPO_PUBLIC_E2E=true`. Bootstrap uses the same gate. Metro resolves
Appduct imports to its inert module outside E2E, and native Release builds omit
Appduct by default. Do not enable `APPDUCT_ENABLED=1` for store builds. Check a
Release artifact with `pnpm exec appduct doctor <artifact> --assert-absent`.

The shortcut sends the existing onboarding event to the root actor and waits
for completion in the native database before returning. A storage failure or
timeout fails setup instead of reporting success. No second navigation state
or direct settings write is introduced by the shortcut.

Jest covers startup gates, idempotency, persistence/read failures and the real
navigation actor. `src/__tests__/appduct-onboarding.harness.ts` exercises the
same helper and archive transaction on the native runtime. Run it with the
existing Harness configuration and a freshly rebuilt test binary.

```sh
RN_HARNESS_IOS_DEVICE='<dedicated simulator name>' RN_HARNESS_IOS_VERSION='<iOS runtime version>' RN_HARNESS_METRO_PORT=8083 pnpm test:harness:ios appduct-onboarding
```

The same native helper can be checked on Android using a dedicated emulator:

```sh
ANDROID_SERIAL='<emulator-serial>' RN_HARNESS_ANDROID_AVD='<dedicated AVD>' pnpm test:harness:android appduct-onboarding
```

Reports and evidence are written under `artifacts/e2e-appduct/` (gitignored).
The existing Argent scripts remain available under their original names.

During local verification on 7 October 2026, Expo's native fingerprint loader
recursively spawned child processes. The disposable development build can use
`EXPO_UPDATES_FINGERPRINT_OVERRIDE=0000000000000000000000000000000000000000`
with `MOBILE_UPDATE_CHANNEL=none` to skip that calculation. This override is
only for local test builds; never use it for OTA publication or store builds.

## Source code links

`e2e/appduct/source-code.e2e.ts` uses the same disposable-device setup and
synthetic archive. It covers the production Settings source row, the exact
HTTPS repository destination, English and German browser recovery, dismissal,
retry, and returning to Settings/Pulse. A separate native-browser test opens
the real browser and closes it with iOS Close or Android Back. Repository
network availability is not an assertion: private GitHub repositories can
show a 404 until publication.

```sh
E2E_PLATFORM=ios E2E_DEVICE='<dedicated simulator>' pnpm test:e2e:appduct e2e/appduct/source-code.e2e.ts --repeat-each 2
E2E_PLATFORM=android E2E_DEVICE='<dedicated emulator>' pnpm test:e2e:appduct e2e/appduct/source-code.e2e.ts --repeat-each 2
pnpm test:e2e:website
```

The `configure_source_code_browser` and `read_source_code_browser` tools use a
memory-only adapter enabled exclusively by `__DEV__` and `EXPO_PUBLIC_E2E=true`.
They accept no URL, credentials or journal content. Native is the default;
production builds cannot enable the test adapter. Tests restore native mode
and close their Appduct client in teardown. Each run clears only the selected
disposable app's state; never select a personal device. Bootstrap links after
restart retain their Appduct query but target Today, avoiding the empty root
route. iOS and Android runner sessions have distinct names.

The native iOS return assertion retries only the automation runner's known
“still finishing” accessibility-watchdog response while it settles; other
errors propagate. No AI/model calls or automatic test retries are configured.


When other tooling uses a different agent-device version, isolate the E2E
mobile engine's daemon as well as Appduct. This avoids replacing another
session's daemon or losing its device binding:

```sh
AGENT_DEVICE_STATE_DIR=/tmp/youmotion-source-device-android AGENT_DEVICE_PLATFORM=android AGENT_DEVICE_ANDROID_DEVICE_ALLOWLIST='<dedicated emulator>' APPDUCT_STATE_DIR=/tmp/youmotion-appduct-e2e E2E_PLATFORM=android E2E_DEVICE='<dedicated emulator>' pnpm test:e2e:appduct e2e/appduct/source-code.e2e.ts
```

Use a different task-owned directory per platform. Do not stop or replace the
user's shared daemon or ADB server to recover a scoped run.

The Android allowlist is process-scoped and accepts only the named disposable
emulator. It prevents unrelated connected devices from entering discovery or
being selected if a timed-out session loses its binding. Use a fresh task-owned
daemon directory when changing these discovery environment values.


Android bootstrap restores only the selected emulator's `tcp:8091` reverse
forwarding after both app-state reset and restart, because the device runner
can remove a prior session's mapping. `e2e/appduct/metro.mjs` invokes ADB with
an argument array, validates the disposable emulator serial, and bounds the
command to 15 seconds. It never restarts the shared ADB server.

The recovery flow uses measured control/tab frames to scroll only when an
error action would overlap the tab bar; it then asserts the complete action
is above that bar. This avoids a full-screen Android overscroll while proving
both recovery actions remain physically reachable on iOS.
