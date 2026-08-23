# Code architecture ESLint policy

Youmotion uses `eslint-plugin-code-architecture@0.4.0-alpha.1` as a blocking part of
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
| `max-function-lines` | Error | Production functions are capped at 200 physical lines. Test callbacks and migration fixtures are excluded; their readability is enforced by Jest and Oxlint complexity rules instead. |
| `max-function-parameters` | Error | The plugin caps functions at five parameters. The local Oxlint rule keeps Youmotion's stricter one-object-parameter convention and its framework callback exceptions. |
| `no-barrel-files` | Error | Re-exports are forbidden; import concrete owners directly. |
| `no-barrel-imports` | Error | Local index imports and Effect package barrels are forbidden. |
| `no-raw-design-values` | Error | Shared palette values are forbidden in object styles and JSX color props outside `src/theme.ts`. |
| `no-root-owned-compound-parts` | Error | Compound roots expose consumer-owned composition instead of rendering their own namespaced parts. |
| `no-unsafe-type-assertions` | Error | Runtime validation or narrowing replaces assertions and non-null escapes. |
| `no-unvalidated-json-parse` | Error | Parsed JSON flows directly into an approved schema decoder. |
| `prefer-composition-over-configuration` | Error | Structural component APIs use consumer composition instead of configuration props. |
| `require-composable-root-children` | Error | Root/provider components expose children on every top-level return path. |
| `require-compound-component-api` | Error | Compound definitions expose a valid boundary and distinct public parts. |
| `require-consumer-owned-compound-usage` | Error | Compound consumers select the parts rendered beneath a boundary. |
| `require-assertions` | Not applicable | The TigerStyle preset requires two runtime assertions in every non-trivial function. That convention is not used in this React Native app and would add meaningless runtime checks to ordinary components and event delegates. |

## Design-system ownership

`src/theme.ts` is the single shared owner of the existing palette, typography,
and text-size tokens. Shared components and feature UI import it directly. The
lint rule currently protects the established color values and common React
Native, SVG, and JSX color properties. Emotion-specific chart colors remain
domain data rather than global UI tokens.

The current design-system migration is intentionally incremental. Typography,
spacing, and radius literals remain a documented baseline and should be moved
into the existing theme by semantic class rather than through a single
layout-changing rewrite.

Representative rendered evidence from the token-owner migration:

- [`theme-today.png`](screenshots/design-system/theme-today.png)
- [`theme-settings.png`](screenshots/design-system/theme-settings.png)
- [`theme-insights.png`](screenshots/design-system/theme-insights.png)

## Verification

```sh
pnpm lint:architecture
pnpm lint:rules
pnpm verify
```

`pnpm lint:architecture` must finish with zero warnings and zero errors. Do not
downgrade a rule to a warning to preserve a green build.

The contract suite also feeds one representative invalid component to each of
the five composition/LEGO rules. This proves the rules detect violations rather
than merely appearing in ESLint's printed configuration.
