# Code architecture ESLint policy

Youmotion uses `eslint-plugin-code-architecture@0.6.0-alpha.4` as a blocking part of
`pnpm verify`. The effective configuration is in `eslint.config.mjs`, and its
repository contract is tested in
`oxlint-rules/__tests__/architecture-lint-contract.test.js`.

## Rule applicability

| Rule | Status | Youmotion policy |
| --- | --- | --- |
| `centralize-domain-literals` | Error | App routes, locales, and persisted table names must come from `src/constants.ts`. Tests and immutable legacy migrations are excluded. |
| `dependency-parameter-convention` | Error | Future Evolu-style `*Dep` functions must accept their dependency object through the conventional parameter shape. |
| `dependency-wrapper-shape` | Error | Future `*Dep` wrappers must use the supported wrapper shape. |
| `declarative-components` | Error | React state/effect hooks, multiple actor hooks, and component-local `try` statements are forbidden. Named event delegates remain allowed because the local Oxlint rule separately rejects inline JSX callbacks. |
| `effect-error-handling` | Error | Effect failures must remain explicit and typed. |
| `enforce-module-boundaries` | Error | Shared UI cannot import feature-owned code. |
| `imports-first` | Error | Static imports precede declarations and executable statements. |
| `max-function-lines` | Error | Production logic functions are capped at 70 physical lines. JSX-bearing functions are ignored so components are not extracted solely to satisfy a line count. Test callbacks, migration fixtures, and the declarative history-store factory definition remain excluded. |
| `max-function-parameters` | Error | The plugin caps functions at five parameters. The local Oxlint rule keeps Youmotion's stricter one-object-parameter convention and its framework callback exceptions. |
| `named-imports` | Error | Named imports are preferred. Compact source globs preserve APIs that intentionally expose defaults or namespaces: Expo, Effect subpaths, infrastructure modules, JSON/PNG assets, and six exact local/package seams. Relative infrastructure imports are covered at every feature depth. |
| `no-barrel-files` | Error | Re-exports are forbidden; import concrete owners directly. |
| `no-barrel-imports` | Error | Local index imports and Effect package barrels are forbidden. |
| `no-design-identity-overrides` | Error | Consumers cannot replace the visual identity of `Button`, `ScreenHeading`, or `Dialog` through inline styles. Layout styles remain composable. |
| `no-exported-dependency-instances` | Error | Feature modules export store factories. `src/app-stores.ts` is the tested composition root that owns the four shared live store instances. |
| `no-implicit-external-dependencies` | Error | All built-in groups are active: time, randomness, logging, environment, network, storage, and locale. Application and domain logic receive capabilities explicitly; infrastructure and composition roots own ambient access. The four exports from `@/app-stores` are declared service locators and therefore remain production-UI-only. |
| `no-namespace-exports` | Error | Production modules export descriptive members. Test mocks and compatibility Harness shims are excluded. |
| `no-over-depending` | Error | Future Evolu-style dependency objects may expose only dependencies actually used by their function. |
| `no-raw-design-properties` | Error | Previously unknown literal colors are rejected in production UI even when they were not in the earlier value inventory. Tests are excluded. |
| `no-raw-design-values` | Error | Shared palette values are forbidden in object styles and JSX color props outside `src/theme.ts`. |
| `no-root-owned-compound-parts` | Error | Compound roots expose consumer-owned composition instead of rendering their own namespaced parts. |
| `no-unasserted-return` | Error | Application and navigation functions that directly return delegated calls must prove their result. Domain functions use the contract rule instead. |
| `no-unsafe-type-assertions` | Error | Runtime validation or narrowing replaces assertions and non-null escapes. |
| `no-unvalidated-json-parse` | Error | Parsed JSON flows directly into an approved schema decoder. |
| `prefer-composition-over-configuration` | Error | Structural component APIs use consumer composition instead of configuration props. |
| `prefer-design-system-components` | Error | Fully migrated data-safety confirmation actions cannot reintroduce React Native action primitives. Extend `consumers` only after another path has completely migrated. |
| `prefer-arrow-functions` | Error | New private functions in domain, application, and navigation use arrows. Framework exports, generators, recursion, and hoisting are allowed. Ten baseline files still contain 41 findings; remove each file exemption only after every reported declaration in that file has been converted and its tests pass. |
| `prefer-interface-over-type` | Error | Plain object contracts use interfaces; unions and type utilities remain aliases. |
| `prefer-readonly-types` | Error | Public collection contracts use `ReadonlyArray` and interface properties are readonly. Mutable implementation state remains permitted. |
| `require-composable-root-children` | Error | Root/provider components expose children on every top-level return path. |
| `require-compound-component-api` | Error | Compound definitions expose a valid boundary and distinct public parts. |
| `require-contract-assertions` | Error | Eligible domain functions with at least five statements enforce semantic parameter preconditions. Return checking is deliberately off because it currently reports nested predicate returns despite callback ignores; algorithm-heavy files retain the established density rule. |
| `require-consumer-owned-compound-usage` | Error | Compound consumers select the parts rendered beneath a boundary. |
| `require-dismissible-modal-backdrop` | Error | Every transparent native modal has request-close handling and a pressable outside-dismiss surface. |
| `require-interactive-component-contract` | Error | Bare structural detection protects adopted primitives under `src/components/ui/**`. `AppBackButton` and `SettingsActionRow` remain explicit baseline exceptions; the broader feature scan is recorded below. |
| `sort-dependency-types` | Error | Future intersections of Evolu-style `*Dep` wrappers use deterministic ordering. |
| `top-down-declarations` | Error | New modules put public contracts above private details while preserving runtime dependencies. Three algorithm modules remain baseline exceptions; remove an exemption only after its reported declaration ordering is corrected without breaking runtime initialization. |
| `require-assertions` | Error | Production functions with at least three statements require two runtime assertions. XState actions, guards, transitions, and named React components remain covered. Alpha.4 excludes only JSX-attribute callbacks and zero-input function expressions assigned to variables; tests, Harness files, and test-support directories are excluded. Assertions must express real input, output, state, schema, or cardinality invariants rather than typed-shape or tautological filler. |

