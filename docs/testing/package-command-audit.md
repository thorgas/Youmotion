# Package command audit — 7 October 2026

Every package script was checked for its executable, local entrypoint, aliases and EAS profiles. The table distinguishes execution from CLI/configuration validation. A prerequisite-bound command remains useful even when it cannot run on a fresh checkout without that prerequisite. No release, publishing, signing changes or personal-device installation occurred.

## Fixes

- QA OTA publication selects `preview`, matching the inherited QA build environment; production selects `production`. The installed EAS CLI requires an explicit environment for SDK 55+. Development already selected `development`. These commands still publish when deliberately executed.
- Jest disables Watchman centrally so Reassure uses the same policy as normal tests. Baseline, measurement and stability all pass. Keep baseline/current runs on comparable machines; exit zero alone does not prove stable performance.
- `verify:commands` runs inside `verify` and checks script files, aliases, EAS profiles, OTA environment flags, and documented command names.
- README uses pinned local EAS commands, documents Appduct and separates device setup from everyday checks. Legacy Argent flows remain available; they are not obsolete just because the new suite uses Appduct.

## Prerequisites and limits

Install the pinned pnpm dependencies first. Start commands are persistent servers; stop your own process with Ctrl-C. Tunnel requires Expo's tunnel support/network access. Native commands need Xcode/CocoaPods or an Android SDK plus a dedicated target and generated native projects. `clean` recreates native projects; the installed Expo parser still accepts `--clean`. `prepare:harness:ios` modifies local pods temporarily; follow BUILD.md before invoking it. Tracy preparation may fetch its pinned upstream sources.

Cloud account/build/update/submission commands require the correct Expo project, account and signing/store access, and may incur costs or publish externally. CLI/help and profile checks are not evidence of a completed cloud build or release. Runtime verification additionally needs the installed binary runtime inventory. Never use local test fingerprint overrides for publishing.

Capture commands require exact release artifacts and disposable devices. `verify:ios:archive` takes an IPA path. The screenshot-provenance gate currently reports 82 findings including missing entries, release-commit mismatches, fixture mismatches and pending visual approval. Retain this gate; resolve the release assets and approval rather than disabling it.

React Doctor executes but reports 11 errors and 65 warnings; these are diagnostic findings, not an obsolete command. It is not part of `verify`. Review its results before applying changes because some involve translator-aware UI/context conventions. Cali needs provider credentials and a built app for device roles. Performance scripts create ignored `.reassure` output. Watch scripts run until stopped.

Appduct discovery needs explicit `E2E_PLATFORM` and `E2E_DEVICE`, even when only listing tests. Full device execution and source-link proof are recorded in [the source-link handoff](../handoffs/github-source-links.md); native binaries were not rebuilt as part of this documentation/tooling audit. Website E2E is a local HTTP contract suite.

## All scripts

