import assert from '@/assert';
import * as Notifications from 'expo-notifications';
import * as Schema from 'effect/Schema';
import * as Effect from 'effect/Effect';
import { APP_LOCALES, INSIGHT_NOTIFICATION_OWNER } from '@/constants';
import type { AppLocale } from '@/localization/app-locale';
import { InsightBatchSchema, InsightCandidateSchema, type InsightBatch } from '../domain/insight-notification';

export const InsightNotificationPayloadSchema = Schema.Struct({
  owner: Schema.Literal(INSIGHT_NOTIFICATION_OWNER),
  batchId: Schema.String.pipe(Schema.minLength(1)),
  target: InsightCandidateSchema,
});
export async function cancelInsightNotifications() {
  const requests = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(requests.filter(({ content }) => content.data?.['owner'] === INSIGHT_NOTIFICATION_OWNER)
    .map(({ identifier }) => Notifications.cancelScheduledNotificationAsync(identifier)));
}
export async function reconcileInsightBatch({ batch, locale }: { batch: InsightBatch | null; locale: AppLocale }) {
  assert(batch === null || Schema.is(InsightBatchSchema)(batch), 'Insight scheduling requires a valid persisted batch');
  assert(Object.values(APP_LOCALES).includes(locale), 'Insight scheduling requires a supported locale');
  const requests = await Notifications.getAllScheduledNotificationsAsync();
  const own = requests.filter(({ content }) => content.data?.['owner'] === INSIGHT_NOTIFICATION_OWNER);
  const expected = batch ? await Effect.runPromise(Schema.encode(Schema.parseJson(Schema.Struct({
    batch: Schema.String, fireAt: Schema.String, locale: Schema.String,
    candidates: Schema.Array(InsightCandidateSchema),
  })))({ batch: batch.id, fireAt: batch.fireAt, locale, candidates: batch.candidates })) : '';
  const matching = own.find(({ identifier, content }) => identifier === batch?.id && content.data?.['fingerprint'] === expected);
  await Promise.all(own.filter((request) => request !== matching).map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
  if (!batch || matching) return;
  const target = batch.candidates[0];
  if (!target) return;
  await Notifications.scheduleNotificationAsync({
    identifier: batch.id,
    content: {
      title: locale === APP_LOCALES.GERMAN ? 'Ein neuer Einblick ist da' : 'A new insight is ready',
      body: locale === APP_LOCALES.GERMAN ? 'Öffne Youmotion, um deinen Einblick anzusehen.' : 'Open Youmotion to see your insight.',
      sound: false,
      data: { owner: INSIGHT_NOTIFICATION_OWNER, batchId: batch.id, target, fingerprint: expected },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(batch.fireAt) },
  });
}
