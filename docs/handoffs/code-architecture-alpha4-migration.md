# Code architecture alpha.4 migration handoff

## Scope

Upgrade Youmotion from `eslint-plugin-code-architecture@0.4.0-alpha.4` through
`0.6.0-alpha.4`, enable every rule that truthfully applies, and resolve the
resulting findings without behavior changes or ceremonial assertions.

## Git state

- Branch: `codex/eslint-code-architecture-alpha2`
- Base: `2b648e107441fd255a1b3230be0c02b17ae3be08`
- Base remote: `origin/main`
- Unrelated untracked screenshots and the root JSON credential are explicitly
  out of scope and must not be staged, inspected, moved, or removed.

## Published package evidence

- Version: `0.6.0-alpha.4`
- Release commit: `e0394c533dbf6a480771cb66c858f238e75eb7cf`

## Initial alpha audit

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
- Contract assertions prove parameter preconditions on eligible domain
  functions with at least five statements. Return checking remains off until
  the rule can ignore nested predicate returns consistently.
- Keep shared XState stores, but export only factories from feature modules.
  `src/app-stores.ts` is their regression-tested composition root.
- Declare the four `@/app-stores` exports as service locators so domain,
  application, and navigation code cannot import the live stores.
- Use all seven built-in implicit dependency groups. Do not configure a custom
  `Date.now` capability because alpha.4 now provides the general policy.
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

The follow-up ownership audit removed the broad one-module `features` blind
spot. Production code is now checked as explicit `analytics`, `beliefs`,
`check-in`, `data-safety`, `feedback`, `history`, `onboarding`, `reminders`,
`settings`, and `startup` modules, with app routes and navigation declared as
composition roots. Belief domain types form a leaf boundary so consumers do
not gain access to belief persistence or UI by default. A contract test proves
both a forbidden feature edge and an intended analytics-to-check-in edge.

Cherry-pickable ownership slices pushed so far:

- `f6b00e9` moves the shared database runtime/migrations and app locale out of
  feature ownership.
- `8d47df8` extracts the shared beliefs vertical and its owned tests.
- `93478d4` extracts History state, filtering, screen, Harness tests, and visual
  baseline from check-in.

`EmotionLabelMode` is also app-wide presentation vocabulary and now lives in
`src/preferences/emotion-label-mode.ts`; check-in no longer depends on Settings
for that type. Settings remains an intentional grouped mobile composition
surface for Feedback, Data Safety, and belief/reminder entry points. That
existing UI concept matches the mobile Settings design checklist, so no slot
API or rendered layout change was introduced solely for lint.

Alpha.4 is installed and every exported rule is now accounted for by the
repository contract. The new rules are active in truthful scopes. Contract and
return assertion policies are disjoint; the contract rule checks parameter
preconditions only, and algorithm-heavy domain files retain the established
assertion-density policy until the contract rule can distinguish public
boundaries from private helpers. The approved app-settings
singleton exception was removed: all four live stores now come from the tested
composition root, while feature modules export factories.

The interactive-component rule now uses bare structural detection for adopted
shared UI. A repository-wide audit records 16 existing primitives as the
migration baseline; `AppBackButton` and `SettingsActionRow` are the two explicit
shared-UI exceptions. The arrow and declaration-order allowlists remain
load-bearing at 41 findings across ten files and three findings across three
files. Remove exemptions file by file only after the relevant mechanical
conversion and tests. The navigation machine remains a temporary composition
root for time and randomness; its broad exemption must not be treated as the
desired long-term dependency boundary.

Alpha.4 structurally recognizes the repository assertion helpers, so
`require-contract-assertions` and `no-unasserted-return` no longer duplicate an
`assertionNames` list. The named-import exceptions use source globs for Expo,
Effect, infrastructure modules, and assets plus the six irreducible exact
seams. The domain `require-assertions` override appears once after the broad
density policy, preserving flat-config precedence without a duplicate block.

The migration also makes analytics collection contracts readonly, converts two
plain object aliases to readonly interfaces, and injects reminder timestamps
and ID randomness into the coordinator. The navigation machine is explicitly a
composition root for ambient time and randomness.

## Final evidence

The final branch was already based on current `origin/main`, so the requested
rebase was a no-op. The installed package was read directly from
`node_modules/eslint-plugin-code-architecture/package.json` and is
`0.6.0-alpha.4`.

Repository gates passed on the delivered tree:

- `pnpm lint:architecture`: passed.
- `pnpm lint:rules`: 2 suites and 49 tests passed.
- `pnpm verify`: 46 suites and 315 tests passed, with Oxlint, ESLint, and
  TypeScript 7 green.
- `pnpm test:coverage`: 46 suites and 315 tests passed; 87.30% statements,
  76.52% branches, 82.85% functions, and 90.19% lines.
- React Doctor changed-file scope: 76/100 with no actionable findings.
- `git diff --check`: passed.

The complete 11-flow Argent E2E inventory passed twice on dedicated iOS
simulator `9D5C1782-C1C3-458B-9416-6311D03AD1B9`, using Metro port 8091 and a
fresh native development build. Every pass reported zero failures and zero
errors. This includes backdrop dismissal for the feedback dialog, reminder
time modal, and reflection time modal. The longest flow creates only fixed
synthetic records and removes them before completion.

The requested `spark_worker` was unavailable because its model allowance was
exhausted. The bounded Harness command was therefore delegated to the cheapest
available worker (`gpt-5.6-luna`, low reasoning), as required by `AGENTS.md`.
That generic run did not connect to its Metro bundle, so the primary agent
reran the explicit iOS command `pnpm test:harness:ios`. All 19 suites executed:
4 suites/4 tests passed and 15 suites/17 tests failed. The failures reproduce
the existing Harness backlog: the test binary lacks `uniffiEnsureInitialized`,
several component fixtures do not expose expected native query IDs, and the
feedback fixture lacks `FeedbackProvider`. The migration's full Jest and E2E
gates remain green; this PR does not conceal the independent Harness debt.

## UI evidence

The ownership moves changed component paths and imports but intentionally did
not change layout or behavior. Fresh simulator screenshots document the
unchanged surfaces with synthetic data:

- `8d47df8`: [Belief Library](../../artifacts/code-architecture-alpha4/belief-library.png)
- `93478d4`: [History](../../artifacts/code-architecture-alpha4/history.png)
- `a3ee73d`: [Settings composition](../../artifacts/code-architecture-alpha4/settings.png)

No new UI concept, library, persisted-data shape, or navigation state was
introduced.
