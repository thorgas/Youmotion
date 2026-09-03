import * as Schema from 'effect/Schema';

import { FEEDBACK_FAILURE_REASONS, FEEDBACK_KINDS, FILE_URI_PREFIX } from '@/constants';

export const FeedbackKindSchema = Schema.Literal(
  FEEDBACK_KINDS.QUESTION,
  FEEDBACK_KINDS.FEEDBACK,
);

export type FeedbackKind = typeof FeedbackKindSchema.Type;

export const FeedbackFailureReasonSchema = Schema.Literal(
  FEEDBACK_FAILURE_REASONS.SCREENSHOT,
  FEEDBACK_FAILURE_REASONS.EMAIL_UNAVAILABLE,
  FEEDBACK_FAILURE_REASONS.EMAIL_COMPOSE,
);

export type FeedbackFailureReason = typeof FeedbackFailureReasonSchema.Type;

export const FeedbackScreenshotUri = Schema.String.pipe(
  Schema.startsWith(FILE_URI_PREFIX),
  Schema.brand('FeedbackScreenshotUri'),
);

export type FeedbackScreenshotUri = typeof FeedbackScreenshotUri.Type;

export function parseFeedbackScreenshotUri(uri: string) {
  const fileUri = uri.startsWith('/') ? `${FILE_URI_PREFIX}${uri}` : uri;
  return Schema.decodeUnknown(FeedbackScreenshotUri)(fileUri);
}

export interface FeedbackEmailRequest {
  readonly kind: FeedbackKind;
  readonly screenshotUri: FeedbackScreenshotUri | null;
}
