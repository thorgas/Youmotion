import {
  createAnimatedComponent,
  Easing,
  Extrapolation,
  interpolate,
  ReduceMotion,
  type DerivedValue,
  useAnimatedProps,
  useDerivedValue,
  useReducedMotion,
  withTiming,
} from 'react-native-reanimated';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, Image as SvgImage, Mask, Path } from 'react-native-svg';
import assert from 'tiny-invariant';

import {
  SPLASH_LOGO_REVEAL_DURATION,
  SPLASH_LOGO_SIZE,
} from '@/constants';
import appLogo from '@/assets/images/app-logo-transparent.png';

type YoumotionLogoRevealProps = {
  active: boolean;
  onReady: () => void;
};

type TracePropsOptions = {
  progress: DerivedValue<0 | 1>;
  traceLength: number;
  start: number;
  end: number;
};

const HEAD_PATH = 'M381 426C356 395 349 364 362 330C373 301 394 272 404 235C420 176 400 115 348 79C310 53 264 52 225 65C171 83 123 137 123 193C123 220 108 239 93 255C89 260 92 265 103 268C115 271 120 276 114 286C110 292 113 297 119 299C112 304 112 309 119 313C126 316 126 322 121 329C115 338 119 349 130 354C145 361 172 356 190 357C208 358 218 371 219 389L217 430';
const FACE_PATH = 'M143 228C151 239 165 240 176 230M118 299C123 302 130 302 135 299';
const BLUE_ARROW_PATH = 'M220 113L204 109M220 113L215 130M218 114C193 130 176 153 177 177C178 196 191 202 221 204';
const PURPLE_ARROW_PATH = 'M222 204C222 173 244 142 276 121C299 106 320 111 323 124C326 139 310 153 294 166C280 177 275 190 283 198C295 211 329 205 350 193C360 187 366 177 369 167M369 167L357 171M369 167L372 181';
const CENTER_PATH = 'M222 204C225 225 240 239 235 256C231 271 216 278 205 289C194 301 198 311 211 315C224 319 244 313 256 302';
const RED_ARROW_PATH = 'M256 302C272 287 282 268 299 260C315 252 329 269 344 260C352 255 357 250 361 241M361 241L349 245M361 241L363 254';
const DOWN_ARROW_PATH = 'M256 302C255 322 268 333 290 336C317 339 332 349 334 371L334 388M334 388L324 376M334 388L344 378';
const AnimatedPath = createAnimatedComponent(Path);

function assertWorkletInvariant({ condition, message }: {
  condition: boolean;
  message: string;
}) {
  'worklet';
  if (!condition) throw new Error(message);
}

function useTraceProps({
  progress,
  traceLength,
  start,
  end,
}: TracePropsOptions) {
  return useAnimatedProps(() => ({
    strokeDashoffset: interpolate(
      progress.value,
      [start, end],
      [traceLength, 0],
      Extrapolation.CLAMP,
    ),
  }), [end, progress, start, traceLength]);
}

export function YoumotionLogoReveal({
  active,
  onReady,
}: YoumotionLogoRevealProps) {
  assert(SPLASH_LOGO_SIZE > 0, 'Splash logo size must be positive.');
  assert(SPLASH_LOGO_REVEAL_DURATION > 0, 'Splash reveal duration must be positive.');
  const reduceMotion = useReducedMotion();
  const progress = useDerivedValue(
    () => {
      assertWorkletInvariant({
        condition: SPLASH_LOGO_SIZE > 0,
        message: 'Animated splash logo size must be positive.',
      });
      assertWorkletInvariant({
        condition: SPLASH_LOGO_REVEAL_DURATION > 0,
        message: 'Animated splash reveal duration must be positive.',
      });
      if (!active) return 0;
      if (reduceMotion) return 1;
      return withTiming(1, {
        duration: SPLASH_LOGO_REVEAL_DURATION,
        easing: Easing.bezier(0.45, 0, 0.55, 1),
        reduceMotion: ReduceMotion.System,
      });
    },
    [active, reduceMotion],
  );
  const headProps = useTraceProps({
    progress,
    traceLength: 900,
    start: 0,
    end: 0.78,
  });
  const faceProps = useTraceProps({
    progress,
    traceLength: 100,
    start: 0.12,
    end: 0.5,
  });
  const blueArrowProps = useTraceProps({
    progress,
    traceLength: 220,
    start: 0.05,
    end: 0.55,
  });
  const purpleArrowProps = useTraceProps({
    progress,
    traceLength: 360,
    start: 0.16,
    end: 0.76,
  });
  const centerProps = useTraceProps({
    progress,
    traceLength: 260,
    start: 0.3,
    end: 0.84,
  });
  const redArrowProps = useTraceProps({
    progress,
    traceLength: 220,
    start: 0.42,
    end: 0.94,
  });
  const downArrowProps = useTraceProps({
    progress,
    traceLength: 210,
    start: 0.5,
    end: 1,
  });

  return (
    <View
      accessible={false}
      style={styles.logo}
      testID="youmotion-splash-logo">
      <Image
        onLoad={onReady}
        source={appLogo}
        style={styles.baseLogo}
        testID="youmotion-splash-logo-base"
      />
      <Svg
        height={SPLASH_LOGO_SIZE}
        style={styles.revealLogo}
        viewBox="0 0 512 512"
        width={SPLASH_LOGO_SIZE}>
        <Defs>
          <Mask id="youmotion-splash-logo-reveal">
            <AnimatedPath
              animatedProps={headProps}
              d={HEAD_PATH}
              fill="none"
              stroke="white"
              strokeDasharray={900}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={30}
            />
            <AnimatedPath
              animatedProps={faceProps}
              d={FACE_PATH}
              fill="none"
              stroke="white"
              strokeDasharray={100}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={26}
            />
            <AnimatedPath
              animatedProps={blueArrowProps}
              d={BLUE_ARROW_PATH}
              fill="none"
              stroke="white"
              strokeDasharray={220}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={30}
            />
            <AnimatedPath
              animatedProps={purpleArrowProps}
              d={PURPLE_ARROW_PATH}
              fill="none"
              stroke="white"
              strokeDasharray={360}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={30}
            />
            <AnimatedPath
              animatedProps={centerProps}
              d={CENTER_PATH}
              fill="none"
              stroke="white"
              strokeDasharray={260}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={32}
            />
            <AnimatedPath
              animatedProps={redArrowProps}
              d={RED_ARROW_PATH}
              fill="none"
              stroke="white"
              strokeDasharray={220}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={30}
            />
            <AnimatedPath
              animatedProps={downArrowProps}
              d={DOWN_ARROW_PATH}
              fill="none"
              stroke="white"
              strokeDasharray={210}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={30}
            />
          </Mask>
        </Defs>
        <SvgImage
          height={512}
          href={appLogo}
          mask="url(#youmotion-splash-logo-reveal)"
          preserveAspectRatio="xMidYMid meet"
          width={512}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    height: SPLASH_LOGO_SIZE,
    width: SPLASH_LOGO_SIZE,
  },
  baseLogo: {
    height: SPLASH_LOGO_SIZE,
    opacity: 0.3,
    width: SPLASH_LOGO_SIZE,
  },
  revealLogo: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
