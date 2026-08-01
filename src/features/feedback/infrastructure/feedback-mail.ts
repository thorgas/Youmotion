import * as Schema from 'effect/Schema';
import Constants from 'expo-constants';
import * as MailComposer from 'expo-mail-composer';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

import {
  FEEDBACK_EMAIL_RECIPIENT,
  FEEDBACK_KINDS,
} from '@/constants';
import type { FeedbackEmailRequest } from '../domain/feedback-request';

export class FeedbackMailError extends Schema.TaggedError<FeedbackMailError>()(
  'FeedbackMailError',
  {
    reason: Schema.Literal('unavailable', 'compose'),
    cause: Schema.Defect,
  },
) {}

function feedbackSubject(kind: FeedbackEmailRequest['kind']) {
  return kind === FEEDBACK_KINDS.QUESTION
    ? 'Question about Youmotion'
    : 'Feedback for Youmotion';
}

function feedbackBody(request: FeedbackEmailRequest) {
  const appVersion = Constants.expoConfig?.version ?? 'unknown';
  const updateChannel = Updates.channel ?? 'embedded';
  const updateId = Updates.updateId ?? 'embedded';
  const screenshot = request.screenshotUri === null
    ? 'Not attached'
    : 'Attached with explicit consent';

  return [
    'Please write your message above this line.',
    '',
    '--- Youmotion app information ---',
    `App version: ${appVersion}`,
    `Platform: ${Platform.OS}`,
    `Update channel: ${updateChannel}`,
    `Update ID: ${updateId}`,
    `Screenshot: ${screenshot}`,
  ].join('\n');
}

export async function composeFeedbackEmail(request: FeedbackEmailRequest) {
  let available: boolean;
  try {
    available = await MailComposer.isAvailableAsync();
  } catch (cause) {
    throw FeedbackMailError.make({ reason: 'unavailable', cause });
  }
  if (!available) {
    throw FeedbackMailError.make({
      reason: 'unavailable',
      cause: new Error('No configured email app is available.'),
    });
  }

  const attachment = request.screenshotUri === null
    ? {}
    : { attachments: [request.screenshotUri] };
  try {
    await MailComposer.composeAsync({
      recipients: [FEEDBACK_EMAIL_RECIPIENT],
      subject: feedbackSubject(request.kind),
      body: feedbackBody(request),
      ...attachment,
    });
  } catch (cause) {
    throw FeedbackMailError.make({ reason: 'compose', cause });
  }
}
