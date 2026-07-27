import { onboardingPulseResponsiveLayout } from '../ui/onboarding-pulse-responsive-layout';

describe('onboarding Pulse responsive layout', () => {
  it('recovers vertical space on the photographed compact phone size', () => {
    expect(onboardingPulseResponsiveLayout({
      fontScale: 1,
      height: 852,
      width: 393,
    })).toEqual({
      compact: true,
      starContentInset: 96,
    });
  });

  it('preserves the full-size Pulse on a tall phone', () => {
    expect(onboardingPulseResponsiveLayout({
      fontScale: 1,
      height: 932,
      width: 430,
    })).toEqual({
      compact: false,
      starContentInset: 0,
    });
  });

  it('keeps a usable minimum star size with enlarged text on a short phone', () => {
    const layout = onboardingPulseResponsiveLayout({
      fontScale: 1.3,
      height: 667,
      width: 375,
    });

    expect(layout).toEqual({
      compact: true,
      starContentInset: 95,
    });
    expect(375 - 32 - layout.starContentInset).toBe(248);
  });
});
