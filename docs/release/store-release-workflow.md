# Store release workflow

Use this workflow for Youmotion store binaries. Listing-only changes remain in
`store/automation/UPLOAD-RUNBOOK.md`. Verified on 2 October 2026 for 1.0.5.

## Default route

Use EAS-managed credentials for binary uploads on both platforms. The local
`gplay` profile can read tracks and upload into temporary edits, but cannot
validate or commit them. Do not begin another release by retrying that route.
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
   pnpm exec eas build --platform all --profile production --non-interactive --no-wait --json
   pnpm exec eas build:view ANDROID_BUILD_ID --json
   pnpm exec eas build:view IOS_BUILD_ID --json
   ```

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

## Google release notes and draft proof

EAS Submit does not supply our localized release notes. After its job FINISHED:

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
review. EAS + Console Save as draft avoids that local-credential failure path.
The installed gplay release command does not support `--dry-run`, despite the
generic skill example; inspect actual help before writing commands.

## Direct CLI permission diagnosis

The local profile uses `play-console-cli@recipe-manager-488121.iam.gserviceaccount.com`;
the successful managed EAS profile uses
`google-play-console@recipe-manager-488121.iam.gserviceaccount.com`.
Production writes need app access to `com.youmotion.mobile` and **Release to
production, exclude devices, and use Play App Signing**. Store listing writes
also need **Manage store presence**; testing releases need **Release apps to
testing tracks**. Read-only app access is needed for discovery. Prefer app-scoped
permissions, not account-wide Admin. These are Play Console grants, not merely
Google Cloud IAM roles. The API's 403 did not identify the exact missing grant;
the local account also cannot inspect Users permissions. An owner can inspect
its grants in Play Console > Users and permissions. Do not change access without
explicit authorization.

Sources: [Google permissions](https://support.google.com/googleplay/android-developer/answer/9844686?hl=en)
and [permission names](https://support.google.com/googleplay/android-developer/answer/10019561?hl=en).

## Completion

Record source SHA, version/build numbers, EAS job IDs, native store IDs, exact
localized notes and readbacks in `docs/handoffs/`. A draft, review submission,
approval and public availability are separate states. Send for review or roll
out only under the requested release scope and applicable release gates.
