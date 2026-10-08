# Store release workflow

Use this workflow for Youmotion store binaries. Listing-only changes remain in
`store/automation/UPLOAD-RUNBOOK.md`. Review and testing CLI steps verified on 8 October 2026 for 1.0.6.

## Default route

Use EAS-managed credentials for binary uploads on both platforms. The local
`gplay` profile was previously unable to validate or commit changed edits.
On 2 October, a user-requested recheck validated and committed build 18 with
its exact notes successfully. No credential or permission changes were made by
this task. Google rejected `--changes-not-sent-for-review` with HTTP 400 and
required automatic review; omit it only with explicit review authorization.
EAS credentials and the local CLI profile are different service accounts.

1. Integrate the approved feature into main with the requested history shape.
   Preserve unrelated dirty work; use a clean checkout for the release.
2. Resolve live versions and version counters. Set the next version in
   `app.json` and `store.config.json`; commit English/German feature notes in
   `store/releases/VERSION-notes.json`. Play text must fit 500 characters per
   locale. Never reuse old version/build/localization IDs.
3. Finish translation generation before running verification, then run
   `pnpm verify` and `pnpm test:coverage`. Record native consumer passes and gaps.
4. Commit/push the exact candidate and build it:

   ```sh
   pnpm release:check
   pnpm build:production
   pnpm release:status
   pnpm exec eas build:view ANDROID_BUILD_ID --json
   pnpm exec eas build:view IOS_BUILD_ID --json
   ```

   The checked wrapper stops on preflight/API errors, reuses exact-source jobs,
   and records only authenticated build readbacks. No IDs means no confirmed
   build; inspect the failure before any other release work. An unknown launch
   must be rediscovered, never blindly repeated.

   Require FINISHED, the intended version, and the exact source SHA. Use explicit
   build IDs for submission, never `--latest`. Keep runtime fingerprints and
   source SHA in the handoff.
5. Download the IPA, run `pnpm verify:ios:archive -- /absolute/path/app.ipa`, and
   inspect its Info.plist for bundle ID, version and build number before upload.
6. Submit using the existing managed profiles:

   ```sh
   pnpm exec eas submit --platform ios --profile production --id IOS_BUILD_ID --non-interactive --no-wait
   pnpm exec eas submit --platform android --profile production --id ANDROID_BUILD_ID --non-interactive --no-wait
   ```

   Android production is configured as `completed` with automatic review; use this
   lane only with review authority and managed publishing verified. Localized
   notes still need the separate CLI step below. EAS iOS upload alone does not
   create an App Review submission. Read the installed CLI help; EAS CLI 21 has
   no submission-view command. The verified read-only fallback is
   `pnpm dlx eas-cli@23.2.0 submit:view SUBMISSION_ID --json`, without changing
   project dependencies. Require FINISHED and native-store readbacks.

## Apple metadata and attachment

Create a manual version with `asc versions create`, copy metadata from the live
version excluding `whatsNew`, and set both locales' new feature notes using
`asc localizations update --version VERSION_ID --locale LOCALE --whats-new TEXT`.
Wait for `asc builds list --app 6807357236 --version VERSION --build-number NUMBER
--processing-state all` to report the exact build VALID.

Preview then execute `asc release stage` with that build ID, source metadata
version, and `--exclude-fields whatsNew`. Its dry-run may report `build.required.missing`
because the preview does not attach the build. Confirmed staging resolves this
specific issue; unrelated readiness failures require remediation. Use a
task-local checkpoint file. Read back `asc versions list --app 6807357236
--version VERSION --include build`, both locales, and readiness errors.

## Google release notes and review

EAS Submit does not supply our localized release notes. After its job FINISHED:

Prefer CLI completion when review is authorized. An unlocked Mac is needed for
native browser control, not for service-account API requests. A locked Mac must
not be reported as a CLI blocker. Check current credentials and perform a fresh
validation before falling back to Console; an old 403 is historical evidence.

1. Run `gplay auth status --output json` and `gplay auth doctor --output json`.
   Inspect only the configured principal, never print private key material.
2. Create a task-owned edit and read the production track. Verify the exact
   uploaded version code; reuse that uploaded bundle, not another upload of the
   same code. Build 18 was completed this way without another native build.
3. Stage the committed locale notes and intended release status with
   `gplay tracks update --releases @FILE`, then validate that changed edit.
   Empty-edit validation alone does not prove release-write access.
4. For review-authorized submission, verify managed publishing is on if public
   rollout is not authorized, inspect the complete pending change set, then
   commit. Google's HTTP 400 requiring automatic review is a submission-setting
   error, not proof of missing credentials. Omit `--changes-not-sent-for-review`
   only when the user's existing authority covers sending those changes for review.
5. Read back the exact version code and both notes in a fresh edit, then discard
   only the task-owned inspection edit. Never commit an inspection edit.
