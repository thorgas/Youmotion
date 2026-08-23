import { Fragment, type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
} from 'react-native';

import { palette, type } from '@/theme';

type ScreenHeadingSize = 'compact' | 'standard';

function ScreenHeadingRoot({ children }: { children: ReactNode }) {
  return <Fragment>{children}</Fragment>;
}

function ScreenHeadingEyebrowText({
  children,
  testID,
}: {
  children: ReactNode;
  testID: string;
}) {
  return <Text style={styles.eyebrow} testID={testID}>{children}</Text>;
}

function ScreenHeadingTitleText({
  children,
  size = 'standard',
  style,
}: {
  children: ReactNode;
  size?: ScreenHeadingSize;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.title, size === 'compact' && styles.titleCompact, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  eyebrow: {
    color: palette.inkMuted,
    fontFamily: type.semibold,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  title: {
    color: palette.ink,
    fontFamily: type.semibold,
    fontSize: 34,
    lineHeight: 40,
    marginTop: 8,
  },
  titleCompact: {
    fontSize: 27,
    lineHeight: 33,
    marginTop: 6,
  },
});

export const ScreenHeading = Object.freeze({
  EyebrowText: ScreenHeadingEyebrowText,
  Root: ScreenHeadingRoot,
  TitleText: ScreenHeadingTitleText,
});
