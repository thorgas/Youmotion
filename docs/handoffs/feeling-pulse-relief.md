# Feeling Pulse contour relief handoff

## Goal

Refine the Feeling Pulse visual guidance so all contour rings are fully round (no dashed edges), and keep the raised peak centered under the ripple origin while adding a subtle 3D relief cue.

## Scope

- Branch: `codex/feeling-pulse-contours` (feature branch under `Youmotion` worktree).
- Files changed (task-owned):  
  - `src/features/check-in/ui/feeling-pulse-guides.tsx`
  - `src/features/check-in/ui/base-state-ripples.tsx`
  - `src/features/check-in/ui/emotion-star.tsx`
  - `src/features/check-in/__tests__/feeling-pulse-visuals.test.tsx`
  - `src/features/check-in/__tests__/feeling-pulse-visuals.harness.tsx`
  - `.argent/flows/e2e/feeling-pulse-relief.yaml`
  - `docs/screenshots/feeling-pulse/ios-idle-round-guides.png`
  - `docs/checklist-design-improvements-test-matrix.md`

## Implementation notes

- `emotion-star.tsx` now delegates guide rendering to a dedicated `FeelingPulseGuides` component.
- Guide rendering changed from dashed `Circle` elements to fully round circles with layered shadow/highlight strokes for depth.
- `base-state-ripples.tsx` now wraps the moving origin dot in a new `feeling-pulse-peak` container with highlight/shadow accents to read as a raised center peak.
- All visual IDs used by tests were aligned between unit and harness files:
  - `feeling-pulse-guide`, `feeling-pulse-guide-highlight`, `feeling-pulse-guide-shadow`
  - `feeling-pulse-peak`, `ripple-origin`.
- No new dependency, domain type, persisted data, navigation state, or interaction geometry was introduced.
- The saved Argent flow is designed to verify that the feature surface launches and is exposed after the development-client overlay is dismissed. Its one raw tap is limited to the fixed dev-client close position because that overlay was visible to the platform tree but absent from Argent's flow selector tree.

## Verification notes

- `pnpm test -- --runInBand src/features/check-in/__tests__/feeling-pulse-visuals.test.tsx`
  - passes (`2/2`) in the current environment.
- `pnpm test:harness:ios -- --runInBand src/features/check-in/__tests__/feeling-pulse-visuals.harness.tsx`
  - passes (`1/1`) on the iPhone 17 Pro simulator.
- `pnpm verify`
  - passes Oxlint, ESLint, TypeScript 7, and Jest (`46/46` suites, `307/307` tests).
- `pnpm test:coverage`
  - passes (`46/46` suites, `307/307` tests) with all configured thresholds met.
- `pnpm doctor:react`
  - reports only pre-existing repository findings; no task-owned file is flagged. The untracked service-account JSON is reported as a security error and remains untouched.
- Native app build and launch pass on the iPhone 17 Pro Max. Screenshot evidence for UI commit `f60bf2e` is `docs/screenshots/feeling-pulse/ios-idle-round-guides.png`.
- Two-pass Argent replay is environment-blocked after three isolated targets: native-devtools registration failed on the iPhone 17 Pro Max, the alternate iPhone 17 Pro runner stalled without a result, and the physical Pixel 6a was securely locked. The flow remains committed for replay; do not weaken its `emotion-star` assertion.

## Reproduction commands

```sh
pnpm install
pnpm verify
pnpm test:coverage
pnpm test:harness:ios -- --runInBand src/features/check-in/__tests__/feeling-pulse-visuals.harness.tsx
pnpm start:e2e
E2E_DEVICE=<dedicated-simulator-udid> E2E_PLATFORM=ios pnpm test:e2e -- --flow feeling-pulse-relief.yaml --passes 2
```

Run Metro in its own terminal before the final command. Use a dedicated, unlocked simulator whose Argent native-devtools service registers successfully.
