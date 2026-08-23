import { APP_TYPE } from '@/constants';

export const palette = Object.freeze({
  paper: '#F9F7F4',
  paperRaised: '#FCFBF9',
  ink: '#2A2722',
  inkMuted: '#6F6760',
  releasedInk: '#6F6760',
  hairline: 'rgba(42, 39, 34, 0.12)',
  whiteWash: 'rgba(255, 255, 255, 0.72)',
  moss: '#5E6F61',
  danger: '#9D4E42',
  selectionWash: '#EDF0EB',
});

export const surfaceColors = Object.freeze({
  belief: '#F0EAE0',
  danger: '#FBF4F1',
  dangerNotice: '#F5E8E5',
  field: '#F4F0E9',
  input: '#F3EEE6',
  mossWash: '#F0F2ED',
  navigation: '#FBF8F2',
  subtle: '#F2EFEA',
});

export const borderColors = Object.freeze({
  dangerSoft: 'rgba(157, 78, 66, 0.20)',
  moss18: 'rgba(94, 111, 97, 0.18)',
  moss20: 'rgba(94, 111, 97, 0.20)',
  moss22: 'rgba(94, 111, 97, 0.22)',
  moss24: 'rgba(94, 111, 97, 0.24)',
  moss28: 'rgba(94, 111, 97, 0.28)',
});

export const overlayColors = Object.freeze({
  dialog: 'rgba(24, 22, 19, 0.42)',
  feedback: 'rgba(42, 39, 34, 0.36)',
  picker: 'rgba(20, 23, 20, 0.34)',
});

export const chartColors = Object.freeze({
  axis: 'rgba(42, 39, 34, 0.16)',
  grid: 'rgba(42, 39, 34, 0.10)',
  mossArea: 'rgba(94, 111, 97, 0.24)',
  mossGradientEnd: 'rgba(94, 111, 97, 0.06)',
  mossGradientStart: 'rgba(94, 111, 97, 0.02)',
});

export const interactionColors = Object.freeze({
  inkWash: 'rgba(42, 39, 34, 0.06)',
  mossWash: 'rgba(94, 111, 97, 0.09)',
  today: 'rgba(94, 111, 97, 0.10)',
});

export const navigationColors = Object.freeze({
  active: '#292722',
});

export const actionColors = Object.freeze({
  destructiveBackground: '#8A3D35',
  primaryBackground: palette.ink,
  primaryForeground: '#FFFFFF',
});

export const type = APP_TYPE;

export const textSize = Object.freeze({
  caption: 11,
  metadata: 12,
  label: 14,
  emphasis: 16,
  section: 20,
});