6. Read review/publication state with `gplay tracks releases list --package
   com.youmotion.mobile --track production --output json`. The edit API
   `completed` value is release intent; use `releaseLifecycleState` from this
   no-edit lifecycle API to distinguish IN_REVIEW, APPROVED_NOT_PUBLISHED and
   PUBLISHED. Use Console only when this endpoint is unavailable.

For draft-only authority, or a currently verified API-access failure, use Console:

1. Open Youmotion in Play Console > Test and release > Production > Releases.
2. Edit the newly saved draft; verify version and version code.
3. Fill Release notes from the committed JSON using `<de-DE>` and `<en-US>` tags.
4. Choose **Save as draft**. Require the visible **Changes saved** message and
   notes provided for **2 of 2 languages**. Capture proof.
5. Use a fresh read-only `gplay` edit to list tracks. Confirm the new release is
   draft with both exact notes and the previous version remains completed.
   Discard only this task-owned inspection edit afterward.

Do not edit Console while EAS is uploading: Console changes can invalidate API
edits. Never reuse an expired edit. Do not remove `changes-not-sent-for-review`
after Google's 400 without checking authorization: Google may require automatic
review. Console Save as draft is the fallback when API draft-only saving fails.
The installed gplay release command does not support `--dry-run`, despite the
generic skill example; inspect actual help before writing commands.

## Direct CLI permission diagnosis

The local CLI and EAS-managed submission credentials use different service
accounts. Resolve the current principals privately from the configured profiles;
do not commit service-account emails, key files, or personal credential paths.
Production writes need app access to `com.youmotion.mobile` and **Release to
production, exclude devices, and use Play App Signing**. Store listing writes
also need **Manage store presence**; testing releases need **Release apps to
testing tracks**. Read-only app access is needed for discovery. Prefer app-scoped
permissions, not account-wide Admin. These are Play Console grants, not merely
Google Cloud IAM roles. The API's 403 did not identify the exact missing grant;
the local account still cannot inspect Users permissions. An owner can inspect
its grants in Play Console > Users and permissions. Do not change access without
explicit authorization.

Users-list access is not a release gate: on 2 October the account could validate
and commit production changes while Users inspection returned 403. Do not infer
release permissions from that endpoint. The installed Users list command needs
`--page-size=-1`; its default returns HTTP 400 from Google.

If access really fails, an owner checks the named principal's app-scoped grants
in Play Console. Do not rotate keys or expand permissions to fix a flag error.
To select a replacement key for the same intended account, use
`gplay auth login --profile youmotion --service-account /path/to/private/key.json`
after the replacement is supplied, then repeat validation. Xcode Apple sign-in
does not update Google service-account credentials.

Keep credentials outside the repository and supply them through local profiles,
managed credentials, or CI secret storage. Public documentation should use
placeholders for credential locations and account identities. Never paste key
contents or tokens into release logs, handoffs, issues, or pull requests.

## Expo review configuration

The production submit profile now sends Android for review with the following
settings. Do not invoke it for draft-only authority:

```json
{
  "track": "production",
  "releaseStatus": "completed",
  "changesNotSentForReview": false
}
```

