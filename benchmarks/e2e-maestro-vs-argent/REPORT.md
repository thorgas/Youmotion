# Maestro vs Argent E2E benchmark

Run on 2026-08-11 against Youmotion on one iPhone 17 Pro simulator (iOS 26.1).

## Outcome

Argent was materially faster and less variable for this flow. Both tools passed all 10 measured runs.

| Metric | Argent 0.20.0 | Maestro 2.8.0 |
| --- | ---: | ---: |
| Passes | 10/10 | 10/10 |
| Median wall time | 27.974s | 85.977s |
| Mean wall time | 27.543s | 88.083s |
| Minimum | 25.116s | 74.584s |
| Maximum | 29.398s | 117.734s |
| Sample standard deviation | 1.526s | 13.801s |
| Coefficient of variation | 5.5% | 15.7% |

The median Maestro run was 3.07 times slower. Its slowest run was 4.01 times slower than Argent's slowest run and came within 2.3 seconds of the benchmark's 120-second per-run timeout.

Ten passes are useful local evidence, not proof of a low long-term flake rate. With only 10 samples, both observed 100% pass rates have the same approximate 95% Wilson lower bound of 72.2%.

## Flow under test

The committed Expo map identified Settings and all three onboarding routes as independently reachable screens. The benchmark exercises their real XState-driven journey instead of deep-linking between them:

1. Launch the development client and open the Youmotion Metro URL.
2. Verify Today, then open Settings.
3. Replay the short onboarding guide.
4. Continue from welcome to the Pulse step.
5. Request the accessible Pulse example, producing the in-screen `Sorge` state.
6. Continue to the reflection example.
7. Finish and verify the app returns to Settings.

This crosses four navigation states and one meaningful in-screen state transition. It does not create, modify, or delete reflection data.

The flows use the strongest selector exposed by each runner. Maestro sees the React Native `testID` values on the settings and primary-action controls. Argent's accessibility path exposes the same controls through their localized accessible text, while route identity uses stable IDs such as `onboarding-progress`.

## Method

- Argent was verified as the current npm release (`0.20.0`).
- The installed global Maestro was old (`1.34.1`), so the benchmark downloaded the official `2.8.0` release into `/tmp`, verified its SHA-256 checksum, and used that isolated binary without changing the global installation.
- Both runners targeted simulator `28FC32E3-9023-43E2-90C8-76D97ABBA3C8` and app ID `com.youmotion.mobile`.
- Both opened the same development-client URL backed by the same Metro process on port 8091.
- Metro ran with `EXPO_PUBLIC_MAESTRO=true` so `react-native-grab` did not interfere with either runner.
- One successful validation/warm-up per tool was excluded.
- Ten measured rounds alternated order: Argent then Maestro on odd rounds, Maestro then Argent on even rounds.
- Wall time includes CLI startup, app restart, development-client open, every interaction and assertion, and report generation.
- A nonzero exit, signal, or 120-second timeout counted as a failure. There were no automatic benchmark-level retries.
- Destination assertions gate every transition. Stability waits are used only on screens that can settle; they are deliberately omitted around the continuously animated Pulse.

Mean wall time split by order remained similar:

| Runner position | Argent | Maestro |
| --- | ---: | ---: |
| First in pair | 28.208s | 86.343s |
| Second in pair | 26.878s | 89.822s |

The balanced ordering therefore does not explain the speed difference.

## Token usage

Deterministic replay itself invokes no language model, so runtime LLM token usage is exactly zero for both tools.

For the two token-bearing artifacts, both were measured with `gpt-tokenizer` 3.4.0 using `o200k_base`:

| Metric | Argent | Maestro |
| --- | ---: | ---: |
| Flow definition | 333 tokens / 1,054 bytes / 23 lines | 288 tokens / 983 bytes / 45 lines |
| Successful CLI output per run | 1,098 tokens / 3,552 bytes | 366 tokens / 1,327 bytes |

Maestro's definition is 45 tokens smaller and its successful output is 732 tokens smaller. Argent's JSON is more verbose because it emits a structured record for every step. For agent-in-the-loop CI diagnosis, consumers can avoid paying that output cost by reading only the exit code on success and retaining JSON as an artifact.

The model-token cost of authoring is intentionally not reported. The current environment does not expose usage attribution per tool or per authoring phase, and estimating it from tool-call counts would not be a defensible token measurement.

## Reliability observations

- Both: 10/10 successful verdicts with identical user-visible end state.
- Argent: narrow 4.28-second total range and no sample close to the timeout.
- Maestro: 43.15-second total range; one 117.73-second tail sample. It still passed, so this is latency variability rather than an observed functional flake.
- An initial Maestro draft failed because its exact text selector did not match a combined React Native accessibility label. Replacing it with the exposed `testID` made all measured runs pass. That authoring correction is excluded from reliability samples.
- An initial Argent recording captured brittle coordinates and two invalid waits during live discovery. The final committed flow replaces them with declarative selectors and was validated before measurement. Those authoring corrections are also excluded.

## Recommendation

Use Argent as the default local and CI replay runner for this Youmotion flow. It produced the same 10/10 reliability result with a 3.07-times faster median and substantially tighter latency.

Keep Maestro where its existing suite, ecosystem, cloud execution, or compact success logs are valuable. Its definition is slightly smaller, and its success output is about one third of Argent's full JSON output. This benchmark does not cover Android, physical devices, cloud parallelism, screenshots, failure-diagnostic quality, or maintenance over UI changes, so it should not be generalized beyond local iOS replay without another targeted run.

## Reproduce

Prerequisites:

- Youmotion development build installed on the target simulator.
- Metro running at port 8091 with `EXPO_PUBLIC_MAESTRO=true`.
- Argent 0.20.0 on `PATH`.
- Maestro 2.8.0 at the path supplied through `MAESTRO_BIN`.
- `gpt-tokenizer` 3.4.0 available under the path supplied through `TOKENIZER_ROOT`.

Run:

```sh
BENCHMARK_DEVICE=<simulator-udid> \
MAESTRO_BIN=<path-to-maestro-2.8.0> \
TOKENIZER_ROOT=<path-to-tokenizer-package-json> \
node benchmarks/e2e-maestro-vs-argent/run-benchmark.mjs 10
```

The raw measurements and per-run stdout/stderr are in `results/`. The benchmark script overwrites `raw-results.json` and the matching numbered logs for the requested rounds.

## Documentation checked

- [Argent upstream README](https://github.com/software-mansion/argent) and installed 0.20.0 flow/tool help.
- [Maestro 2.8.0 release](https://github.com/mobile-dev-inc/Maestro/releases/tag/cli-2.8.0), [`launchApp`](https://docs.maestro.dev/reference/commands-available/launchapp), [flow](https://docs.maestro.dev/maestro-flows), and [wait-command](https://docs.maestro.dev/maestro-flows/flow-control-and-logic/wait-commands) documentation.
