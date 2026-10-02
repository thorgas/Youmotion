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

iOS production IPA passed `scripts/verify-ios-store-archive.sh`; Info.plist confirms `com.youmotion.mobile`, version `1.0.5`, build `21`. EAS upload job: https://expo.dev/accounts/youmotion/projects/youmotion/submissions/7f73ad19-6805-4341-b76a-19d859f2dc37 . Upload and Apple processing must be read back before build attachment.

