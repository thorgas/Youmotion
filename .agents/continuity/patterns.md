# Continuity Patterns

This file records source-of-truth examples and continuity rules for this repo.

## Active Patterns

### Pattern: actor-owned-global-ui-flow

- **Status:** active
- **Scope:** `src/features/*/application/*.machine.ts`, `src/features/*/ui/*.tsx`, `src/app/_layout.tsx`
- **Enforcement:** changed-files
- **Default check:** changed-files
- **Source of truth:**
  - `src/features/startup/application/animated-splash.machine.ts` - models a root-level UI flow and runtime work as an XState machine.
  - `src/features/startup/ui/animated-splash-screen.tsx` - renders a root-level overlay from one actor snapshot without component state or effects.
  - `src/app/_layout.tsx` - composes global UI providers and overlays around the app navigator.
- **Applies to:**
  - `src/features/*/application/*.machine.ts`
  - `src/features/*/ui/*.tsx`
  - `src/app/_layout.tsx`
- **Do not apply to:**
  - `src/app/(tabs)/_layout.tsx` - tab presses project into the existing root navigation actor and do not own a separate flow.
- **Rule summary:** Root-level UI flows belong in a feature-local XState machine. The UI component owns its events, reads one actor snapshot, and is composed once at the root without creating navigation state.
- **Required shape:**
  - Put durable flow state and transitions in an application machine.
  - Render the overlay from one `useMachine` actor hook in the feature UI component.
  - Keep runtime adapters behind the application or infrastructure boundary; UI must not import infrastructure.
  - Compose the global feature once in `src/app/_layout.tsx` without adding routes or navigation state.
- **Allowed variations:**
  - Pure presentation components may receive narrow callbacks from the actor-owning component.
- **Severity:**
  - high: UI imports infrastructure or introduces a second navigation state.
  - medium: local component state or effects duplicate machine state.
  - low: a presentation helper can be made more leaf-local.
- **Baseline exceptions:**
  - None.
- **Violation signals:**
  - `src/features/*/ui/*` imports `../infrastructure`.
  - Root-level flow UI uses `useState` or `useEffect`.
- **CI behavior:** Fail when a changed file contains a high- or medium-severity violation.
- **Fix strategy:** Move flow state into a feature-local machine, keep runtime work behind application/infrastructure, and derive the overlay from a single actor snapshot.
- **Open questions:**
  - None.
