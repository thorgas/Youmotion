import { EMOTION_IDS } from '@/constants';

import type { CheckIn, EmotionId, EmotionSelection } from './check-in';
import assert from 'tiny-invariant';

export type Emotion = Readonly<{
  id: EmotionId;
  color: string;
  wash: string;
  nuanceCount: number;
}>;

export const emotions: readonly Emotion[] = [
  {
    id: EMOTION_IDS.JOY,
    color: '#E7AD32',
    wash: '#F5D88E',
    nuanceCount: 7,
  },
  {
    id: EMOTION_IDS.LOVE,
    color: '#C96E72',
    wash: '#E7B4B2',
    nuanceCount: 6,
  },
  {
    id: EMOTION_IDS.SHAME,
    color: '#A97688',
    wash: '#D6B3BF',
    nuanceCount: 7,
  },
  {
    id: EMOTION_IDS.DISGUST,
    color: '#719A7B',
    wash: '#B7CEB5',
    nuanceCount: 5,
  },
  {
    id: EMOTION_IDS.SADNESS,
    color: '#6689A8',
    wash: '#AFC4D4',
    nuanceCount: 6,
  },
  {
    id: EMOTION_IDS.ANGER,
    color: '#B75C45',
    wash: '#DDA692',
    nuanceCount: 7,
  },
  {
    id: EMOTION_IDS.FEAR,
    color: '#766A9A',
    wash: '#B9B2D1',
    nuanceCount: 8,
  },
];

export function selectionForCheckIn(checkIn: CheckIn): EmotionSelection {
  assert(checkIn.intensity >= 0, 'Check-in intensity must not be negative.');
  assert(checkIn.intensity <= 1, 'Check-in intensity must not exceed one.');
  const emotion = emotions.find((candidate) => candidate.id === checkIn.emotionId);
  if (!emotion) throw new Error('A decoded check-in must reference a known emotion.');

  return {
    emotionId: checkIn.emotionId,
    intensity: checkIn.intensity,
    level: Math.min(
      checkIn.level ?? Math.floor(checkIn.intensity * emotion.nuanceCount),
      emotion.nuanceCount - 1,
    ),
    color: emotion.color,
  };
}