Keep managed publishing on when approval must not publish automatically. The
working EAS-managed service account needs no replacement merely to change this
submission intent. Localized notes still require the separate step above.
Changing eas.json does not promote an already-uploaded draft. Complete an
existing draft through the CLI or Console; do not reupload the same version code.
This is a submission configuration change, not a reason to rebuild the app.
See [Expo submit configuration](https://docs.expo.dev/eas/json/) and
[Google managed publishing](https://support.google.com/googleplay/android-developer/answer/9859654?hl=en).

Sources: [Google permissions](https://support.google.com/googleplay/android-developer/answer/9844686?hl=en)
and [permission names](https://support.google.com/googleplay/android-developer/answer/10019561?hl=en).

## Completion

Record source SHA, version/build numbers, EAS job IDs, native store IDs, exact
localized notes and readbacks in `docs/handoffs/`. A draft, review submission,
approval and public availability are separate states. Send for review or roll
out only under the requested release scope and applicable release gates.

## Finish review and testing through CLIs

EAS upload and `asc release stage` are intermediate steps. When the user requests review, continue to the commands below and read back each result. When tester distribution is requested, also update every existing selected testing track/group using the same uploaded binary. Do not rebuild/reupload to promote an already uploaded build. Record endpoint authority (draft, review, testing distribution or public rollout) before starting.

### Apple App Review

Require zero blocking readiness errors, the intended VALID build, exact notes and an attached build. Current asc5 uses `--build-id`; `--build` is removed. Do not create a second submission if one already exists.

```sh
asc validate --app 6807357236 --version VERSION --platform IOS --output json
pnpm release:review:ios --version-id VERSION_ID --build-id APPLE_BUILD_ID --dry-run --output json
pnpm release:review:ios --version-id VERSION_ID --build-id APPLE_BUILD_ID --confirm --output json
pnpm release:status:ios --version VERSION --output json
```

Require the actual submission ID and WAITING_FOR_REVIEW/IN_REVIEW readback. MANUAL release timing remains separate from review; do not release publicly merely because Apple approves. A DNS/network failure before a response requires checking current submission state before retrying.

### Google Play review and testing

`gplay` can send the existing draft for review and promote it to internal/alpha/beta via an edit. No browser interaction is needed for these mutations. Managed publishing must already be on when public rollout is not authorized; its toggle still requires Console verification with the current CLI. Read the complete pending change set before commit.

1. `gplay edits create --package com.youmotion.mobile --output json`; retain the returned task-owned edit ID.
2. `gplay tracks list --package com.youmotion.mobile --edit EDIT_ID --output json`; confirm the exact uploaded code and existing tracks.
3. Create a task-local releases JSON array with the exact versionCode, name, committed EN/DE notes and `status: "completed"`. Include any older codes deliberately retained; do not substitute --latest or upload another bundle.
4. For each authorized track, run `gplay tracks update --package com.youmotion.mobile --edit EDIT_ID --track TRACK --releases @RELEASES_JSON`. For testers, reuse existing internal/alpha/beta tracks and keep their memberships. Do not create new tracks/testers implicitly.
5. `gplay edits validate --package com.youmotion.mobile --edit EDIT_ID`.
6. Under explicit review authority, `gplay edits commit --package com.youmotion.mobile --edit EDIT_ID`. Google currently requires automatic review for this app; do not add `--changes-not-sent-for-review` for this lane.
7. Check each track with `pnpm release:status:play --track TRACK --output json`. Require the exact code and `releaseLifecycleState`, not edit.status alone. A fresh inspection edit can verify exact notes; discard only that edit with `gplay edits delete --package com.youmotion.mobile --edit INSPECTION_EDIT_ID --confirm`.

The lifecycle endpoint exposes review state independently of edits: [official API](https://developers.google.com/android-publisher/api-ref/rest/v3/applications.tracks.releases). IN_REVIEW means submitted, APPROVED_NOT_PUBLISHED means approval is held, PUBLISHED means available on that track. A browser screenshot is optional corroboration, not the primary status route. The managed-publishing toggle/public release controls remain in [Publishing overview](https://support.google.com/googleplay/android-developer/answer/9859654?hl=en).

### TestFlight updates

```sh
asc testflight groups list --app 6807357236 --paginate --output json
asc builds test-notes create --build-id APPLE_BUILD_ID --locale en-US --whats-new 'COMMITTED_TEST_NOTES'
asc builds test-notes create --build-id APPLE_BUILD_ID --locale de-DE --whats-new 'COMMITTED_TEST_NOTES'
pnpm release:testing:ios --build-id APPLE_BUILD_ID --group EXTERNAL_GROUP_ID --dry-run --output json
pnpm release:testing:ios --build-id APPLE_BUILD_ID --group EXTERNAL_GROUP_ID --submit --confirm --output json
pnpm release:testing:ios:status --build-id APPLE_BUILD_ID --output json
asc builds beta-app-review-submission view --build-id APPLE_BUILD_ID --output json
```

Inspect configured locales first; update existing notes rather than creating duplicates. External testers need Beta App Review, independently of App Review. Before submitting, require localized Beta App Descriptions, the public feedback email, reviewer contact details, review notes, privacy/marketing URLs, encryption readiness and an eligible build. Missing beta descriptions/feedback/contact metadata caused actual submission failures on 8 October and were repaired through these CLI commands. Use `asc testflight app-localizations list/update` and `asc testflight review view/edit`; reuse the app's existing approved contact information without printing/committing it.

Team (Expo) is internal and hasAccessToAllBuilds=true; it receives eligible builds automatically. Do not explicitly add this internal group: Apple returns 422. Assign external groups only (or use --skip-internal), then verify internal all-build access and external beta-review state separately. An external group relationship alone does not prove testers can install before beta approval.

## Skills and source of truth

Use implementation-delivery for release code changes, asc-release-flow and asc-testflight-orchestration for Apple, and gplay-release-flow/testers-orchestration for Google. Existing skills provide the platform behavior; this project guide supplies exact commands and completion gates. A second duplicated release skill is unnecessary. Prefer installed CLI help and schemas over stale skill examples.

Managed publishing holds alpha/beta updates as well as production. Internal testing is exempt. Use lifecycle PUBLISHED to prove tester availability; completed intent or approved-but-held is insufficient. Do not turn managed publishing off or publish the entire approved batch when only review/test distribution was authorized and that batch includes production. Report this publication boundary explicitly.
