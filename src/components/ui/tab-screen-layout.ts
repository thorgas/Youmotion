import type { TextStyle, ViewStyle } from 'react-native';

import { palette, type } from '@/features/check-in/ui/theme';

export const tabScreenContentStyle = {
  width: '100%',
  maxWidth: 520,
  alignSelf: 'center',
  paddingHorizontal: 22,
  paddingTop: 18,
  paddingBottom: 48,
} satisfies ViewStyle;

export const tabScreenEyebrowStyle = {
  fontFamily: type.semibold,
  color: palette.inkMuted,
  fontSize: 11,
  letterSpacing: 1.4,
} satisfies TextStyle;

export const tabScreenTitleStyle = {
  fontFamily: type.semibold,
  color: palette.ink,
  fontSize: 34,
  lineHeight: 40,
  marginTop: 8,
} satisfies TextStyle;
