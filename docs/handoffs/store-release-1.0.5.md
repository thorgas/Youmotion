# Store release 1.0.5 — 2 October 2026

## Integration

Feature branch `codex/einblick-notifications` was rebased onto fresh `origin/main`. Main was already its ancestor; range-diff confirmed all 13 commits unchanged. Main advanced by fast-forward, without a merge commit. Unrelated local settings/hooks were preserved in the original checkout.

Release source: `801e7b66d195cef85e03ad1e76224d8d1cee4513`. Version and bilingual feature notes are committed in `app.json`, `store.config.json`, and `store/releases/1.0.5-notes.json`.

## Validation

Clean-checkout `pnpm verify`: passed, 60 suites / 450 tests. Coverage passed: statements 88.52%, branches 79.64%, functions 83.80%, lines 91.41%. Initial translation-generation race was resolved by finishing generation and rerunning all gates.

## Store records

Apple version: `2d487ef1-db95-4f40-95a9-c236f1826244`, 1.0.5, manual release. Both English and German What's New fields were saved and read back. Existing listing fields copied from live 1.0.4. Readiness currently blocks only on the new build attachment; existing keyword and copyright warnings remain.

Production builds:
- Android 17: https://expo.dev/accounts/youmotion/projects/youmotion/builds/3266dfba-96ac-44d3-ab0a-d578f8bee655
- iOS 21: https://expo.dev/accounts/youmotion/projects/youmotion/builds/edafef3e-aa43-48d7-83c4-5c560535329f

Both report version 1.0.5 and the exact release source above. Android uses the configured production draft lane. Apple uses manual release; uploading a build is distinct from review submission and public availability.

## Native and artifact follow-up

Corrected three unsupported Harness text matchers to native accessibility-label queries. The corrected test passed on iOS: 2/2, German and English, with empty and scheduled labels checked at the consumer boundary. Focused lint and full TypeScript 7 passed. Sixteen synthetic iOS screenshots: `artifacts/screenshots/insight-notifications/store-1.0.5/ios` in the original checkout. Android executed zero assertions after bounded startup recovery; installed dev client did not request the Metro bundle. This is an unresolved acceptance gap, not a consumer assertion failure.

iOS production IPA passed `scripts/verify-ios-store-archive.sh`; Info.plist confirms `com.youmotion.mobile`, version `1.0.5`, build `21`. EAS upload job: https://expo.dev/accounts/youmotion/projects/youmotion/submissions/7f73ad19-6805-4341-b76a-19d859f2dc37 . It finished successfully. Apple build `b9af2f80-6eff-437f-8f05-cd23dcb8449e` reports VALID and is attached to version `2d487ef1-db95-4f40-95a9-c236f1826244`. Confirmed staging passed with zero blocking errors, three inherited metadata warnings. Version remains PREPARE_FOR_SUBMISSION, release type MANUAL. English/German feature notes were preserved through staging.

## Google Play completion

Android build 17 finished from the exact source SHA. The local gplay service account uploaded and staged the bundle/notes but validation and commit returned 403. Commit with `changes-not-sent-for-review` returned 400 requiring automatic review. No direct CLI commit succeeded.

The existing managed EAS production profile succeeded: submission `ed8c8661-77eb-471c-8117-8e479473fe0f`, FINISHED. Console and fresh API readback show production draft 1.0.5 / 17 alongside completed live 1.0.4 / 16. The managed upload did not include release notes. Both committed notes were entered in Console and **Save as draft** confirmed **Changes saved** and **2 of 2 languages**. A subsequent API readback matched both texts exactly. Task-owned inspection edits were discarded.

Proof: `/tmp/youmotion-1.0.5-play-draft.jpg`. Console release: https://play.google.com/console/u/0/developers/7928512905996440350/app/4975326910658743231/tracks/4697468359004114029/releases/3/prepare . Neither platform was submitted for final app review or public rollout by this task.

Final `pnpm verify` after the test correction passed all gates and 60 suites / 450 tests. Source code in both binaries remains `801e7b6`; later commits contain only test corrections and documentation.

## Repeatable next steps

Use `docs/release/store-release-workflow.md` for future releases; it documents the verified managed upload route and localized draft notes, linked from the upload runbook and AGENTS.md. Release notes source: `store/releases/1.0.5-notes.json`.

No user-only blocker remains for integration and draft creation. Before public release, Android native acceptance remains outstanding; final review/public rollout is a separate step with the repository's release gates.
