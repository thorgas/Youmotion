import * as Schema from 'effect/Schema';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';
import assert from '@/assert';

import {
  REMINDER_EVENTS,
  REMINDER_NOTIFICATION_OWNER,
  REMINDER_TARGET_KINDS,
} from '@/constants';
import { BeliefSystemId } from '@/features/check-in/domain/belief-statement';
import { ReminderAssignmentId } from '../domain/reminder-assignment';

const PulsePayloadSchema = Schema.Struct({
  owner: Schema.Literal(REMINDER_NOTIFICATION_OWNER),
  assignmentId: ReminderAssignmentId,
  fingerprint: Schema.String,
  targetKind: Schema.Literal(REMINDER_TARGET_KINDS.PULSE),
});
const GuidingBeliefPayloadSchema = Schema.Struct({
  owner: Schema.Literal(REMINDER_NOTIFICATION_OWNER),
  assignmentId: ReminderAssignmentId,
  fingerprint: Schema.String,
  targetKind: Schema.Literal(REMINDER_TARGET_KINDS.GUIDING_BELIEF),
  beliefSystemId: BeliefSystemId,
});
const ReminderNotificationPayloadSchema = Schema.Union(
  PulsePayloadSchema,
  GuidingBeliefPayloadSchema,
);
type ReminderNotificationPayload = typeof ReminderNotificationPayloadSchema.Type;
type ReminderNotificationEvent =
  | { type: typeof REMINDER_EVENTS.RECONCILE_REQUESTED }
  | {
      type: typeof REMINDER_EVENTS.NOTIFICATION_OPENED;
      assignmentId: typeof ReminderAssignmentId.Type;
      targetKind: typeof REMINDER_TARGET_KINDS.PULSE;
    }
  | {
      type: typeof REMINDER_EVENTS.NOTIFICATION_OPENED;
      assignmentId: typeof ReminderAssignmentId.Type;
      targetKind: typeof REMINDER_TARGET_KINDS.GUIDING_BELIEF;
      beliefSystemId: typeof BeliefSystemId.Type;
    };
type ReminderActor = { send: (event: ReminderNotificationEvent) => void };

let actor: ReminderActor | undefined;
let pending: ReminderNotificationPayload | undefined;
let installed = false;
let lastFingerprint: string | undefined;

function eventForPayload(payload: ReminderNotificationPayload): ReminderNotificationEvent {
  return payload.targetKind === REMINDER_TARGET_KINDS.PULSE
    ? {
        type: REMINDER_EVENTS.NOTIFICATION_OPENED,
        assignmentId: payload.assignmentId,
        targetKind: payload.targetKind,
      }
    : {
        type: REMINDER_EVENTS.NOTIFICATION_OPENED,
        assignmentId: payload.assignmentId,
        targetKind: payload.targetKind,
        beliefSystemId: payload.beliefSystemId,
      };
}

function handlePayload(data: unknown) {
  const result = Schema.decodeUnknownEither(ReminderNotificationPayloadSchema)(data);
  if (result._tag === 'Left') return;
  const payload = result.right;
  assert(payload.assignmentId.length > 0, 'Decoded reminder payload must identify an assignment');
  assert(payload.fingerprint.length > 0, 'Decoded reminder payload must have a fingerprint');
  if (lastFingerprint === payload.fingerprint) return;
  lastFingerprint = payload.fingerprint;
  if (!actor) {
    pending = payload;
    return;
  }
  actor.send(eventForPayload(payload));
}

function handleResponse(response: Notifications.NotificationResponse | null) {
  if (!response) return;
  assert(response.notification.request.identifier.length > 0, 'Notification response must identify its request');
  assert(response.actionIdentifier.length > 0, 'Notification response must identify its action');
  handlePayload(response.notification.request.content.data);
}

export function installReminderNotificationBridge() {
  if (installed) return;
  installed = true;
  assert(installed, 'Reminder notification bridge must mark itself installed');
  assert(pending === undefined || pending.fingerprint.length > 0, 'Pending reminder payload must have a fingerprint');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  handleResponse(Notifications.getLastNotificationResponse());
  Notifications.addNotificationResponseReceivedListener(handleResponse);
  AppState.addEventListener('change', (state) => {
    if (state !== 'active') return;
    actor?.send({ type: REMINDER_EVENTS.RECONCILE_REQUESTED });
  });
}

export function bindReminderNotificationActor(nextActor: ReminderActor) {
  actor = nextActor;
  assert(actor === nextActor, 'Reminder bridge must retain the bound actor');
  assert(pending === undefined || pending.assignmentId.length > 0, 'Pending reminder payload must identify an assignment');
  if (!pending) return;
  const payload = pending;
  pending = undefined;
  assert(pending === undefined, 'Delivered reminder payload must be cleared');
  assert(actor === nextActor, 'Delivering a pending payload must preserve the bound actor');
  actor.send(eventForPayload(payload));
}
