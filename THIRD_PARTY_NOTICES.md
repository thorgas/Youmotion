# Third-party notices

Youmotion includes development-agent instructions under `.agents/skills`.
They are tooling documentation and are not bundled into the mobile application.
Where present, symlinks under `.claude/skills` and `.kiro/skills` point to the
same copies.

`skills-lock.json` records installed skills, upstream repositories, pinned
revisions, paths, and content hashes. The license files below are reproduced
verbatim from their upstream repositories.

## Locked skill sources

- `agent-device`: [callstack/agent-device at `56b72c5`](https://github.com/callstack/agent-device/tree/56b72c5cf7be473177ff16e6c5a7f4e421391a64), [MIT license](third_party/licenses/callstack-agent-device-MIT.txt).
- All `argent-*` skills: [software-mansion/argent at `v0.24.0`](https://github.com/software-mansion/argent/tree/v0.24.0/packages/skills), [Apache-2.0 license](third_party/licenses/software-mansion-argent-Apache-2.0.txt).
- `diagnose`, `diagnose-fix-loop`, `react-coding-style`, and `simplify`: [LegendApp/legend-skills at `5a4be51`](https://github.com/LegendApp/legend-skills/tree/5a4be517989496d0bc59520a93976360dd1bff51), [MIT license](third_party/licenses/legendapp-legend-skills-MIT.txt).
- `domain-modeling`, `prototype`, and `tdd`: [mattpocock/skills at `ed37663`](https://github.com/mattpocock/skills/tree/ed37663cc5fbef691ddfecd080dff42f7e7e350d), [MIT license](third_party/licenses/mattpocock-skills-MIT.txt).
- `react-native-testing`: [callstack/react-native-testing-library at `219adbd`](https://github.com/callstack/react-native-testing-library/tree/219adbd9c5bcb6ba62e56c8e2b900e888a745610), [MIT license](third_party/licenses/callstack-react-native-testing-library-MIT.txt).

The previously installed `continuity` skill was removed because
`peterpme/skills` had no redistribution license at the pinned revision.

## Other committed upstream skills

- `github`, `github-actions`, `react-native-best-practices`, `react-navigation`, and `upgrading-react-native`: [callstackincubator/agent-skills](https://github.com/callstackincubator/agent-skills), [MIT license](third_party/licenses/callstack-agent-skills-MIT.txt).
- `react-devtools`: [callstackincubator/agent-react-devtools](https://github.com/callstackincubator/agent-react-devtools), [MIT license](third_party/licenses/callstack-agent-react-devtools-MIT.txt).
- `react-native-harness`: [callstackincubator/react-native-harness](https://github.com/callstackincubator/react-native-harness), [MIT license](third_party/licenses/callstack-react-native-harness-MIT.txt).
- `visual-plan`: [BuilderIO/skills](https://github.com/BuilderIO/skills), [MIT license](third_party/licenses/builderio-skills-MIT.txt).

The previously installed `react-doctor` skill was removed because its Modified
MIT License requires prior written permission for use as input to an automated
machine-learning pipeline.

## Locally maintained guidance

`animation-vocabulary`, `apple-design`, `emil-design-eng`,
`improve-animations`, and `review-animations` are locally maintained guidance
that attributes the public design material and philosophies on which it is
based. They are not represented as copies of a separately licensed upstream
skill package.
