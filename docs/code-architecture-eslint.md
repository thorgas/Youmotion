# Code architecture ESLint policy

Youmotion uses `eslint-plugin-code-architecture@0.6.0-alpha.10` as a blocking part of
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
| `enforce-module-boundaries` | Error | Every production route, navigation module, shared component, and feature belongs to an explicit dependency graph. Belief domain types are a separate leaf module so reminders can consume them without granting access to belief UI or infrastructure. Tests and Harness files are excluded. |
| `imports-first` | Error | Static imports precede declarations and executable statements. |
| `max-function-lines` | Error | Production logic functions are capped at 70 physical lines. JSX-bearing functions are ignored so components are not extracted solely to satisfy a line count. Test callbacks and immutable migration fixtures remain excluded. |
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
| `no-unasserted-return` | Error | Application and navigation functions that return call results, directly or through a local binding, must prove that result. The receiver-specific `assignments.some`, `text.includes`, and `routeName.endsWith` entries are trusted method-name exceptions, not type evidence; other calls remain strict. Domain functions use the contract rule instead. |
| `no-unsafe-type-assertions` | Error | Runtime validation or narrowing replaces assertions and non-null escapes. |
| `no-unvalidated-json-parse` | Error | Parsed JSON flows directly into an approved schema decoder. |
| `prefer-composition-over-configuration` | Error | Structural component APIs use consumer composition instead of configuration props. |
| `prefer-design-system-components` | Error | Fully migrated data-safety confirmation actions cannot reintroduce React Native action primitives. Extend `consumers` only after another path has completely migrated. |
| `prefer-arrow-functions` | Error | Private functions in domain, application, navigation, and route adapters use arrows. Framework exports, generators, recursion, and hoisting remain structural exceptions; there is no file baseline. |
| `prefer-interface-over-type` | Error | Plain object contracts use interfaces; unions and type utilities remain aliases. |
| `prefer-readonly-types` | Error | Public collection contracts use `ReadonlyArray` and interface properties are readonly. Mutable implementation state remains permitted. |
| `require-composable-root-children` | Error | Root/provider components expose children on every top-level return path. |
| `require-compound-component-api` | Error | Compound definitions expose a valid boundary and distinct public parts. |
| `require-contract-assertions` | Error | Eligible domain functions with at least five statements enforce semantic parameter preconditions. Return checking is deliberately off because it currently reports nested predicate returns despite callback ignores; algorithm-heavy files retain the established density rule. |
| `require-consumer-owned-compound-usage` | Error | Compound consumers select the parts rendered beneath a boundary. |
| `require-dismissible-modal-backdrop` | Error | Every transparent native modal has request-close handling and a pressable outside-dismiss surface. |
| `require-interactive-component-contract` | Error | Bare structural detection protects shared and feature UI. `PressableScale` owns press feedback only; wrappers still expose role, state, disabled behavior, and content. `ButtonRoot` has an owner-file override because its pressable is nested beneath two providers, including both disabled and loading behavior. Other wrappers may delegate through `AppBackButton`, `Button.Root`, or `SettingsActionRow`. An explicit `disabled={false}` is intentional API documentation, not a suppression. |
| `sort-dependency-types` | Error | Future intersections of Evolu-style `*Dep` wrappers use deterministic ordering. |
| `top-down-declarations` | Error | Modules put public contracts above private details while preserving runtime dependencies. There is no file baseline. |
| `require-assertions` | Error | Production functions with at least three statements require two runtime assertions, including domain functions also governed by parameter contracts. XState actions, guards, transitions, named React components, and substantial worklets remain covered. Tests, Harness files, and test-support directories are excluded. Assertions must express real input, output, state, schema, or cardinality invariants rather than typed-shape or tautological filler. |

JavaScript-runtime invariants use the Hermes-safe assertion function in
`src/assert.ts`; no Node compatibility layer is required. Reanimated UI-runtime
callbacks use the local `assertWorkletInvariant` helper for worklet-local
invariants. Alpha.5 made that helper a recognized assertion name by default; it
did not exempt worklets. Importing a JavaScript-runtime assertion into a
worklet would attempt a synchronous cross-runtime call. The rules recognize `@/assert`,
`nodeAssert.ok`, and TypeScript `asserts` functions structurally. The former
repeated assertion-name lists are gone.

`require-contract-assertions` and `no-unasserted-return` never enforce the same
function. Domain files use the former; application and navigation files use the
latter. Existing algorithm-heavy domain modules remain on `require-assertions`
until the contract rule can distinguish public boundaries from private reducer
and sorting helpers. Broad assertion density stays enabled in both domain
scopes. Predicate helpers remain concise instead of asserting the tautological
result type of an equality expression.

## Remaining architecture exception

The arrow-function, declaration-order, interactive-contract, and application
return-assertion migration baselines are fully retired. Test and Harness code
remain deliberately more permissive and do not block production architecture.

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
