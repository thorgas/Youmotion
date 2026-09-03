# Code architecture alpha.2 migration handoff

## Scope

Upgrade Youmotion from `eslint-plugin-code-architecture@0.4.0-alpha.4` to
`0.6.0-alpha.2`, enable every rule that truthfully applies, and resolve the
resulting findings without behavior changes or ceremonial assertions.

## Git state

- Branch: `codex/eslint-code-architecture-alpha2`
- Base: `2b648e107441fd255a1b3230be0c02b17ae3be08`
- Base remote: `origin/main`
- Unrelated untracked screenshots and the root JSON credential are explicitly
  out of scope and must not be staged, inspected, moved, or removed.

## Published package evidence

- Version: `0.6.0-alpha.2`
- Release commit: `af28525b929e4a480c536210bf615e9c1f2c12f4`
- Integrity:
  `sha512-ASINmhAvfK2B2DsP0+2aVucENclHRKZsQ0eNCdjB1lNnlmGuKBlkhEUXBzhG28WZFsi5q3KIIhE88xHiCwzZhg==`

## Initial alpha.2 audit

The prerelease exposes 37 rules. A practical full-source audit produced 833
raw findings across 92 files:

| Rule | Findings |
| --- | ---: |
| `require-contract-assertions` | 308 |
| `prefer-arrow-functions` | 311 |
| `named-imports` | 70 |
| `top-down-declarations` | 47 |
| `prefer-interface-over-type` | 17 |
| `prefer-readonly-types` | 12 |
| `no-implicit-external-dependencies` | 5 |
| `no-exported-instantiated-store` | 1 |
| `no-unasserted-return` | 62 |

All 57 distinct source lines reported by `no-unasserted-return` also appeared
under `require-contract-assertions`. Their configured scopes must therefore be
disjoint.

## Decisions

- Keep `require-assertions` as the broad existing density policy.
- Use contract and return assertion rules only in non-overlapping scopes.
- Assertions must prove real input, output, schema, state, or cardinality
  invariants.
- Keep `appSettingsStore` as the composition-owned singleton. Configure a
  narrow, regression-tested one-file exception; the exception must not spread.
- Do not introduce dependencies, UI concepts, data-model changes, or navigation
  state.
- If a refactor unexpectedly changes rendered UI, stop that slice for design
  review and attach screenshots to its commit.

## Required delivery gates

Every notable green slice is committed and pushed before the next slice. The
final branch is rebased onto current `origin/main`, then the complete matrix is
rerun:

```sh
CI=true pnpm install --frozen-lockfile
pnpm lint:architecture
pnpm lint:rules
pnpm verify
pnpm test:coverage
npx react-doctor@latest --verbose --scope changed
pnpm test:harness
pnpm test:e2e
git diff --check
```

Use a dedicated simulator or emulator for device work. Existing Argent flows
must be replayed, including modal dismissal coverage. Remove only task-created
artifacts; ask before removing `node_modules`.

## Next action

Alpha.2 is installed and every exported rule is now accounted for by the
repository contract. The new rules are active in truthful scopes. Contract and
return assertion policies are disjoint; algorithm-heavy domain files retain
the established assertion-density policy until the contract rule can
distinguish public boundaries from private helpers. The approved app-settings
singleton exception is limited to one file and regression-tested.

The migration also makes analytics collection contracts readonly, converts two
plain object aliases to readonly interfaces, and injects the reminder timestamp
into `activateReminder`. The navigation machine is explicitly a composition
root for time access.

Focused gates passed:

```sh
pnpm exec jest oxlint-rules/__tests__/architecture-lint-contract.test.js \
  src/features/reminders/__tests__/reminder-coordinator.test.ts \
  --runInBand --no-watchman
pnpm lint:architecture
pnpm exec tsc --noEmit
git diff --check
```

Repository gates passed after the configuration commit:

- `pnpm verify`: 46 suites and 312 tests passed, with Oxlint, ESLint, and
  TypeScript 7 green.
- `pnpm lint:rules`: 46 architecture-rule tests passed.
- `pnpm test:coverage`: 46 suites and 312 tests passed; 87.6% statements,
  76.58% branches, 83.25% functions, and 90.46% lines.
- `git diff --check`: passed.

The requested `spark_worker` could not run because its model usage allowance
was exhausted. The same commands were delegated to the cheapest available
worker (`gpt-5.6-luna`, low reasoning) and independently reported back.

Next: perform React Doctor, Harness, full Argent E2E, final rebase, and
clean-checkout verification.
