# Store release workflow

Use this workflow for Youmotion store binaries. Listing-only changes remain in
`store/automation/UPLOAD-RUNBOOK.md`. Verified on 2 October 2026 for 1.0.5.

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

   Android production is configured as `draft`. EAS iOS upload alone does not
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
6. Verify the Console review label separately. API `completed` is release intent;
   it does not prove In review or public availability. If browser access fails,
   report the successful API commit and the outstanding Console check separately.

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

The current production submit profile uploads Android as draft. For a future
review-authorized submission, configure `submit.production.android` as:

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
