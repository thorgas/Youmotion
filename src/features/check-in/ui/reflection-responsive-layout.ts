const REFERENCE_PHONE_WIDTH = 390;
const MINIMUM_PHONE_SCALE = 0.9;
const COMPACT_USABLE_HEIGHT = 700;

const clamp = ({ maximum, minimum, value }: {
  maximum: number;
  minimum: number;
  value: number;
}) => Math.min(maximum, Math.max(minimum, value));

export function reflectionResponsiveLayout({
  height,
  keyboardHeight,
  keyboardVisible,
  platform,
  width,
}: {
  height: number;
  keyboardHeight: number;
  keyboardVisible: boolean;
  platform: string;
  width: number;
}) {
  const widthScale = clamp({
    maximum: 1,
    minimum: MINIMUM_PHONE_SCALE,
    value: width / REFERENCE_PHONE_WIDTH,
  });
  const usableHeight = height - (keyboardVisible ? keyboardHeight : 0);
  const compact = platform === 'android'
    && keyboardVisible
    && usableHeight < COMPACT_USABLE_HEIGHT;

  return {
    bottomOffset: compact ? 12 : 82,
    cardMarginTop: compact ? 14 : 28,
    cardPadding: compact ? 16 : 20,
    compact,
    contentHorizontalPadding: Math.round(22 * widthScale),
    contentTopPadding: compact ? 0 : 8,
    inputMinHeight: compact ? 112 : 150,
    keyboardAwareScrollEnabled: !compact,
    selectionMarginBottom: compact ? 12 : 18,
    titleFontSize: Math.round((compact ? 28 : 34) * widthScale),
    titleLineHeight: Math.round((compact ? 32 : 40) * widthScale),
  };
}
