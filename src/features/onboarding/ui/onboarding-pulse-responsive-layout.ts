const REFERENCE_PHONE_HEIGHT = 900;
const MINIMUM_STAR_SIZE = 248;
const STAR_HORIZONTAL_INSET = 32;
const MAXIMUM_STAR_SIZE = 390;
const HEIGHT_DEFICIT_RATIO = 2;
const FONT_SCALE_INSET = 160;

const clamp = ({ maximum, minimum, value }: {
  maximum: number;
  minimum: number;
  value: number;
}) => Math.min(maximum, Math.max(minimum, value));

export function onboardingPulseResponsiveLayout({
  fontScale,
  height,
  width,
}: {
  fontScale: number;
  height: number;
  width: number;
}) {
  const fullStarSize = Math.min(
    width - STAR_HORIZONTAL_INSET,
    MAXIMUM_STAR_SIZE,
  );
  const maximumContentInset = Math.max(
    0,
    fullStarSize - MINIMUM_STAR_SIZE,
  );
  const heightContentInset = Math.max(
    0,
    REFERENCE_PHONE_HEIGHT - height,
  ) * HEIGHT_DEFICIT_RATIO;
  const fontContentInset = Math.max(0, fontScale - 1) * FONT_SCALE_INSET;
  const starContentInset = Math.round(clamp({
    maximum: maximumContentInset,
    minimum: 0,
    value: heightContentInset + fontContentInset,
  }));

  return {
    compact: starContentInset > 0,
    starContentInset,
  };
}
