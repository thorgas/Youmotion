import { fbs } from 'fbtee';
import assert from '@/assert';

import { EMOTION_IDS } from '@/constants';
import type { EmotionId, EmotionSelection } from '../domain/check-in';

type Copy = () => string;
type EmotionCopy = Readonly<{ emoji: string; name: Copy; nuances: readonly Copy[] }>;
type LocalizedEmotionSelection = Readonly<{
  emotionId: EmotionId;
  intensity: number;
  level?: number | undefined;
}>;

const emotionCopy = new Map<EmotionId, EmotionCopy>([
  [EMOTION_IDS.JOY, {
    emoji: '😊',
    name: () => String(fbs('Joy', 'Name of the joy emotion')),
    nuances: [
      () => String(fbs('Pleasure', 'Low-intensity nuance of joy')),
      () => String(fbs('Enjoyment', 'Nuance of joy')),
      () => String(fbs('Cheerfulness', 'Nuance of joy')),
      () => String(fbs('Optimism', 'Nuance of joy')),
      () => String(fbs('Enthusiasm', 'Nuance of joy')),
      () => String(fbs('Contentment', 'Nuance of joy')),
      () => String(fbs('Happiness', 'High-intensity nuance of joy')),
    ],
  }],
  [EMOTION_IDS.LOVE, {
    emoji: '❤️',
    name: () => String(fbs('Love', 'Name of the love emotion')),
    nuances: [
      () => String(fbs('Fondness', 'Low-intensity nuance of love')),
      () => String(fbs('Affection', 'Nuance of love')),
      () => String(fbs('Familiarity', 'Nuance of love')),
      () => String(fbs('Admiration', 'Nuance of love')),
      () => String(fbs('Passion', 'Nuance of love')),
      () => String(fbs('Desire', 'High-intensity nuance of love')),
    ],
  }],
  [EMOTION_IDS.SHAME, {
    emoji: '🫣',
    name: () => String(fbs('Shame', 'Name of the shame emotion')),
    nuances: [
      () => String(fbs('Confusion', 'Low-intensity nuance of shame')),
      () => String(fbs('Self-consciousness', 'Nuance of shame')),
      () => String(fbs('Embarrassment', 'Nuance of shame')),
      () => String(fbs('Humiliation', 'Nuance of shame')),
      () => String(fbs('Regret', 'Nuance of shame')),
      () => String(fbs('Remorse', 'Nuance of shame')),
      () => String(fbs('Guilt', 'High-intensity nuance of shame')),
    ],
  }],
  [EMOTION_IDS.DISGUST, {
    emoji: '🤢',
    name: () => String(fbs('Disgust', 'Name of the disgust emotion')),
    nuances: [
      () => String(fbs('Aversion', 'Low-intensity nuance of disgust')),
      () => String(fbs('Reluctance', 'Nuance of disgust')),
      () => String(fbs('Contempt', 'Nuance of disgust')),
      () => String(fbs('Revulsion', 'Nuance of disgust')),
      () => String(fbs('Repulsion', 'High-intensity nuance of disgust')),
    ],
  }],
  [EMOTION_IDS.SADNESS, {
    emoji: '😢',
    name: () => String(fbs('Sadness', 'Name of the sadness emotion')),
    nuances: [
      () => String(fbs('Gloom', 'Low-intensity nuance of sadness')),
      () => String(fbs('Sorrow', 'Nuance of sadness')),
      () => String(fbs('Disappointment', 'Nuance of sadness')),
      () => String(fbs('Hopelessness', 'Nuance of sadness')),
      () => String(fbs('Loneliness', 'Nuance of sadness')),
      () => String(fbs('Despair', 'High-intensity nuance of sadness')),
    ],
  }],
  [EMOTION_IDS.ANGER, {
    emoji: '😠',
    name: () => String(fbs('Anger', 'Name of the anger emotion')),
    nuances: [
      () => String(fbs('Displeasure', 'Low-intensity nuance of anger')),
      () => String(fbs('Annoyance', 'Nuance of anger')),
      () => String(fbs('Irritation', 'Nuance of anger')),
      () => String(fbs('Anger', 'Nuance of anger')),
      () => String(fbs('Resentment', 'Nuance of anger')),
      () => String(fbs('Rage', 'Nuance of anger')),
      () => String(fbs('Aggression', 'High-intensity nuance of anger')),
    ],
  }],
  [EMOTION_IDS.FEAR, {
    emoji: '😨',
    name: () => String(fbs('Fear', 'Name of the fear emotion')),
    nuances: [
      () => String(fbs('Uncertainty', 'Low-intensity nuance of fear')),
      () => String(fbs('Apprehension', 'Nuance of fear')),
      () => String(fbs('Concern', 'Nuance of fear')),
      () => String(fbs('Worry', 'Nuance of fear')),
      () => String(fbs('Helplessness', 'Nuance of fear')),
      () => String(fbs('Fright', 'Nuance of fear')),
      () => String(fbs('Horror', 'Nuance of fear')),
      () => String(fbs('Panic', 'High-intensity nuance of fear')),
    ],
  }],
]);

