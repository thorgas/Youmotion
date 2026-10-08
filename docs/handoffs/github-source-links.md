# GitHub source links

Branch: `codex/github-source-links`, worktree `/private/tmp/youmotion-github-links`.
Base: `91ebd99` on the unpushed Appduct branch; the three Appduct/setup commits
are prerequisite context and are not silently integrated into main.

Adds localized Settings source links with actor-controlled browser failure,
retry and dismissal; canonical app URL, website/support/footer links, store
upload descriptions and matching documentation; repository/download metadata,
Youmotion launch drafts and an updated Awards draft. Update kit source links
already existed in npm and posts; its workspace/package READMEs now expose
explicit Source/Issues/npm links on a separate branch.

No database migration, new runtime dependency, or change to private support
or legal URLs. Browser test tools accept only an enumerated mode, record only
the canonical public URL in memory, and reject use outside explicit E2E
Debug builds. Native remains the default behavior. Existing Appduct startup
boundaries remain gated in production.

Both repositories remain private. These are staged launch changes: do not
deploy the site or upload/store-publish the descriptions until the intended
source URLs work signed out. No store/social/Awards submission, GitHub
visibility change, merge or remote push is part of this implementation.

Run `pnpm verify`, `pnpm test:coverage`, `pnpm test:e2e:website` and both-platform
Appduct source-link flows per `docs/testing/appduct-e2e.md`. Native evidence and
reports stay in ignored `artifacts/e2e-appduct/`; final review evidence is copied
to the calling chat's artifact folder and associated with the commit.


## Verification record

Source feature commit: `375746e2b72a2533f152e6c11bbea8549c8b1fc6`.
Update kit documentation commit: `c114138` in its isolated worktree.

- Full `pnpm verify`: 66 suites / 479 tests pass.
- Coverage: statements 88.73%, branches 79.76%, functions 84.19%, lines 91.61%; all thresholds pass.
- Website framework HTTP suite: 14/14. This proves served markup/link contracts,
  not deployed content or remote GitHub availability.
- iOS: all three source-link tests pass twice; a further run from the committed
  source passes 3/3. German recovery now explicitly scrolls both controls clear
  of the tab bar, with a separate passing run and inspected screenshot.
- Android: canonical-link flow passes twice; German recovery and real native
  browser launch/return each pass twice on a fresh disposable emulator. Scoped
  Metro forwarding after app restarts resolves the earlier connection failures.
  Recovery checks measure the action frames above the tab bar on both platforms.
  Chrome first-run UI is visible in the Android browser capture: this validates
  native handoff/return and the requested URL, not remote repository rendering.
- Update kit: 185 tests, release/package check, SDK54–56 typecheck matrix and
  formatting pass. Only documentation changed; no npm version bump/publication.

Review evidence: calling chat artifact folder `github-links-375746e/`, containing
native Settings/recovery/browser images, EN/DE website footer captures and
machine-readable framework reports. Routine captures stay outside tracked docs.
The iOS browser screenshot shows the native github.com sheet; a private source
repository's contents are not validated by that screenshot.

A small reusable Appduct setup helper replaces duplicated onboarding setup.
Existing E2E documentation records routed bootstrap links and platform-specific
session names; no separate retrospective skill was needed.

## README and package-command follow-up

All 101 Youmotion scripts are inventoried in `docs/testing/package-command-audit.md`. QA/production OTA commands now name the required EAS environment, and Reassure inherits Jest's no-Watchman policy. README uses pinned EAS commands and documents Appduct prerequisites. `verify:commands` prevents missing script files, aliases, profiles, documentation entries and OTA environments. Full verify (479 tests), coverage, website suite, 77 rule tests, fingerprints and all performance commands pass. Store screenshot provenance still reports 82 release-asset findings; React Doctor reports 11 errors/65 warnings. Native/cloud/release command execution is explicitly distinguished from CLI/config validation. No publication or native build occurred in this follow-up. Update-kit audit and docs commit: `9f7abdf`.
