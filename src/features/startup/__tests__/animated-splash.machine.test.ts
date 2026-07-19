import * as SplashScreen from 'expo-splash-screen';
import { createActor } from 'xstate';

import {
  SPLASH_EVENTS,
  SPLASH_LOGO_REVEAL_DURATION,
  SPLASH_OVERLAY_FADE_DURATION,
  SPLASH_OVERLAY_VISIBLE_DURATION,
  SPLASH_STATES,
} from '@/constants';
import { animatedSplashMachine } from '../application/animated-splash.machine';

describe('animated splash model', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(SplashScreen.hide).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('holds the native splash as soon as the model module loads', () => {
    expect(SplashScreen.preventAutoHideAsync).toHaveBeenCalled();
  });

  it('reveals, fades, and completes after layout and logo are ready', () => {
    const actor = createActor(animatedSplashMachine).start();

    actor.send({ type: SPLASH_EVENTS.LAYOUT_READY });
    expect(SplashScreen.hide).not.toHaveBeenCalled();
    expect(actor.getSnapshot().matches(SPLASH_STATES.WAITING_FOR_LOGO)).toBe(true);

    actor.send({ type: SPLASH_EVENTS.LOGO_READY });
    expect(SplashScreen.hide).toHaveBeenCalledTimes(1);
    expect(actor.getSnapshot().matches(SPLASH_STATES.REVEALING)).toBe(true);

    expect(SPLASH_OVERLAY_VISIBLE_DURATION).toBeGreaterThanOrEqual(
      SPLASH_LOGO_REVEAL_DURATION,
    );
    expect(SPLASH_OVERLAY_VISIBLE_DURATION + SPLASH_OVERLAY_FADE_DURATION).toBeLessThanOrEqual(
      900,
    );
    jest.advanceTimersByTime(SPLASH_OVERLAY_VISIBLE_DURATION);
    expect(actor.getSnapshot().matches(SPLASH_STATES.FADING)).toBe(true);

    jest.advanceTimersByTime(SPLASH_OVERLAY_FADE_DURATION);
    expect(actor.getSnapshot().matches(SPLASH_STATES.COMPLETE)).toBe(true);
  });

  it('uses only the opacity handoff when reduced motion is requested', () => {
    const actor = createActor(animatedSplashMachine).start();

    actor.send({ type: SPLASH_EVENTS.LOGO_READY });
    actor.send({ type: SPLASH_EVENTS.REDUCED_MOTION_LAYOUT_READY });

    expect(actor.getSnapshot().matches(SPLASH_STATES.FADING)).toBe(true);
    jest.advanceTimersByTime(SPLASH_OVERLAY_FADE_DURATION);
    expect(actor.getSnapshot().matches(SPLASH_STATES.COMPLETE)).toBe(true);
  });

  it('keeps the native splash visible while a reduced-motion logo loads', () => {
    const actor = createActor(animatedSplashMachine).start();

    actor.send({ type: SPLASH_EVENTS.REDUCED_MOTION_LAYOUT_READY });
    expect(SplashScreen.hide).not.toHaveBeenCalled();
    expect(
      actor.getSnapshot().matches(SPLASH_STATES.WAITING_FOR_REDUCED_MOTION_LOGO),
    ).toBe(true);

    actor.send({ type: SPLASH_EVENTS.LOGO_READY });
    expect(SplashScreen.hide).toHaveBeenCalledTimes(1);
    expect(actor.getSnapshot().matches(SPLASH_STATES.FADING)).toBe(true);
  });
});
