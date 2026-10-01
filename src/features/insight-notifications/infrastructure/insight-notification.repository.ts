import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Schema from 'effect/Schema';
import * as Effect from 'effect/Effect';
import { INSIGHT_NOTIFICATION_STORAGE_KEY } from '@/constants';
import { InsightNotificationStateSchema, initialInsightNotificationState, type InsightNotificationState } from '../domain/insight-notification';

export class InsightNotificationStorageError extends Schema.TaggedError<InsightNotificationStorageError>()(
  'InsightNotificationStorageError', { cause: Schema.Defect },
) {}
const StoredStateSchema = Schema.parseJson(InsightNotificationStateSchema);
export async function loadInsightNotificationState() {
  return Effect.runPromise(Effect.tryPromise({
    try: () => AsyncStorage.getItem(INSIGHT_NOTIFICATION_STORAGE_KEY),
    catch: (cause) => InsightNotificationStorageError.make({ cause }),
  }).pipe(Effect.flatMap((value) => value === null
    ? Effect.succeed(initialInsightNotificationState())
    : Schema.decode(StoredStateSchema)(value))));
}
export async function persistInsightNotificationState(state: InsightNotificationState) {
  const encoded = await Effect.runPromise(Schema.encode(StoredStateSchema)(state));
  return Effect.runPromise(Effect.tryPromise({
    try: () => AsyncStorage.setItem(INSIGHT_NOTIFICATION_STORAGE_KEY, encoded),
    catch: (cause) => InsightNotificationStorageError.make({ cause }),
  }));
}
