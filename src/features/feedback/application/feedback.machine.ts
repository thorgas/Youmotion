import * as Schema from 'effect/Schema';
import { setup } from 'xstate';

import {
  FEEDBACK_EVENTS,
  FEEDBACK_FAILURE_REASONS,
  FEEDBACK_STATES,
} from '@/constants';
import {
  FeedbackFailureReasonSchema,
  FeedbackKindSchema,
  FeedbackScreenshotUri,
} from '../domain/feedback-request';
import { composeFeedbackEmail, FeedbackMailError } from '../infrastructure/feedback-mail';
import { captureFeedbackScreenshot } from '../infrastructure/feedback-screenshot';

const EmptyEventSchema = Schema.standardSchemaV1(Schema.Struct({}));
const FeedbackContextSchema = Schema.Struct({
  kind: Schema.NullOr(FeedbackKindSchema),
  screenshotUri: Schema.NullOr(FeedbackScreenshotUri),
  failureReason: Schema.NullOr(FeedbackFailureReasonSchema),
});

function emailFailureReason(cause: unknown) {
  return cause instanceof FeedbackMailError && cause.reason === 'unavailable'
    ? FEEDBACK_FAILURE_REASONS.EMAIL_UNAVAILABLE
    : FEEDBACK_FAILURE_REASONS.EMAIL_COMPOSE;
}

export const feedbackMachine = setup({
  states: {
    [FEEDBACK_STATES.IDLE]: {},
    [FEEDBACK_STATES.CHOOSING_KIND]: {},
    [FEEDBACK_STATES.CHOOSING_SCREENSHOT]: {},
    [FEEDBACK_STATES.CAPTURING_SCREENSHOT]: {},
    [FEEDBACK_STATES.COMPOSING_EMAIL]: {},
    [FEEDBACK_STATES.FAILURE]: {},
  },
  schemas: {
    context: Schema.standardSchemaV1(FeedbackContextSchema),
    events: {
      [FEEDBACK_EVENTS.OPENED]: EmptyEventSchema,
      [FEEDBACK_EVENTS.KIND_SELECTED]: Schema.standardSchemaV1(
        Schema.Struct({ kind: FeedbackKindSchema }),
      ),
      [FEEDBACK_EVENTS.SCREENSHOT_INCLUDED]: EmptyEventSchema,
      [FEEDBACK_EVENTS.SCREENSHOT_SKIPPED]: EmptyEventSchema,
      [FEEDBACK_EVENTS.SCREENSHOT_CAPTURED]: Schema.standardSchemaV1(
        Schema.Struct({ uri: FeedbackScreenshotUri }),
      ),
      [FEEDBACK_EVENTS.OPERATION_FAILED]: Schema.standardSchemaV1(
        Schema.Struct({ reason: FeedbackFailureReasonSchema }),
      ),
      [FEEDBACK_EVENTS.COMPLETED]: EmptyEventSchema,
      [FEEDBACK_EVENTS.RETRIED]: EmptyEventSchema,
      [FEEDBACK_EVENTS.CANCELLED]: EmptyEventSchema,
    },
  },
}).createMachine({
  id: 'feedback',
  initial: FEEDBACK_STATES.IDLE,
  context: {
    kind: null,
    screenshotUri: null,
    failureReason: null,
  },
  on: {
    [FEEDBACK_EVENTS.CANCELLED]: {
      target: `.${FEEDBACK_STATES.IDLE}`,
      context: {
        kind: null,
        screenshotUri: null,
        failureReason: null,
      },
    },
  },
  states: {
    [FEEDBACK_STATES.IDLE]: {
      on: {
        [FEEDBACK_EVENTS.OPENED]: { target: FEEDBACK_STATES.CHOOSING_KIND },
      },
    },
    [FEEDBACK_STATES.CHOOSING_KIND]: {
      on: {
        [FEEDBACK_EVENTS.KIND_SELECTED]: {
          target: FEEDBACK_STATES.CHOOSING_SCREENSHOT,
          context: ({ event }) => ({ kind: event.kind }),
        },
      },
    },
    [FEEDBACK_STATES.CHOOSING_SCREENSHOT]: {
      on: {
        [FEEDBACK_EVENTS.SCREENSHOT_INCLUDED]: {
          target: FEEDBACK_STATES.CAPTURING_SCREENSHOT,
        },
        [FEEDBACK_EVENTS.SCREENSHOT_SKIPPED]: {
          target: FEEDBACK_STATES.COMPOSING_EMAIL,
        },
      },
    },
    [FEEDBACK_STATES.CAPTURING_SCREENSHOT]: {
      entry: ({ self }, enq) => {
        enq(() => {
          void captureFeedbackScreenshot().then(
            (uri) => self.send({ type: FEEDBACK_EVENTS.SCREENSHOT_CAPTURED, uri }),
            () => self.send({
              type: FEEDBACK_EVENTS.OPERATION_FAILED,
              reason: FEEDBACK_FAILURE_REASONS.SCREENSHOT,
            }),
          );
        });
      },
      on: {
        [FEEDBACK_EVENTS.SCREENSHOT_CAPTURED]: {
          target: FEEDBACK_STATES.COMPOSING_EMAIL,
          context: ({ event }) => ({ screenshotUri: event.uri }),
        },
        [FEEDBACK_EVENTS.OPERATION_FAILED]: {
          target: FEEDBACK_STATES.FAILURE,
          context: ({ event }) => ({ failureReason: event.reason }),
        },
      },
    },
    [FEEDBACK_STATES.COMPOSING_EMAIL]: {
      entry: ({ context, self }, enq) => {
        enq(() => {
          if (context.kind === null) {
            self.send({
              type: FEEDBACK_EVENTS.OPERATION_FAILED,
              reason: FEEDBACK_FAILURE_REASONS.EMAIL_COMPOSE,
            });
            return;
          }
          void composeFeedbackEmail({
            kind: context.kind,
            screenshotUri: context.screenshotUri,
          }).then(
            () => self.send({ type: FEEDBACK_EVENTS.COMPLETED }),
            (cause: unknown) => self.send({
              type: FEEDBACK_EVENTS.OPERATION_FAILED,
              reason: emailFailureReason(cause),
            }),
          );
        });
      },
      on: {
        [FEEDBACK_EVENTS.COMPLETED]: {
          target: FEEDBACK_STATES.IDLE,
          context: {
            kind: null,
            screenshotUri: null,
            failureReason: null,
          },
        },
        [FEEDBACK_EVENTS.OPERATION_FAILED]: {
          target: FEEDBACK_STATES.FAILURE,
          context: ({ event }) => ({ failureReason: event.reason }),
        },
      },
    },
    [FEEDBACK_STATES.FAILURE]: {
      on: {
        [FEEDBACK_EVENTS.RETRIED]: ({ context }) => ({
          target: context.failureReason === FEEDBACK_FAILURE_REASONS.SCREENSHOT
            ? FEEDBACK_STATES.CAPTURING_SCREENSHOT
            : FEEDBACK_STATES.COMPOSING_EMAIL,
          context: { failureReason: null },
        }),
      },
    },
  },
});
