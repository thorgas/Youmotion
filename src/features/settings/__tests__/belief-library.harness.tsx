import {
  afterEach,
  describe,
  expect,
  mock,
  render,
  resetModules,
  test,
} from 'react-native-harness';
import { screen, userEvent } from '@react-native-harness/ui';
import { createActor, type Actor } from 'xstate';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ScrollView } from 'react-native';

import {
  APP_LOCALES,
  BELIEF_LIBRARY_EVENTS,
  BELIEF_LIBRARY_STATES,
  CHECK_IN_EVENTS,
  EMOTION_LABEL_MODES,
  NAVIGATION_EVENTS,
} from '@/constants';
import {
  CustomBeliefSystemId,
  type BeliefStatement,
} from '@/features/check-in/domain/belief-statement';
import { appSettingsStore } from '@/features/settings/application/app-settings.store';
import { AppLocaleProvider } from '@/localization/app-locale-provider';
import { appNavigationMachine } from '@/navigation/app-navigation.machine';

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
      mock('@/navigation/app-navigation.provider', () => ({
        useAppNavigationActor: currentActor,
      }));
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
        },
      });
      actor = createActor(appNavigationMachine).start();
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
          <AppLocaleProvider>
            <BeliefLibraryScreen />
          </AppLocaleProvider>
        </GestureHandlerRootView>,
      );
      stage = 'edit press';
      await userEvent.press(await screen.findByTestId(`edit-custom-belief-${beliefSystemId}`));

      expect(currentActor().getSnapshot().matches(BELIEF_LIBRARY_STATES.EDITOR)).toBe(true);
      await screen.findByTestId('belief-library-harmful-draft');
      await screen.findByTestId('belief-library-guiding-draft');
      stage = 'cancel press';
      await userEvent.press(await screen.findByTestId('belief-library-editor-cancel'));

      expect(currentActor().getSnapshot().matches(BELIEF_LIBRARY_STATES.LIBRARY)).toBe(true);
      await screen.findByTestId(`belief-library-row-${beliefSystemId}`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      throw new Error(`Belief library Harness failed during ${stage}: ${message}`, { cause });
    }
  });
});
