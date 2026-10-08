# Youmotion 1.0.6 store release

Candidate: e03e5341a379c020b647980002b6c833c68f4ec8 on codex/store-release-2026-10-08, based on merged main 534335d. Includes the user-selected GitHub-link/README changes from this chat. Source repository is public, verified through GitHub API on 8 October.

Production EAS builds created after retry:
- Android code 19: 27e3832b-811c-477f-bb8f-2a1cbc8d1bca
- iOS build 24: 3086f55d-5811-448e-af7f-e785d8047e37

Both profile/channel production, STORE, appVersion1.0.6 and exact candidate SHA. Initial Expo GraphQL failures created no builds; counters and authenticated build launch succeeded on retry. Do not infer upload/store availability from queued jobs.

Validation: verify66 suites/479 tests, unchanged coverage thresholds (88.73% statements,79.76% branches,84.19% functions,91.61% lines), website14/14. Native source-link checks running; first attempt hit a task Appduct8443 collision, isolated daemon now uses an assigned port.

Apple version: 5e40bc1a-3b9c-43f1-bac9-73d76e966823, created MANUAL; metadata copied from1.0.5, exact new EN/DE descriptions and notes applied. Build not attached until processed. Google production prior release1.0.5/code18 completed; inspection edit discarded. New localized notes committed in store/releases/1.0.6-notes.json.

Next gates: FINISHED build records; IPA archive safety/version verification; explicit-ID EAS uploads; Apple processed-build attachment/readiness; Google exact-code localized notes/readback and intended review/release state. Do not reupload reused version codes.

## Release readback and safeguards

Both EAS production builds FINISHED for source e03e534, version1.0.6. IPA confirms com.youmotion.mobile/1.0.6/24; archive safety and Appduct-absence checks pass. Android upload ef2775a8-62f3-4da4-b3bd-25707311861a FINISHED; draft19 saved with exact EN/DE notes and source-link descriptions. Fresh-edit readback confirms draft19, live18 retained, and the inspection edit was deleted. Google required automatic review for metadata saving; the flag was omitted without promoting draft19. Console review/public state remains unverified.

iOS upload478b657e-ff30-4373-9d7d-af0acfb6c669 was IN_QUEUE at latest readback; Apple build24 absent. Do not duplicate that upload. Apple1.0.6 is MANUAL.

Fresh native checks are incomplete: task Appduct port collision was fixed; iOS restart stopped before Today, Android passed canonical link then failed restart setup. These are not full current-candidate device proof. Prior source-link evidence is in github-source-links.md; archive/unit checks do not replace native QA. Review submission is a separate gate.

Production aliases now use the checked coordinator, reuse exact-source jobs, persist uncertain launch intent and require authenticated ID readback. Records under ignored artifacts/releases/VERSION/SHA.json contain only allowlisted evidence. Production auto-submit aliases removed; uploads require --id. Use pnpm release:status --source e03e5341a379c020b647980002b6c833c68f4ec8 after this tooling commit. Full verify includes22 runner tests and479 Jest tests, plus passing coverage. Real status readback passed without another build. Tooling changes do not alter existing binaries.
