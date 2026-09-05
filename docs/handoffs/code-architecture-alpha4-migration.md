# Code architecture alpha.10 migration handoff

## Delivered state

- Youmotion branch: `codex/eslint-code-architecture-alpha2`; draft PR #26.
- Installed package: `eslint-plugin-code-architecture@0.6.0-alpha.10`.
- Plugin branch: `codex/worklet-assertion-default`; draft PR #11.
- Plugin releases: alpha.5 at `1919e76` made `assertWorkletInvariant` a
  recognized helper rather than a worklet exemption; alpha.6 at
  `6bc278881ccb34279e2d46db351193fb0b55d630` added safe compound-component
  contract delegation. Alpha.7 at `381de391612c2577a1e79bbd396ca937478c8016`
  closes awaited-return, property-mutation, local-binding, and interaction-path
  gaps. Alpha.8 at `1f818cee83389a1754bc215bf9abeeb62d10acd8`
  models feedback-owning primitives and conditional noninteractive paths.
  Alpha.9 at `ae264b0730e0e131f260d2a55e087196fe10d0a5` adds narrow
  return-call patterns. Alpha.10 at `496669c8f63320fcafdd5b8ba6aa81e7d4249bac`
  checks every alternative local-return call, shares mutation invalidation, and
  makes unknown JSX spreads conservative and order-aware. All release workflows
  passed, and npm's `alpha` dist-tag resolves to `0.6.0-alpha.10`.
- The branch was rebased onto `origin/main`; the rebase was a no-op.
- Alpha.10 consumer migration: `65f9a57`.

The migration enables every exported architecture rule in a truthful production
scope. Tests, Harness fixtures, and immutable migrations remain deliberately
more permissive where production constraints would only add noise.

## Policy decisions

- `require-assertions` is the broad production density policy. Alpha.4's
  structural assertion detection removed both repeated `assertionNames` lists.
- Domain contract assertions and application/navigation return assertions have
  disjoint scopes. Domain contracts currently enforce parameter preconditions
  for functions with at least five statements; `checkReturns` remains off.
  Broad `require-assertions` density stays enabled alongside that policy.
- Assertions must prove real runtime assumptions. Tautological boolean checks
  on equality predicates were removed; those helpers now return their predicate
  directly while retaining meaningful input and state invariants.
- Explicit `disabled={false}` declarations are intentional interaction API
  contracts. They make state handling visible to humans and agents and prevent
  new primitives from omitting disabled UX.
- Shared and feature UI use bare interactive detection. `ButtonRoot` is pinned
  to its owner file because two context providers wrap its pressable. Alpha.6's
  `contractComponents` option recognizes `AppBackButton`, `Button.Root`, and
  `SettingsActionRow` as contract-owning primitives while still requiring a
  wrapper to accept and forward disabled state and configurable content.
- `PressableScale` is trusted only for the feedback part of that contract.
  Three plain pressables that lacked feedback now use the established primitive.
- `no-unasserted-return` trusts only the receiver-specific method names
  `assignments.some`, `text.includes`, and `routeName.endsWith`. These are
  naming exceptions rather than type evidence; all other returned calls remain strict.
- The named-import policy uses globs for Expo, Effect subpaths, infrastructure,
  PNG, and JSON imports plus the irreducible exact package seams.
- `src/app-stores.ts` is the tested composition root. Its four live stores are
  declared service locators so application/domain code cannot begin importing
  them.
- No new library, UI concept, navigation state, persistence shape, or data model
  was introduced.

## Baselines retired

- All 41 arrow-function findings were converted, including helpers in the
  navigation state machine.
- All three declaration-order exemptions were removed.
- All 16 interactive primitives now expose or delegate the required contract.
- The application return-assertion file exemptions were removed and replaced by
  meaningful result invariants.
- The duplicate domain `require-assertions: off` block was removed.

The remaining broad exception is
`src/navigation/app-navigation.machine.ts`, currently a 3,269-line composition
root for ambient time and randomness. This is transitional, not intentional
architecture. Remove it only after time/random factories move to a smaller
composition module and are injected into the machine boundary.

## Cherry-pickable commits

The ownership extraction and initial migration are followed by these pushed
cleanup slices:

