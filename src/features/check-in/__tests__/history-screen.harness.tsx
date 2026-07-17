import { screen, userEvent } from '@react-native-harness/ui';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import {
  afterEach,
  describe,
  expect,
  fn,
  mock,
  render,
  resetModules,
  test,
} from 'react-native-harness';

import { CHECK_IN_EVENTS, EMOTION_IDS } from '@/constants';
import { AppLocaleProvider } from '@/localization/app-locale-provider';
import { checkInHistoryStore } from '../application/check-in-history.store';
import { CheckInSchema } from '../domain/check-in';

const encodedEntry: unknown = {
  id: 'harness-edit-check-in',
  createdAt: '2026-07-16T12:00:00.000Z',
  emotionId: EMOTION_IDS.JOY,
  intensity: 0.5,
  level: 2,
  note: 'Before',
};
const send = fn();

describe('History screen editing', () => {
  afterEach(() => {
    resetModules();
  });

  test('sends the selected captured moment to the navigation actor when pressed', async () => {
    const entry = await Effect.runPromise(Schema.decodeUnknown(CheckInSchema)(encodedEntry));
    checkInHistoryStore.trigger.hydrated({ entries: [entry] });
    send.mockClear();
    mock('@/navigation/app-navigation.provider', () => ({
      useAppNavigationActor: () => ({ send }),
    }));
    const { HistoryScreen } = await import('../ui/history-screen');
    await render(<AppLocaleProvider><HistoryScreen /></AppLocaleProvider>);

    await userEvent.press(await screen.findByTestId(`history-moment-${entry.id}`));

    expect(send).toHaveBeenCalledWith({
      type: CHECK_IN_EVENTS.EDIT_REQUESTED,
      entry,
    });
  });
});
