import {
  afterEach,
  describe,
  expect,
  test,
  waitUntil,
} from 'react-native-harness';
import { SurrealRecordId } from 'react-native-surrealdb';
import { createActor, type Actor } from 'xstate';

import {
  BELIEF_STATEMENT_TABLE,
  CHECK_IN_EVENTS,
  CHECK_IN_STATES,
  CHECK_IN_TABLE,
  EMOTION_IDS,
} from '@/constants';
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
const waitOptions = { timeout: 5_000 };

function currentActor() {
  if (!actor) throw new Error('The navigation actor must be started before use.');
  return actor;
}

async function waitForState(state: string) {
  try {
    await waitUntil(
      () => currentActor().getSnapshot().matches(state),
      waitOptions,
    );
  } catch (cause) {
    const current = JSON.stringify(currentActor().getSnapshot().value);
    throw new Error(`Expected ${state}, received ${current}.`, { cause });
  }
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
});

describe('personal belief flow on the device runtime', () => {
  test('persists a custom core belief through the dedicated guiding step', async () => {
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
    await waitForState(CHECK_IN_STATES.BELIEF_SYSTEM);

    currentActor().send({ type: CHECK_IN_EVENTS.BELIEF_SYSTEM_CATALOG_REQUESTED });
    await waitForState(CHECK_IN_STATES.BELIEF_SYSTEM_CATALOG);
    currentActor().send({ type: CHECK_IN_EVENTS.CUSTOM_BELIEF_SYSTEM_REQUESTED });
    await waitForState(CHECK_IN_STATES.BELIEF_SYSTEM_EDITOR);
    currentActor().send({
      type: CHECK_IN_EVENTS.BELIEF_SYSTEM_DRAFT_CHANGED,
      statement: 'I must earn every pause.',
    });
    currentActor().send({ type: CHECK_IN_EVENTS.BELIEF_SYSTEM_EDITOR_CONFIRMED });
    await waitForState(CHECK_IN_STATES.BELIEF_SYSTEM);
    createdBeliefSystemId = currentActor().getSnapshot().context.beliefSystemId
      ?? undefined;
    if (!createdBeliefSystemId) {
      throw new Error('Custom belief persistence must select its stable ID.');
    }

    currentActor().send({ type: CHECK_IN_EVENTS.CONFIRMED });
    await waitForState(CHECK_IN_STATES.GUIDING_BELIEF);
    currentActor().send({
      type: CHECK_IN_EVENTS.GUIDING_BELIEF_SYSTEM_DRAFT_CHANGED,
      statement: 'Rest is part of a full life.',
    });
    currentActor().send({ type: CHECK_IN_EVENTS.GUIDING_BELIEF_CONFIRMED });
    await waitForState(CHECK_IN_STATES.SUCCESS);

    const snapshot = currentActor().getSnapshot();
    createdCheckInId = snapshot.context.saved?.id;
    expect(snapshot.context.beliefStatements).toContainEqual({
      kind: 'custom',
      beliefSystemId: createdBeliefSystemId,
      harmfulStatement: 'I must earn every pause.',
      guidingStatement: 'Rest is part of a full life.',
    });
  });
});
