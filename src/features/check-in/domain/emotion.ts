import { EMOTION_IDS } from '@/constants';

import type { EmotionId } from './check-in';

export type { EmotionSelection } from './check-in';

export type Emotion = Readonly<{
  id: EmotionId;
  name: string;
  color: string;
  wash: string;
  nuances: readonly string[];
}>;

export const emotions: readonly Emotion[] = [
  {
    id: EMOTION_IDS.JOY,
    name: 'Freude',
    color: '#E7AD32',
    wash: '#F5D88E',
    nuances: ['Vergnügen', 'Lust', 'Fröhlichkeit', 'Optimismus', 'Begeisterung', 'Zufriedenheit', 'Glück'],
  },
  {
    id: EMOTION_IDS.LOVE,
    name: 'Liebe',
    color: '#C96E72',
    wash: '#E7B4B2',
    nuances: ['Sympathie', 'Zuneigung', 'Vertrautheit', 'Bewunderung', 'Leidenschaft', 'Begehren'],
  },
  {
    id: EMOTION_IDS.SHAME,
    name: 'Scham',
    color: '#A97688',
    wash: '#D6B3BF',
    nuances: ['Verwirrung', 'Befangenheit', 'Peinlichkeit', 'Demütigung', 'Bedauern', 'Reue', 'Schuldgefühl'],
  },
  {
    id: EMOTION_IDS.DISGUST,
    name: 'Ekel',
    color: '#719A7B',
    wash: '#B7CEB5',
    nuances: ['Abneigung', 'Widerwille', 'Verachtung', 'Abscheu', 'Abgestoßenheit'],
  },
  {
    id: EMOTION_IDS.SADNESS,
    name: 'Trauer',
    color: '#6689A8',
    wash: '#AFC4D4',
    nuances: ['Bedrücktheit', 'Kummer', 'Enttäuschung', 'Hoffnungslosigkeit', 'Einsamkeit', 'Verzweiflung'],
  },
  {
    id: EMOTION_IDS.ANGER,
    name: 'Wut',
    color: '#B75C45',
    wash: '#DDA692',
    nuances: ['Verstimmung', 'Genervtheit', 'Missmut', 'Ärger', 'Groll', 'Zorn', 'Aggression'],
  },
  {
    id: EMOTION_IDS.FEAR,
    name: 'Furcht',
    color: '#766A9A',
    wash: '#B9B2D1',
    nuances: ['Unsicherheit', 'Befürchtung', 'Besorgnis', 'Sorge', 'Hilflosigkeit', 'Schrecken', 'Grauen', 'Panik'],
  },
];
