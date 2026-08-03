# Youmotion after How We Feel

Status: proposed  
Date: 2026-08-01  
Decision owner: product/engineering review

## Executive recommendation

Do not chase How We Feel's feature breadth. Make Youmotion the fastest private path from a vague bodily feeling to a precise emotion, an optional belief-aware reflection, and a useful pattern the user can verify.

The first implementation slice should combine **recoverable local data** and **guided, escapable reflection**. Trust and a clear first payoff are prerequisites for a lasting reflection habit. App lock, authentication, encryption, and other security work are explicitly out of scope for this plan.

## What was reviewed

- [How We Feel website](https://howwefeel.org/)
- [Apple App Store listing and version history](https://apps.apple.com/us/app/how-we-feel/id1562706384)
- [Google Play listing and reviews](https://play.google.com/store/apps/details?id=org.howwefeel.moodmeter&hl=en)
- [Marc Brackett overview](https://marcbrackett.com/how-we-feel-app-3/)
- [Never Sit Still motion case study](https://www.behance.net/gallery/145365127/How-We-Feel)
- [Daily check-in wireflow study](https://medium.com/design-bootcamp/wireframing-the-how-we-feel-app-a-look-into-the-user-flow-b04583041f6d)
- [How We Feel check-in retrospective](https://howwefeel.substack.com/p/ch-ch-ch-changes)
- [Body-sensation flow](https://howwefeel.substack.com/p/when-sensations-speak)
- [AI weekly-review flow](https://howwefeel.substack.com/p/the-week-unfolded-ef4)
- Current Youmotion navigation, check-in, belief, History, Insights, Settings, motion constants, screenshots, and tests
- Prior Youmotion competitor/privacy strategy from task `019fa329-085e-74d3-90a4-89935e48e24a`

This comparison uses public reviews directionally, not as a statistically representative sample.

## Benchmark analysis

### 1. Check-in flow

How We Feel's basic loop is easy to learn: open or respond to a prompt, select an emotion, optionally add context, save, and return. Familiar controls and progressive disclosure keep the first action understandable. Its own retrospective is especially useful: as optional modules accumulated, the check-in became slower, so the team added skip paths and a quick-save interaction.

Youmotion has the more distinctive opening interaction. The Pulse maps touch position and intensity into seven emotional directions and nuanced labels, with continuous ripple feedback and threshold haptics. That is a stronger embodied act than choosing a cell or chip.

The weakness comes after selection. Releasing the Pulse currently commits the user into Reflection, and the route continues through Belief before completion. The fields may be optional, but the traversal is not. That creates a mismatch between the product's quiet, no-pressure tone and the actual cost of logging a moment.

**Implication:** keep the Pulse and guide users naturally into Reflection, where the benefit is explained in concrete terms. Keep `Save for now` visible as a low-pressure exit, but do not make an unfamiliar depth decision the first thing users must evaluate.

### 2. Motion and animation

The Behance work is not primarily a pattern library for transactional animation. It is an emotional-learning system:

- The logo uses a large organic blob that zooms and morphs into a heart/check mark.
- Abstract gradient characters squash, stretch, fold, gesture, and use hand-drawn limbs or accents.
- Lesson screens pair a calm presenter with restrained illustration and clear progress.
- Loops create warmth and curiosity without requiring the user to decode new controls.

The transferable principle is **placement**. Rich, characterful motion belongs in learning, onboarding, and insight discovery. Saving, navigation, privacy, and destructive actions should stay stable and predictable.

Youmotion should not copy the colorful character language. Its paper, ink, muted color, ripple physics, and sparse typography are already coherent. Improve continuity instead:

- Let the selected emotion settle for 180–240 ms before actions appear.
- Reveal actions with a subtle 8 px fade/translation.
- Carry the saved Pulse dot into the newest History-row marker.
- Use one progress metaphor through optional reflection and belief work.
- Animate an insight once when first revealed; do not loop around reading controls.
- Reserve expressive illustration loops for short lessons.
- Under reduced motion, use opacity/state replacement with identical information and focus order.

### 3. Topics and feature breadth

How We Feel now spans emotion vocabulary, causes and context, body sensations, strategies, mini-courses, custom emotions, Friends, health inputs, backup/sync, and opt-in AI review. That breadth makes it a broad emotional-wellness companion.

Youmotion has a narrower but more defensible chain:

1. Notice an embodied emotional direction.
2. Name it precisely.
3. Reflect in private.
4. Surface a harmful belief.
5. Form a credible guiding belief.
6. See patterns across time.

The belief transformation is the clearest differentiation. It should remain a depth path, not become a compulsory toll on every check-in.

### 4. What users reward and where they struggle

Across store listings, featured reviews, long-term community posts, and product retrospectives, positive themes recur:

- Precise emotion labels help people move from vague discomfort to curiosity.
- A free, low-pressure experience encourages repeated daily use.
- A polished visual system makes difficult reflection feel approachable.
- Body sensations and contextual patterns can improve recognition.
- Users want insights that explain something useful, not charts for their own sake.

Directional pain points recur too:

- Requests for neutral or personal vocabulary.
- Charts that feel attractive but not actionable.
- Fear of data loss, weak sync, or unclear recovery.
- Platform and language parity gaps.
- Friction from too many optional steps.
- Occasional instability in secondary tools.
- Privacy questions when accounts, social features, or AI enter the product.

**Implication:** Youmotion should solve recovery, optional traversal, and explainable insights before adding broad inputs or tools.

## Product position

Youmotion's promise should be:

> The private place to turn a vague feeling into precise language, optional meaning, and patterns you can verify.

| Keep distinctly Youmotion | Adapt from the benchmark | Defer or refuse |
| --- | --- | --- |
| Touch-following Pulse and seven directions | Guided reflection with a visible early exit | Friends, accounts, and social comparison |
| Harmful-to-guiding belief transformation | Personal labels mapped to canonical axes | Generic AI therapist or remote journal processing |
| Local-first, no signup, no tracking by default | Evidence-linked weekly reflection | App lock/security, streaks, weather, voice, photos, and HealthKit |
| Deterministic observations and editable History | Optional structured body awareness | A large coping-tool catalog |
| Reduced-motion support and deliberate haptics | Short contextual lessons | Paid recovery or identity-based sync |

## Target check-in flow

1. **Notice** — Keep the Pulse as the entry point.
2. **Name** — Release settles into a stable selected word, family, and intensity.
3. **Explain the payoff** — Enter Reflection naturally and say how a few words make later emotional and belief patterns understandable.
4. **Guide with an escape** — Keep the short reflection path visually primary and label its small cost; keep `Save for now` visible as a secondary, pressure-free exit.
5. **Transform optionally** — Preserve the harmful/guiding belief flow without blocking completion.
6. **Return value** — Confirm the saved moment and, when enough data exists, preview one deterministic, evidence-linked weekly observation.
7. **Inspect** — Let the user open the exact History entries supporting the observation.

### Flow sketch

```text
Pulse
  |
  v
Selected emotion
  |
  `-- Reflect (payoff explained)
         |-- Save for now ------------------> Saved
         |
         `-- Continue to what is underneath
                |-- Save belief ------------> Saved
                `-- Finish without belief --> Saved

Saved --> evidence-linked observation --> supporting History entries
```

## Ordered delivery plan

### Phase 0 — Trust before intelligence

Create a vertical `src/features/data-safety/` feature with domain schemas, actor-owned application flow, infrastructure adapters, and Settings UI.

Deliver:

- Versioned, Effect-Schema-validated archive export.
- Atomic restore with preview, validation, an explicit replace/merge decision, and rollback on failure.
- Explicit delete-all with visible success and failure states.
- Plain-language local-data and privacy explanation.

User-observable matrix:

- Cold and warm start.
- Empty and non-empty database.
- Valid, wrong-version, and corrupt archive.
- Successful import and write failure.
- Deletion success and failure.
- Every fallback visible before asynchronous initialization completes.

Exit criteria:

- Restore failure cannot change the existing journal.
- The user can tell where data lives and what backup does.
- No lock, authentication, encryption, or account capability is introduced.

### Phase 1 — Guide depth without trapping the user

Keep Reflection as the natural continuation after selecting an emotion, but explain its concrete value before asking for effort. Make the guided path primary and brief, while adding a visible `Save for now` exit that persists the same emotion and intensity without traversing Belief.

Likely touch points:

- `src/navigation/app-navigation.machine.ts`
- `src/features/check-in/ui/check-in-screen.tsx`
- `src/features/check-in/ui/reflection-screen.tsx`
- `src/features/check-in/ui/check-in-progress.tsx`
- Check-in actor/domain tests and navigation model paths

Constraints:

- Keep Expo Router as a view of the one root navigation machine.
- Keep one actor hook per component.
- Do not import infrastructure from UI.
- Do not add a second navigation state.
- Keep components responsible for their events and subscriptions.

Exit criteria:

- A first-time user can understand why adding a few words will improve later patterns and belief work.
- A returning user can still save with one gesture plus one clearly visible exit action.
- Reflection and belief work never block saving.
- The interface does not ask users to choose an abstract "depth" before they have experienced its value.
- Back/cancel behavior is explicit at every depth.
- The chosen label and intensity are identical across quick and deep saves.

### Phase 2 — Make Insights answer “why?”

Add an on-device deterministic weekly reflection after at least three check-ins.

Deliver:

- Lead with one plain-language sentence, not the radar.
- Show sample size and comparison period.
- Make every claim open exact supporting History entries.
- Let users dismiss or mute a repeated observation.
- Keep the radar and calendar as secondary exploration.
- Do not use an LLM or send journal text remotely.

Likely touch points:

- `src/features/analytics/domain/check-in-analytics.ts`
- `src/features/analytics/domain/analytics-timeframe.ts`
- `src/features/analytics/ui/analytics-screen.tsx`
- `src/features/history/ui/history-screen.tsx`

Exit criteria:

- Every displayed claim can be reproduced from local entries.
- Sparse data yields an honest empty/learning state.
- Tapping evidence applies an explicit History filter and can be undone.

### Phase 3 — Personal vocabulary without breaking analytics

Allow a personal emotion label only when it maps to one canonical emotional direction. Persist both the personal label and canonical identity so historical analytics remain comparable.

Defer multiple simultaneous emotions until the domain can migrate from one emotion to an ordered, non-empty collection with explicit intensity semantics.

Exit criteria:

- Renaming or deleting a personal label cannot orphan old entries.
- Canonical analytics remain stable across personal vocabulary edits.
- Import/export preserves both identities.

### Phase 4 — Body awareness and contextual learning

Add an optional structured body-awareness step: region, sensation, and intensity. Avoid unstructured medical interpretation.

Pair it with six short, contextual lessons:

1. Feelings are information, not verdicts.
2. Precision changes what becomes possible.
3. Intensity and direction are different signals.
4. Body sensations can precede labels.
5. Harmful beliefs are hypotheses, not facts.
6. Guiding beliefs should be credible, not merely positive.

Use expressive animation here, where it supports curiosity without destabilizing a core task.

### Phase 5 — Coherent motion and truthful store story

Unify motion tokens and create six store panels:

1. Vague-to-precise Pulse.
2. Private reflection.
3. Belief transformation.
4. Editable History.
5. Explainable insight.
6. Local privacy and data control.

Use fresh rendered app states and do not advertise a feature before it ships.

## Verification gates

For every phase:

- Define the user-observable runtime-boundary matrix before implementation.
- Add navigation model-path coverage for changed states and events.
- Test consumer boundaries for pre-hydration, success, failure, and fallback states.
- Add or update a custom Oxlint rule test when an architectural invariant changes.
- Use React Native Harness for save-vs-reflect, finish-vs-belief, restore, delete-all, and evidence drill-down.
- Run `pnpm verify` and `pnpm test:coverage`; do not lower thresholds.
- Validate reduced motion, VoiceOver/TalkBack labels, dynamic type, EN/DE copy, keyboard behavior, and compact phones.

## Success measures

Primary:

- Median time from app open to saved moment.
- Completion rate from Pulse release to save.
- Voluntary reflection rate after users are given a quick-save choice.
- Percentage of insight views that open supporting entries.
- Successful restore rate in local QA fixtures.

Guardrails:

- No account, stable identifier, third-party tracking, or remote journal processing.
- No increase in save failures or orphaned partial entries.
- No reduction in reduced-motion or accessibility coverage.
- No insight statement without sufficient sample size and visible evidence.

Measure these locally or through explicit user-controlled diagnostics; do not add behavioral tracking by default.

## Recommended first implementation slice

Ship Phase 0 and Phase 1 together.

A fast check-in without recoverable data is fragile. Data safety without a lower-friction daily loop is largely invisible. Together they address the two clearest gaps revealed by the comparison: **trust** and **optional depth**.

Do not start Phase 2 until the quick-save flow and restore behavior are verified on device. Do not start Phase 4 until users can understand and recover their existing data.
