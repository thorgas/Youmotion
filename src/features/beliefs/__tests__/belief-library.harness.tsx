import {
  afterEach,
  describe,
  expect,
  mock,
  render,
  resetModules,
  test,
  waitUntil,
} from 'react-native-harness';
import { screen } from '@react-native-harness/ui';
import { createActor, type Actor } from 'xstate';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ScrollView } from 'react-native';

import {
  APP_LOCALES,
  BELIEF_LIBRARY_EVENTS,
  BELIEF_LIBRARY_STATES,
  BELIEF_SYSTEM_IDS,
  CHECK_IN_EVENTS,
  EMOTION_LABEL_MODES,
  NAVIGATION_EVENTS,
  NAVIGATION_STATES,
} from '@/constants';
import {
  CustomBeliefSystemId,
  type BeliefStatement,
} from '@/features/beliefs/domain/belief-statement';
import { appSettingsStore } from '@/app-stores';
import { AppLocaleProvider } from '@/localization/app-locale-provider';
import { appNavigationMachine } from '@/navigation/app-navigation.machine';
import { AppNavigationActorProvider } from '@/navigation/app-navigation.provider';
import { pressLaidOutUntil } from '@/testing/harness-ui';

let actor: Actor<typeof appNavigationMachine> | undefined;

function currentActor() {
  if (!actor) throw new Error('The navigation actor must be started before use.');
  return actor;
}

afterEach(() => {
  actor?.stop();
  actor = undefined;
  resetModules();
});

describe('personal belief library on the device runtime', () => {
  test('opens and cancels the editor through native component interactions', async () => {
    let stage = 'module mock';
    try {
      mock('react-native-keyboard-controller', () => ({
        KeyboardAwareScrollView: ScrollView,
      }));
      stage = 'screen import';
      const libraryModule: typeof import('../ui/belief-library-screen') = require(
        '../ui/belief-library-screen',
      );
      const { BeliefLibraryScreen } = libraryModule;
      stage = 'actor setup';
      const beliefSystemId = CustomBeliefSystemId.make('custom-harness-library');
      appSettingsStore.trigger.hydrated({
        settings: {
          locale: APP_LOCALES.ENGLISH,
          emotionLabelMode: EMOTION_LABEL_MODES.EMOJI,
          onboardingCompleted: true,
        },
      });
      actor = createActor(appNavigationMachine).start();
      await waitUntil(
        () => currentActor().getSnapshot().matches(NAVIGATION_STATES.TABS),
        { timeout: 5_000 },
      );
      currentActor().send({
        type: CHECK_IN_EVENTS.BELIEF_STATEMENTS_HYDRATED,
        statements: [{
          kind: 'custom',
          beliefSystemId,
          harmfulStatement: 'I must never need help.',
          guidingStatement: 'I can ask for support.',
        }] satisfies readonly BeliefStatement[],
      });
      currentActor().send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
      currentActor().send({ type: BELIEF_LIBRARY_EVENTS.OPENED });

      stage = 'render';
      await render(
        <GestureHandlerRootView>
          <AppNavigationActorProvider actor={currentActor()}>
            <AppLocaleProvider>
              <BeliefLibraryScreen />
            </AppLocaleProvider>
          </AppNavigationActorProvider>
        </GestureHandlerRootView>,
      );
      await screen.findByAccessibilityLabel('Back');
      stage = 'edit press';
      await pressLaidOutUntil({
        isComplete: () => currentActor().getSnapshot().matches(
          BELIEF_LIBRARY_STATES.EDITOR,
        ),
        testID: `edit-custom-belief-${beliefSystemId}`,
      });

      expect(currentActor().getSnapshot().matches(BELIEF_LIBRARY_STATES.EDITOR)).toBe(true);
      await screen.findByAccessibilityLabel('Back');
      await screen.findByTestId('belief-library-harmful-draft');
      await screen.findByTestId('belief-library-guiding-draft');
      stage = 'cancel press';
      await pressLaidOutUntil({
        isComplete: () => currentActor().getSnapshot().matches(
          BELIEF_LIBRARY_STATES.LIBRARY,
        ),
        testID: 'belief-library-editor-cancel',
      });

      expect(currentActor().getSnapshot().matches(BELIEF_LIBRARY_STATES.LIBRARY)).toBe(true);
      await screen.findByTestId(`belief-library-row-${beliefSystemId}`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      throw new Error(`Belief library Harness failed during ${stage}: ${message}`, { cause });
    }
  });

  test('lists a suggested belief with reminder controls but no authoring controls', async () => {
    let stage = 'module mock';
    try {
      mock('react-native-keyboard-controller', () => ({
        KeyboardAwareScrollView: ScrollView,
      }));
      stage = 'screen import';
      const libraryModule: typeof import('../ui/belief-library-screen') = require(
        '../ui/belief-library-screen',
      );
      const { BeliefLibraryScreen } = libraryModule;
      stage = 'actor setup';
      appSettingsStore.trigger.hydrated({
        settings: {
          locale: APP_LOCALES.ENGLISH,
          emotionLabelMode: EMOTION_LABEL_MODES.EMOJI,
          onboardingCompleted: true,
        },
      });
      actor = createActor(appNavigationMachine).start();
      await waitUntil(
        () => currentActor().getSnapshot().matches(NAVIGATION_STATES.TABS),
        { timeout: 5_000 },
      );
      currentActor().send({
        type: CHECK_IN_EVENTS.BELIEF_STATEMENTS_HYDRATED,
        statements: [{
          kind: 'built-in',
          beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
          guidingStatement: 'I may pause and still be enough.',
        }] satisfies readonly BeliefStatement[],
      });
      currentActor().send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
      currentActor().send({ type: BELIEF_LIBRARY_EVENTS.OPENED });

      stage = 'render';
      await render(
        <GestureHandlerRootView>
          <AppNavigationActorProvider actor={currentActor()}>
            <AppLocaleProvider>
              <BeliefLibraryScreen />
            </AppLocaleProvider>
          </AppNavigationActorProvider>
        </GestureHandlerRootView>,
      );

      stage = 'suggested row assertions';
      await screen.findByTestId(
        `belief-library-row-${BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING}`,
      );
      await screen.findByTestId(
        `belief-reminder-edit-${BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING}`,
      );
      expect(screen.queryByTestId(
        `edit-custom-belief-${BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING}`,
      )).toBe(null);
      expect(screen.queryByTestId(
        `remove-custom-belief-${BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING}`,
      )).toBe(null);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      throw new Error(`Belief library Harness failed during ${stage}: ${message}`, { cause });
    }
  });
});