- `355e9b7`, `c31f6b0`: declaration order and function length.
- `9a80860`, `d26d0c1`, `23514d9`, `efe5066`: arrow conversions.
- `76368bb`: alpha.5 package and worklet policy.
- `f93f5d4`, `5e8324a`, `c644e4c`, `fc0dd1a`, `1942d1c`, `516d9b8`,
  `e192e3a`, `fb09cbe`, `6d4e9d4`: explicit interaction contracts.
- `0648fb1`: application return invariants.
- `021c58b`: alpha.6 and baseline-free shared/feature UI enforcement.
- `82f51a3`: clean-device E2E isolation and selector hardening.
- Alpha.7 follow-up: real-structure button protection, restored domain density,
  concise predicates, and a linear deletion postcondition.

## Verification

Run from the repository root:

```sh
CI=true pnpm install --frozen-lockfile
pnpm verify
pnpm lint:rules
pnpm test:coverage
E2E_DEVICE=<dedicated-simulator-udid> E2E_PLATFORM=ios E2E_PASSES=2 pnpm test:e2e
pnpm test:harness:ios
pnpm doctor:react
git diff --check
```

Confirmed on the delivered production tree:

- Frozen install passed with pnpm 11.18.0.
- `pnpm verify`: 47 suites and 324 tests passed; Oxlint, ESLint,
  architecture lint, TypeScript 7, and Jest were green.
- `pnpm lint:rules`: 2 suites and 55 adversarial contract tests passed.
- `pnpm test:coverage`: 47 suites and 324 tests passed; 87.45% statements,
  76.28% branches, 82.85% functions, and 90.33% lines.
- The installed package was read from `node_modules` and confirmed as alpha.10.

Device E2E uses dedicated simulator
`9D5C1782-C1C3-458B-9416-6311D03AD1B9`, Metro port 8091, and the committed
synthetic flows. All 11 flows passed twice with zero failures and zero errors.
The suite includes outside-tap dismissal for feedback, reminder-time, and
reflection-time modals.

Those device results predate `65f9a57`. Post-alpha.10 device replay and fresh
screenshots remain pending because this Codex session exposes the Argent CLI
but not the required Argent MCP device controls. The production change only
replaces three plain `Pressable` roots with the already-used `PressableScale`
feedback primitive; resting visuals are intended to remain unchanged.

Clean-device replay hardened the permanent flows: tab taps avoid the movable
Expo dev-tools control, first-run notification prompts receive an explicit
settling window, the owned-belief removal is scoped to its synthetic core
belief, and analytics verification no longer relies on preloaded history.

The requested `spark_worker` was unavailable because its allowance was
exhausted, so bounded install, verification, coverage, and device commands were
delegated to the cheapest available worker (`gpt-5.6-luna`, low reasoning).

`pnpm test:harness:ios` executed all 19 suites: 4 suites/4 tests passed and 15
suites/17 tests failed. The failures reproduce the existing native Harness
backlog: missing `uniffiEnsureInitialized`, fixtures without expected native
query IDs/labels, and the feedback fixture without `FeedbackProvider`.

Changed-scope React Doctor reports five `rn-no-raw-text` errors for existing
`<fbt>` nodes returned by `reminderStatusLabel` and `reminderContentLabel`, even
though both helper results are rendered inside React Native `<Text>` at the
call sites. This is a static-analysis false positive exposed by the file move,
not raw text at runtime. It also reports one advisory performance warning and
no security finding. No suppression was added.

## UI evidence

The interaction changes intentionally preserve enabled/default rendering while
making disabled behavior explicit. Fresh screenshots use an empty synthetic
simulator; the visible gear is the development-client tool, not app UI.

- `f93f5d4`, `516d9b8`, `fc0dd1a`, `1942d1c`, `6d4e9d4`:
  [Settings and feedback entry](../../artifacts/code-architecture-alpha6/settings.png)
- `5e8324a`: [Analytics](../../artifacts/code-architecture-alpha6/analytics.png)
- `c644e4c`: [History](../../artifacts/code-architecture-alpha6/history.png)
- `e192e3a`, `fb09cbe`, `6d4e9d4`:
  [Belief Library](../../artifacts/code-architecture-alpha4/belief-library.png)
- `1942d1c`, `6d4e9d4`:
  [Feedback dialog](../screenshots/design-system/dismissible-feedback-dialog.png)

Unrelated pre-existing screenshot directories and the root JSON credential are
out of scope and must not be staged, inspected, moved, or removed. Remove only
artifacts created by this task, and ask before deleting `node_modules`.