const _fallbackName = () => String(fbs('Emotion', 'Fallback emotion name'));
const _fallbackNuance = () => String(fbs('Feeling', 'Fallback emotion nuance'));
const _fallbackEmoji = '😶';

export function emotionEmoji(emotionId: EmotionId) {
  return emotionCopy.get(emotionId)?.emoji ?? _fallbackEmoji;
}

export function emotionName(emotionId: EmotionId) {
  return emotionCopy.get(emotionId)?.name() ?? _fallbackName();
}

export function emotionNuance({
  emotionId,
  intensity,
  level,
}: {
  emotionId: EmotionId;
  intensity: number;
  level?: number | undefined;
}) {
  assert(intensity >= 0, 'Emotion nuance intensity must not be negative.');
  assert(intensity <= 1, 'Emotion nuance intensity must not exceed one.');
  const copy = emotionCopy.get(emotionId);
  if (!copy) return _fallbackNuance();
  const resolvedLevel = level ?? Math.min(Math.floor(intensity * copy.nuances.length), copy.nuances.length - 1);
  return copy.nuances[resolvedLevel]?.() ?? copy.nuances[0]?.() ?? _fallbackNuance();
}

export function emotionSummary(selection: LocalizedEmotionSelection) {
  return String(fbs(
    fbs.param('emotionName', emotionName(selection.emotionId))
      + ' · '
      + fbs.param('emotionNuance', emotionNuance(selection)),
    'Localized emotion and nuance in a check-in',
  ));
}

export function emotionStarAccessibility(selection: EmotionSelection | null) {
  if (!selection) return String(fbs('No feeling selected', 'Feeling Pulse accessibility value before a feeling is selected'));
  return emotionSummary(selection);
}

export const emotionStarAccessibilityLabel = () => String(fbs(
  'Feeling Pulse',
  'Accessibility label for the Feeling Pulse control',
));

export const emotionStarAccessibilityHint = () => String(fbs(
  'Swipe up or down to change intensity. Use actions to change the feeling or confirm.',
  'Accessibility hint explaining the Feeling Pulse screen-reader controls',
));

export function savedCheckInCopy(selection: LocalizedEmotionSelection) {
  return String(fbs(
    'Your check-in “'
      + fbs.param('emotionName', emotionName(selection.emotionId))
      + ' · '
      + fbs.param('emotionNuance', emotionNuance(selection))
      + '” was saved only on this device.',
    'Confirmation that the localized check-in was saved locally',
  ));
}

export const optionalNoteAccessibilityLabel = () => String(fbs(
  'Optional note about the feeling',
  'Accessibility label for the reflection note input',
));

export const optionalNotePlaceholder = () => String(fbs(
  'A behavior, a thought, a body sensation, a situation…',
  'Placeholder for the optional reflection note',
));