| Script | Check/result |
| --- | --- |
| `clean` | CLI/path validated; execution requires scoped native device/build/artifact |
| `start` | Executed successfully (server smoke stopped owned process) |
| `start:e2e` | Started successfully during source-link device validation in this chat; stopped afterward |
| `start:tunnel` | Expo CLI flag validated; tunnel/network setup not executed |
| `start:tools` | Executed successfully (server smoke stopped owned process) |
| `android` | CLI/path validated; execution requires scoped native device/build/artifact |
| `ios` | CLI/path validated; execution requires scoped native device/build/artifact |
| `install:release:android` | CLI/path validated; execution requires scoped native device/build/artifact |
| `install:release:ios` | CLI/path validated; execution requires scoped native device/build/artifact |
| `web` | Executed successfully (server smoke stopped owned process) |
| `cali:review` | Installed CLI flags validated; provider credentials required |
| `devtools:react` | Installed CLI help validated; persistent server not started |
| `devtools:inspector` | Installed CLI help validated; persistent server not started |
| `doctor:react` | CLI runs; diagnostic exit1: 11 fbtee raw-text findings, 65 warnings; needs review, not obsolete |
| `doctor:expo` | Transient latest CLI requires registry/network access; not executed |
| `eas:login` | Installed EAS help/profile validated; account/external operation not executed |
| `eas:whoami` | Installed EAS help/profile validated; account/external operation not executed |
| `eas:init` | Installed EAS help/profile validated; account/external operation not executed |
| `eas:open` | Installed EAS help/profile validated; account/external operation not executed |
| `eas:credentials:ios` | Installed EAS help/profile validated; account/external operation not executed |
| `eas:credentials:android` | Installed EAS help/profile validated; account/external operation not executed |
| `eas:builds` | Installed EAS help/profile validated; account/external operation not executed |
| `eas:update:configure` | Installed EAS help/profile validated; account/external operation not executed |
| `eas:update:development` | Installed EAS help/profile validated; account/external operation not executed |
| `eas:update:qa` | Installed EAS help/profile validated; account/external operation not executed |
| `eas:update:production` | Installed EAS help/profile validated; account/external operation not executed |
| `eas:update:runtimes` | Installed EAS help/profile validated; account/external operation not executed |
| `build:dev` | Installed EAS help/profile validated; account/external operation not executed |
| `build:dev:android` | Installed EAS help/profile validated; account/external operation not executed |
| `build:dev:ios` | Installed EAS help/profile validated; account/external operation not executed |
| `build:simulator:ios` | Installed EAS help/profile validated; account/external operation not executed |
| `build:preview` | Installed EAS help/profile validated; account/external operation not executed |
| `build:qa` | Installed EAS help/profile validated; account/external operation not executed |
| `build:qa:android` | Installed EAS help/profile validated; account/external operation not executed |
| `build:qa:ios` | Installed EAS help/profile validated; account/external operation not executed |
| `build:preview:android` | Installed EAS help/profile validated; account/external operation not executed |
| `build:preview:ios` | Installed EAS help/profile validated; account/external operation not executed |
| `build:testing` | Installed EAS help/profile validated; account/external operation not executed |
| `build:testing:android` | Installed EAS help/profile validated; account/external operation not executed |
| `build:testing:ios` | Installed EAS help/profile validated; account/external operation not executed |
| `build:testflight:qa-controls` | Installed EAS help/profile validated; account/external operation not executed |
| `build:testflight:production` | Installed EAS help/profile validated; account/external operation not executed |
| `build:production` | Installed EAS help/profile validated; account/external operation not executed |
| `build:production:android` | Installed EAS help/profile validated; account/external operation not executed |
| `build:production:ios` | Installed EAS help/profile validated; account/external operation not executed |
| `submit:testflight` | Installed EAS help/profile validated; account/external operation not executed |
| `submit:testflight:testing` | Installed EAS help/profile validated; account/external operation not executed |
| `submit:testflight:qa-controls` | Installed EAS help/profile validated; account/external operation not executed |
| `submit:play:internal` | Installed EAS help/profile validated; account/external operation not executed |
| `submit:play:testing` | Installed EAS help/profile validated; account/external operation not executed |
| `submit:play:production` | Installed EAS help/profile validated; account/external operation not executed |
| `release:testing` | Installed EAS help/profile validated; account/external operation not executed |
| `release:testflight:qa-controls` | Installed EAS help/profile validated; account/external operation not executed |
| `version:ios` | Installed EAS help/profile validated; account/external operation not executed |
| `version:android` | Installed EAS help/profile validated; account/external operation not executed |
| `version:android:set` | Installed EAS help/profile validated; account/external operation not executed |
| `verify:ios:archive` | CLI/path validated; execution requires scoped native device/build/artifact |
| `verify:store-screenshots` | Executed; correctly fails with 82 unapproved/mismatched/missing provenance findings |
| `generate:store-screenshot-fixture` | Local entrypoint validated; generates fixture assets, not executed |
| `capture:store-screenshots` | CLI/path validated; execution requires scoped native device/build/artifact |
| `test:store-screenshot-runner` | Executed successfully during this audit |
| `verify:website` | Executed successfully during this audit |
| `fingerprint:android` | Executed successfully during this audit |
| `fingerprint:ios` | Executed successfully during this audit |
| `i18n:all` | Executed successfully during this audit |
| `i18n:collect` | Executed successfully during this audit |
| `i18n:compile` | Executed successfully during this audit |
| `i18n:prepare` | Installed CLI/local path validated; generation not executed |
| `lint` | Executed successfully during this audit |
| `lint:architecture` | Executed successfully during this audit |
| `lint:oxlint` | Executed successfully during this audit |
| `lint:rules` | Executed successfully during this audit |
| `perf:baseline` | Executed successfully during this audit |
| `perf:measure` | Executed successfully during this audit |
| `perf:stability` | Executed successfully during this audit |
| `preios` | Installed CLI/local path validated; generation not executed |
| `prepare` | Executed successfully during this audit |
| `capture:responsive:android` | CLI/path validated; execution requires scoped native device/build/artifact |
| `capture:responsive:android:serve` | CLI/path validated; execution requires scoped native device/build/artifact |
| `tracy:android` | CLI/path validated; execution requires scoped native device/build/artifact |
| `typecheck` | Executed successfully during this audit |
| `typecheck:compat` | Executed successfully during this audit |
| `test` | Executed successfully during this audit |
| `test:watch` | Jest watch flag validated; indefinite watch not started |
| `test:coverage` | Executed successfully during this audit |
| `test:e2e` | CLI/path validated; execution requires scoped native device/build/artifact |
| `test:e2e:smoke` | CLI/path validated; execution requires scoped native device/build/artifact |
| `test:e2e:release:android:locale:de` | CLI/path validated; execution requires scoped native device/build/artifact |
| `test:e2e:release:android:locale:en` | CLI/path validated; execution requires scoped native device/build/artifact |
| `test:harness` | Installed Harness help succeeds; actual web/native tests not executed |
| `test:harness:android` | CLI/path validated; execution requires scoped native device/build/artifact |
| `test:harness:android:pixel` | CLI/path validated; execution requires scoped native device/build/artifact |
| `test:harness:ios` | CLI/path validated; execution requires scoped native device/build/artifact |
| `prepare:harness:ios` | CLI/path validated; execution requires scoped native device/build/artifact |
| `verify:commands` | Executed successfully during this audit |
| `verify` | Executed successfully during this audit |
| `test:e2e:appduct` | CLI/path validated; execution requires scoped native device/build/artifact |
| `test:e2e:appduct:list` | Executed successfully during this audit |
| `test:e2e:website` | Executed successfully during this audit |

| `release:check` | Read-only production source/config preflight; no cloud mutation |
| `release:status` | Readback of exact-source build jobs; never creates builds |
| `test:release-runner` | Injected EAS failures, reuse, identity and readback regression tests |

Production aliases now use the checked coordinator; production uploads require explicit --id and do not select --latest. Production build+auto-submit aliases removed. Wrapper proof:22 regression tests and real FINISHED build readbacks.