JavaScript-runtime invariants use the Hermes-safe assertion function in
`src/assert.ts`; no Node compatibility layer is required. Reanimated UI-runtime
callbacks use the local `assertWorkletInvariant` helper because importing a
JavaScript-runtime function into a worklet would attempt a synchronous
cross-runtime call. Alpha.4 recognizes these local helpers, `@/assert`, and
`nodeAssert.ok` structurally; the contract and return rules do not repeat an
`assertionNames` list.

`require-contract-assertions` and `no-unasserted-return` never enforce the same
function. Domain files use the former; application and navigation files use the
latter. Existing algorithm-heavy domain modules remain on `require-assertions`
until the contract rule can distinguish public boundaries from private reducer
and sorting helpers. This avoids the duplicate diagnostics and ceremonial
assertions found by the initial alpha audit.

## Recorded baselines

A repository-wide bare interactive-contract audit reports 16 existing
primitives: `AppBackButton`, `SettingsActionRow`, `InsightTab`,
`TimeframeOption`, `EmotionFilterChip`, `ContentFilterChip`, `MomentRow`,
`PersonalBeliefCreateButton`, `BeliefSystemOption`, `BeliefSystemSuggestion`,
`DataSafetyMessage`, `FeedbackAction`, `FeedbackSettingsAction`, `ActionButton`,
`LibraryBackButton`, and `PreferenceOption`. This PR enforces the bare rule for
adopted shared UI while retaining the first two as explicit shared-UI
exceptions. Retire each exception only with its accessibility/disabled/content
contract, focused tests, design review, and screenshots; move feature
primitives into the enforced scope as they adopt the same contract.

Removing `allowedFiles` currently exposes 41 arrow-function findings across
the ten configured files and three declaration-order findings across the three
configured algorithm files. These are migration baselines, not permanent
design allowances.

`src/navigation/app-navigation.machine.ts` remains a composition root for time
and randomness, so its current 3,269-line machine is exempt from ambient
dependency reporting. This is a transitional placement, not the intended
long-term boundary; move those factories to a smaller composition module before
removing the exemption.

## Design-system ownership

`src/theme.ts` is the single shared owner of palette, semantic surface, border,
overlay, interaction, chart, navigation, typography, and text-size tokens.
Feature UI imports these identities instead of inventing local color literals.
Emotion-specific colors remain domain data because they carry meaning rather
than general UI identity.

Reusable UI lives in `src/components/ui` and uses direct imports rather than a
barrel. The current base contracts are:

- `Button.Root` and `Button.Text`: primary, secondary, destructive, and ghost
  actions with compact, regular, and large sizes plus disabled/loading states.
- `ScreenHeading.Root`, `ScreenHeading.EyebrowText`, and `ScreenHeading.TitleText`: the
  shared primary-screen heading used by Today, History, Insights, and Settings.
- `Dialog.Root` and `Dialog.Content`: transparent modal presentation with an
  owned backdrop that always dispatches the same close event as the system
  request-close path.
- `ConfirmedPickerModal`, `AppBackButton`, and `SettingsActionRow`: established
  shared application patterns built directly on the base theme or primitives.

Do not add a generic component merely to make this folder larger. Extract a
primitive when at least two consumers share behavior and identity. Layout stays
consumer-owned; identity becomes a named variant. Typography, spacing, and
radius literals that have not converged remain visible until a truthful shared
contract exists.

Representative rendered evidence from the token-owner migration:

- [`theme-today.png`](screenshots/design-system/theme-today.png)
- [`theme-settings.png`](screenshots/design-system/theme-settings.png)
- [`theme-insights.png`](screenshots/design-system/theme-insights.png)
- [`shared-button-reminder-actions.png`](screenshots/design-system/shared-button-reminder-actions.png)
- [`shared-button-data-safety-confirmation.png`](screenshots/design-system/shared-button-data-safety-confirmation.png)
- [`shared-screen-heading-insights.png`](screenshots/design-system/shared-screen-heading-insights.png)
- [`shared-dialog-reflection-time.png`](screenshots/design-system/shared-dialog-reflection-time.png)
- [`dismissible-feedback-dialog.png`](screenshots/design-system/dismissible-feedback-dialog.png)

## Verification

```sh
pnpm lint:architecture
pnpm lint:rules
pnpm verify
pnpm test:coverage
```

`pnpm lint:architecture` must finish with zero warnings and zero errors. Do not
downgrade a rule to a warning to preserve a green build.

The contract suite feeds invalid examples to every architectural family,
including composition/LEGO, raw and unknown colors, identity overrides,
interactive contracts, platform-component regressions, modal dismissal, and
assertion density. This proves rules detect violations rather than merely
appearing in ESLint's printed configuration.
