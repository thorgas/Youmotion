# AI skill evaluation

Evaluated and installed on 2026-07-27 for Youmotion. Skill sources are pinned
in `skills-lock.json`; the corresponding CLI packages are exact development
dependencies in `package.json`.

## Installed

- `agent-device` and its `agent-device@0.20.0` CLI for connected physical
  devices. Argent remains the simulator/emulator debugger, profiler, and
  screenshot tool.
- `react-native-testing` for versioned React Native Testing Library 14 guidance.
- `domain-modeling`, `tdd`, and the optional `prototype` workflow from
  `mattpocock/skills`.
- `diagnose`, `diagnose-fix-loop`, `react-coding-style`, and `simplify` from
  `LegendApp/legend-skills`.
- `continuity` from `peterpme/skills`, installed by explicit decision despite
  the evaluated revision having no repository license file.
- `skillgym@0.10.0` as the retained evaluation runner.

Only these named skills and their documented dependencies were copied, rather
than installing each complete source repository.

## Skillgym result

[Skillgym](https://github.com/callstackincubator/skillgym) ran fresh,
read-only Codex sessions in an isolated Youmotion-shaped fixture. The fixture
included Expo 57, React Native 0.86, RNTL 14, XState, Effect, the relevant
`AGENTS.md` rules, and deliberately problematic component and test examples.

- 20 distinct cases
- 14 passed
- 6 failed
- no candidate was permitted to install packages, publish tracker changes,
  commit, rebase, or modify the fixture
- one additional strict RNTL repeat exposed nondeterminism described below

| Source | Cases | Result | Decision |
| --- | ---: | ---: | --- |
| `callstack/agent-device` | 1 | 1 passed | Adopt for physical devices |
| `callstack/react-native-testing-library` | 1 | 1 passed | Install, with a regression case |
| `LegendApp/legend-skills` | 8 | 8 passed | Installed the four relevant skills only |
| `mattpocock/skills` | 8 | 3 passed, 5 failed | Installed `domain-modeling`, `tdd`, and optional `prototype` |
| `peterpme/skills` | 1 | 1 passed | Installed `continuity` by explicit decision |
| `openclaw/agent-skills` | 1 | 0 passed | Skip `autoreview` |

The pass count is evidence for these exact prompts, not a general quality score.
The suite used one repetition per distinct case, so retained skills should be
rerun with multiple repetitions before upgrading their pinned revisions.

## Findings

### Adopted

- **`agent-device`** selected correctly for a physical-iPhone plan, detected
  that the CLI was unavailable, and did not use `npx` or install anything. The
  official CLI supports physical devices and saved `.ad` replay/evidence
  workflows. This fills Argent's real-device gap; it does not replace Argent.
- **`react-native-testing`** selected the RNTL 14 reference and produced the
  required asynchronous `render`, interaction, `screen`, and matcher changes.
  In a separate strict repeat it still used `getByTestId` despite its own
  role-first rule, so keep a query-priority regression case in the retained
  evaluation.
- **`domain-modeling`** found contradictions between the fixture glossary and
  implementation vocabulary without inventing domain decisions.
- **`tdd`** named a public seam and put the user-observable hydration,
  permission, and fallback matrix before implementation details.
- **Legend `diagnose` and `diagnose-fix-loop`** loaded together when required,
  respected read-only scope, and did not auto-trigger `diagnose` for a generic
  render question.
- **Legend `react-coding-style`** respected Youmotion's XState actor rule over
  generic local-state advice and did not suggest installing Legend State.
- **Legend `simplify`** preserved behavior and repository architecture while
  identifying unnecessary effects and ownership.

### Do not install now

- **Legend `commit-confirm`, `commit`, and `git-integrate`** passed their safety
  cases but duplicate the existing GitHub, branch, and commit workflows.
- **Legend `legend-list-best-practices` and
  `legend-state-best-practices`** stayed dormant, as expected: Youmotion does
  not use those libraries.
- **Matt `code-review`** did not select for an explicit review-since-main
  request. It also requires issue-tracker setup and parallel sub-agents, which
  overlap existing review tooling.
- **Matt `improve-codebase-architecture`** did not select when explicitly
  named. It depends on missing `codebase-design` and `grilling` skills, requires
  sub-agents, and normally writes and opens an HTML report.
- **Matt `to-spec`, `to-tickets`, and `triage`** did not load when explicitly
  named. Their `disable-model-invocation` metadata and tracker/setup assumptions
  make them unreliable in the current Codex flow.
- **OpenClaw `autoreview`** did not select for a constrained closeout review and
  duplicates Codex review and Cali. Its normal workflow can launch another
  long-running reviewer, so the failed trigger is expensive rather than benign.
- **Lint Rule Miner** was described as an internal skill in the bookmarked post
  and no public installable skill was linked.
- **Pure JSI/C++ and Nitro skills** are specialist tools for the
  `react-native-surrealdb` module. Evaluate them in that package's repository
  when native-module work is active, not as general Youmotion skills.

### Excluded

- `/edge-cases` was excluded before execution because the bookmarked
  implementation is paid.
- No paid Expo or EAS skill was added to this list.

## Revisions evaluated

| Repository | Revision | License at revision |
| --- | --- | --- |
| `callstackincubator/skillgym` | `cdf0eb14e8b2bd4fa6e80499c05dcdfcdd23d09b` | MIT |
| `callstack/agent-device` | `56b72c5cf7be473177ff16e6c5a7f4e421391a64` | MIT |
| `callstack/react-native-testing-library` | `219adbd9c5bcb6ba62e56c8e2b900e888a745610` | MIT |
| `LegendApp/legend-skills` | `5a4be517989496d0bc59520a93976360dd1bff51` | MIT |
| `mattpocock/skills` | `ed37663cc5fbef691ddfecd080dff42f7e7e350d` | MIT |
| `peterpme/skills` | `a031863b9dd1ab45afd6d0fb0b0a81ec96f373c5` | none found |
| `openclaw/agent-skills` | `fe588b1a6267eb47f785d0c748db9f6f3e9a3b4f` | MIT |

## Harness caveat

Skillgym 0.10.0 did not detect file reads from the current Codex JSONL format
because `exec_command` stores the command in function-call arguments while the
adapter looked for it in function-call output. The temporary evaluation patched
that normalization path before scoring. Raw Skillgym artifacts were deleted and
must never be committed because isolated runner homes can contain copied
authentication state.
