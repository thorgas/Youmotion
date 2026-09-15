# Expo map

Youmotion keeps its visual navigation map under `.expo-map/`. The map combines the statically parsed Expo Router graph with iOS simulator screenshots and replayable Argent flows for runtime-only states.

## Review the latest map

1. Open [AppMap Visualiser](https://appmap-visualiser.vercel.app/).
2. Upload the newest dated `.expo-map/Youmotion-YYYY-MM-DD.appmap` file.
3. Inspect routes, screenshot variants, and recorded navigation flows in the visualiser.

For a quick local contact sheet, open `.expo-map/map.html` in a browser. The `.appmap` file is the preferred review artifact because one upload contains the graph, screenshots, and flow metadata.

## Refresh the map

Run the `expo-map` skill from the repository root. It performs the following workflow:

1. Parse `src/app/` into `.expo-map/graph.json`.
2. Launch the iOS development build and verify deep links.
3. Capture every route and meaningful runtime variant into `.expo-map/screens/`.
4. Record the real tap path for each reachable screen as paired `.yaml` and `.meta.json` files in `.expo-map/flows/`.
5. Replay every new or changed flow before accepting it.
6. Regenerate `.expo-map/map.html` and the dated `.appmap` bundle.

Runtime states that require hydrated local data must be populated by restoring the committed archive fixture at `src/features/data-safety/__tests__/fixtures/legacy-archive.fixture.json` through Settings → Restore from a backup. It holds 133 moments and 15 guiding beliefs, 12 suggested and 3 authored, with neutral text. Never capture the map from a personal backup: the screenshots and the `.appmap` bundle are committed and uploaded to a web visualiser. Keep the route capture even when a bare deep link cannot build the required XState context, and describe that limitation in `.expo-map/capture-status.json`.

## Replay a flow

With a compatible simulator and development build running, replay a saved flow from the repository root:

```bash
argent flow run .expo-map/flows/nav-combined-release.yaml --device YOUR_MAP_SIMULATOR_UDID
```

For Youmotion's committed iOS map, resolve and explicitly select the simulator named `Youmotion Expo Map` before launching or replaying a flow, and verify the bundle id is `com.youmotion.mobile`. Do not rely on model/runtime-based auto-selection because another project's simulator can share the same device model and iOS version.

A map refresh is complete only when the route count is reconciled, every new screenshot is visually inspected, changed flows replay successfully, and the resulting `.appmap` bundle contains the new screenshots and flow files.

The 2026-09-05 bundle refreshes the affected combined-PR screens. Unaffected captures retain their earlier provenance. `capture-status.json` identifies remaining bare-deep-link limitations. The combined flow uses Metro 8091, an onboarded English app, and the committed fixture staged in On My iPhone as `youmotion-combined-synthetic-archive.json`; keep it first in the Files grid. Remove the synthetic always-functioning reminder before replay because restoring journal data preserves reminder settings.

The 2026-09-15 bundle refreshes the guiding-belief capture with writing help expanded so the persistent vertical scroll indicator is visible. The indicator is shared by every vertical scrolling surface and occupies a non-interactive outer gutter; screens whose content fits continue to hide it.
