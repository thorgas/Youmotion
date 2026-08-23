# Code architecture ESLint policy

Youmotion uses `eslint-plugin-code-architecture@0.4.0-alpha.4` as a blocking part of
`pnpm verify`. The effective configuration is in `eslint.config.mjs`, and its
repository contract is tested in
`oxlint-rules/__tests__/architecture-lint-contract.test.js`.

## Rule applicability

| Rule | Status | Youmotion policy |
| --- | --- | --- |
| `centralize-domain-literals` | Error | App routes, locales, and persisted table names must come from `src/constants.ts`. Tests and immutable legacy migrations are excluded. |
| `declarative-components` | Error | React state/effect hooks, multiple actor hooks, and component-local `try` statements are forbidden. Named event delegates remain allowed because the local Oxlint rule separately rejects inline JSX callbacks. |
| `effect-error-handling` | Error | Effect failures must remain explicit and typed. |
| `enforce-module-boundaries` | Error | Shared UI cannot import feature-owned code. |
| `imports-first` | Error | Static imports precede declarations and executable statements. |
| `max-function-lines` | Error | Production logic functions are capped at 70 physical lines. JSX-bearing functions are ignored so components are not extracted solely to satisfy a line count. Test callbacks and migration fixtures remain excluded. |
| `max-function-parameters` | Error | The plugin caps functions at five parameters. The local Oxlint rule keeps Youmotion's stricter one-object-parameter convention and its framework callback exceptions. |
| `no-barrel-files` | Error | Re-exports are forbidden; import concrete owners directly. |
| `no-barrel-imports` | Error | Local index imports and Effect package barrels are forbidden. |
| `no-design-identity-overrides` | Error | Consumers cannot replace the visual identity of `Button`, `ScreenHeading`, or `Dialog` through inline styles. Layout styles remain composable. |
| `no-raw-design-properties` | Error | Previously unknown literal colors are rejected in production UI even when they were not in the earlier value inventory. Tests are excluded. |
| `no-raw-design-values` | Error | Shared palette values are forbidden in object styles and JSX color props outside `src/theme.ts`. |
| `no-root-owned-compound-parts` | Error | Compound roots expose consumer-owned composition instead of rendering their own namespaced parts. |
| `no-unsafe-type-assertions` | Error | Runtime validation or narrowing replaces assertions and non-null escapes. |
| `no-unvalidated-json-parse` | Error | Parsed JSON flows directly into an approved schema decoder. |
| `prefer-composition-over-configuration` | Error | Structural component APIs use consumer composition instead of configuration props. |
| `prefer-design-system-components` | Error | Fully migrated data-safety confirmation actions cannot reintroduce React Native action primitives. Extend `consumers` only after another path has completely migrated. |
| `require-composable-root-children` | Error | Root/provider components expose children on every top-level return path. |
| `require-compound-component-api` | Error | Compound definitions expose a valid boundary and distinct public parts. |
| `require-consumer-owned-compound-usage` | Error | Compound consumers select the parts rendered beneath a boundary. |
| `require-dismissible-modal-backdrop` | Error | Every transparent native modal has request-close handling and a pressable outside-dismiss surface. |
| `require-interactive-component-contract` | Error | The shared Button root must keep role, state, disabled behavior, content, and press feedback. |
| `require-assertions` | Error | Production functions with at least three statements require two runtime assertions. XState actions, guards, transitions, and named React components remain covered. Alpha.4 excludes only JSX-attribute callbacks and zero-input function expressions assigned to variables; tests, Harness files, and test-support directories are excluded. Assertions must express real input, output, state, schema, or cardinality invariants rather than typed-shape or tautological filler. |

Reanimated UI-runtime callbacks use the local `assertWorkletInvariant` helper;
calling imported JavaScript assertion libraries from a worklet is forbidden because
it attempts a synchronous cross-runtime call. The ESLint contract recognizes both
that helper and the standard JavaScript-runtime assertion names.

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
```

`pnpm lint:architecture` must finish with zero warnings and zero errors. Do not
downgrade a rule to a warning to preserve a green build.

The contract suite feeds invalid examples to every architectural family,
including composition/LEGO, raw and unknown colors, identity overrides,
interactive contracts, platform-component regressions, modal dismissal, and
assertion density. This proves rules detect violations rather than merely
appearing in ESLint's printed configuration.
