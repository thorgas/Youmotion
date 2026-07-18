import * as Schema from 'effect/Schema';
import { setup } from 'xstate';

import {
  SPLASH_EVENTS,
  SPLASH_LOGO_HOLD_DURATION,
  SPLASH_LOGO_REVEAL_DURATION,
  SPLASH_OVERLAY_FADE_DURATION,
  SPLASH_STATES,
} from '@/constants';
import {
  hideNativeSplash,
  holdNativeSplash,
} from '../infrastructure/splash-screen';

const EmptyEventSchema = Schema.standardSchemaV1(Schema.Struct({}));
const _releaseNativeSplash = () => hideNativeSplash();

holdNativeSplash();

export const animatedSplashMachine = setup({
  states: {
    [SPLASH_STATES.WAITING_FOR_LAYOUT]: {},
    [SPLASH_STATES.WAITING_FOR_LOGO]: {},
    [SPLASH_STATES.WAITING_FOR_REDUCED_MOTION_LOGO]: {},
    [SPLASH_STATES.WAITING_FOR_LAYOUT_AFTER_LOGO]: {},
    [SPLASH_STATES.REVEALING]: {},
    [SPLASH_STATES.FADING]: {},
    [SPLASH_STATES.COMPLETE]: {},
  },
  schemas: {
    events: {
      [SPLASH_EVENTS.LAYOUT_READY]: EmptyEventSchema,
      [SPLASH_EVENTS.LOGO_READY]: EmptyEventSchema,
      [SPLASH_EVENTS.REDUCED_MOTION_LAYOUT_READY]: EmptyEventSchema,
    },
  },
}).createMachine({
  id: 'animatedSplash',
  initial: SPLASH_STATES.WAITING_FOR_LAYOUT,
  states: {
    [SPLASH_STATES.WAITING_FOR_LAYOUT]: {
      on: {
        [SPLASH_EVENTS.LAYOUT_READY]: {
          target: SPLASH_STATES.WAITING_FOR_LOGO,
        },
        [SPLASH_EVENTS.LOGO_READY]: {
          target: SPLASH_STATES.WAITING_FOR_LAYOUT_AFTER_LOGO,
        },
        [SPLASH_EVENTS.REDUCED_MOTION_LAYOUT_READY]: {
          target: SPLASH_STATES.WAITING_FOR_REDUCED_MOTION_LOGO,
        },
      },
    },
    [SPLASH_STATES.WAITING_FOR_LOGO]: {
      on: {
        [SPLASH_EVENTS.LOGO_READY]: (_args, enq) => {
          enq(_releaseNativeSplash);
          return { target: SPLASH_STATES.REVEALING };
        },
      },
    },
    [SPLASH_STATES.WAITING_FOR_REDUCED_MOTION_LOGO]: {
      on: {
        [SPLASH_EVENTS.LOGO_READY]: (_args, enq) => {
          enq(_releaseNativeSplash);
          return { target: SPLASH_STATES.FADING };
        },
      },
    },
    [SPLASH_STATES.WAITING_FOR_LAYOUT_AFTER_LOGO]: {
      on: {
        [SPLASH_EVENTS.LAYOUT_READY]: (_args, enq) => {
          enq(_releaseNativeSplash);
          return { target: SPLASH_STATES.REVEALING };
        },
        [SPLASH_EVENTS.REDUCED_MOTION_LAYOUT_READY]: (_args, enq) => {
          enq(_releaseNativeSplash);
          return { target: SPLASH_STATES.FADING };
        },
      },
    },
    [SPLASH_STATES.REVEALING]: {
      after: {
        [SPLASH_LOGO_REVEAL_DURATION + SPLASH_LOGO_HOLD_DURATION]: {
          target: SPLASH_STATES.FADING,
        },
      },
    },
    [SPLASH_STATES.FADING]: {
      after: {
        [SPLASH_OVERLAY_FADE_DURATION]: {
          target: SPLASH_STATES.COMPLETE,
        },
      },
    },
    [SPLASH_STATES.COMPLETE]: {
      type: 'final',
    },
  },
});
