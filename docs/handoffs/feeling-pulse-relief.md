# Feeling Pulse contour relief handoff

## Goal

Keep one raised Feeling Pulse peak with subtle 3D relief, let its animated waves briefly remember the prior drag position, and avoid any separate fixed guide waves.

## Scope

- Branch: `codex/feeling-pulse-contours` (feature branch under `Youmotion` worktree).
- Files changed (task-owned):  
  - `src/features/check-in/ui/base-state-ripples.tsx`
  - `src/assert.ts`
  - `src/constants.ts`
  - `jest.setup.js`
  - `src/features/check-in/ui/emotion-star.tsx`
  - `src/features/check-in/__tests__/feeling-pulse-visuals.test.tsx`
  - `src/features/check-in/__tests__/feeling-pulse-visuals.harness.tsx`
  - `.argent/flows/e2e/feeling-pulse-relief.yaml`
  - `docs/screenshots/feeling-pulse/ios-no-static-guides.png`
  - `docs/checklist-design-improvements-test-matrix.md`

## Implementation notes

- `emotion-star.tsx` renders only `BaseStateRipples`; the separate fixed SVG guide layer was removed after simulator review showed that it read as static waves.
- `base-state-ripples.tsx` now wraps the moving origin dot in a new `feeling-pulse-peak` container with highlight/shadow accents to read as a raised center peak.
- A single lower-opacity ripple field now follows the previous drag position for 280 ms, retargets continuously, and fades after a 70 ms hold. It reuses the active ripple phase so the old waves keep moving instead of freezing.
- Reduced Motion removes spatial drift and uses a 160 ms opacity-only crossfade. The existing assertion helper is now worklet-compatible so the UI-thread reaction retains finite-coordinate invariants.
- All visual IDs used by tests were aligned between unit and harness files:
  - `feeling-pulse-peak`, `ripple-origin`, `water-ripple-ring`
  - `feeling-pulse-memory`, `feeling-pulse-memory-ring`.
- No new dependency, domain type, persisted data, navigation state, or interaction geometry was introduced. The only new configuration surface is `FEELING_PULSE_MEMORY` in `src/constants.ts`.
- The saved Argent flow verifies that the feature surface launches, completes a 1000 ms drag, reaches Reflection, cancels without saving, and returns to the Feeling Pulse.

## Verification notes

- `pnpm test -- --runInBand src/features/check-in/__tests__/feeling-pulse-visuals.test.tsx`
  - passes (`2/2`) in the current environment.
- `pnpm test:harness:ios -- --runInBand src/features/check-in/__tests__/feeling-pulse-visuals.harness.tsx`
  - passes (`1/1`) on the iPhone 17 Pro simulator.
- `pnpm verify`
  - passes Oxlint, ESLint, TypeScript 7, and Jest (`46/46` suites, `308/308` tests).
- `pnpm test:coverage`
  - passes (`46/46` suites, `308/308` tests) with all configured thresholds met.
- `pnpm doctor:react`
  - reports no finding in the production files changed for positional memory. Its existing Harness-shim maintainability warning and unrelated repository findings remain; the untracked service-account JSON is reported as a security error and remains untouched.
- Native app build and launch pass on the iPhone 17 Pro Max. The current evidence is `docs/screenshots/feeling-pulse/ios-no-static-guides.png`; obsolete screenshots containing the removed fixed guide layer were deleted.
- Positional-memory commit `34500d9` remains the moving-wave implementation; the follow-up removes only the static SVG circles and preserves its current and trailing emitters.
- The focused iOS Harness passes cleanly on the iPhone 17 Pro (`1/1`); its Reanimated shim now includes the reaction hook used by the production component.
- The production iPhone 17 Pro Max accepted the equivalent automated drag through `agent-device` and reached Reflection. The permanent Argent flow parses and reaches its gesture, but three runs did not deliver the swipe to React Native and timed out awaiting `reflection-note-input`. The alternate physical Pixel 6a is securely locked and the Android emulator is offline. Keep the drag assertion intact and rerun the documented two-pass command when an Argent-compatible unlocked target is available.

## Reproduction commands

```sh
pnpm install
pnpm verify
pnpm test:coverage
pnpm test:harness:ios -- --runInBand src/features/check-in/__tests__/feeling-pulse-visuals.harness.tsx
pnpm start:e2e
E2E_DEVICE=<dedicated-simulator-udid> E2E_PLATFORM=ios pnpm test:e2e --flow feeling-pulse-relief.yaml --passes 2
```

Run Metro in its own terminal before the final command. Use a dedicated, unlocked simulator whose Argent native-devtools service registers successfully.
