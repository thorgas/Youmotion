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
import { screen, userEvent } from '@react-native-harness/ui';
import { SurrealRecordId } from 'react-native-surrealdb';
import { createActor, type Actor } from 'xstate';

import {
  BELIEF_STATEMENT_TABLE,
  CHECK_IN_EVENTS,
  CHECK_IN_STATES,
  CHECK_IN_TABLE,
  EMOTION_IDS,
} from '@/constants';
import { AppLocaleProvider } from '@/localization/app-locale-provider';
import { appNavigationMachine } from '@/navigation/app-navigation.machine';
import type { BeliefSystemId } from '../domain/belief-statement';
import type {
  CheckInId,
  EmotionSelection,
} from '../domain/check-in';
import { getDatabase } from '../infrastructure/surrealdb.database';

let actor: Actor<typeof appNavigationMachine> | undefined;
let createdBeliefSystemId: BeliefSystemId | undefined;
let createdCheckInId: CheckInId | undefined;

function currentActor() {
  if (!actor) throw new Error('The navigation actor must be started before rendering.');
  return actor;
}

afterEach(async () => {
  actor?.stop();
  const database = await getDatabase();
  if (createdBeliefSystemId) {
    await database.query('DELETE $record', {
      record: new SurrealRecordId(
        `${BELIEF_STATEMENT_TABLE}:${createdBeliefSystemId}`,
      ),
    });
  }
  if (createdCheckInId) {
    await database.query('DELETE $record', {
      record: new SurrealRecordId(`${CHECK_IN_TABLE}:${createdCheckInId}`),
    });
  }
  actor = undefined;
  createdBeliefSystemId = undefined;
  createdCheckInId = undefined;
  resetModules();
});

describe('personal belief flow on the device runtime', () => {
  test('creates a core belief and shows its guiding belief after check-in', async () => {
    mock('@/navigation/app-navigation.provider', () => ({
      useAppNavigationActor: currentActor,
    }));
    const { ReflectionScreen } = await import('../ui/reflection-screen');
    const { SuccessScreen } = await import('../ui/success-screen');
    const selection = {
      emotionId: EMOTION_IDS.JOY,
      intensity: 0.5,
      level: 2,
      color: '#E7AD32',
    } satisfies EmotionSelection;
    actor = createActor(appNavigationMachine).start();
    currentActor().send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    currentActor().send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    currentActor().send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    currentActor().send({ type: CHECK_IN_EVENTS.CONFIRMED });
    await waitUntil(
      () => currentActor().getSnapshot().matches(CHECK_IN_STATES.BELIEF_SYSTEM),
    );

    const rendered = await render(
      <AppLocaleProvider><ReflectionScreen /></AppLocaleProvider>,
    );
    await userEvent.press(await screen.findByTestId('belief-system-browse'));
    await userEvent.press(await screen.findByTestId('create-custom-belief'));
    await userEvent.type(
      await screen.findByTestId('belief-system-draft'),
      'I must earn every pause.',
    );
    await userEvent.type(
      await screen.findByTestId('guiding-belief-draft'),
      'Rest is part of a full life.',
    );
    await userEvent.press(await screen.findByTestId('belief-system-editor-save'));
    await waitUntil(
      () => currentActor().getSnapshot().matches(CHECK_IN_STATES.BELIEF_SYSTEM),
    );
    createdBeliefSystemId = currentActor().getSnapshot().context.beliefSystemId
      ?? undefined;

    await userEvent.press(await screen.findByTestId('belief-system-finish'));
    await waitUntil(
      () => currentActor().getSnapshot().matches(CHECK_IN_STATES.SUCCESS),
    );
    createdCheckInId = currentActor().getSnapshot().context.saved?.id;
    await rendered.rerender(
      <AppLocaleProvider><SuccessScreen /></AppLocaleProvider>,
    );

    expect(await screen.findByTestId('success-guiding-belief')).toHaveTextContent(
      'Rest is part of a full life.',
    );
  });
});
