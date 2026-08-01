import { createActor, waitFor } from 'xstate';

import {
  FEEDBACK_EVENTS,
  FEEDBACK_FAILURE_REASONS,
  FEEDBACK_KINDS,
  FEEDBACK_STATES,
} from '@/constants';
import { feedbackMachine } from '../application/feedback.machine';
import { FeedbackScreenshotUri } from '../domain/feedback-request';
import { composeFeedbackEmail } from '../infrastructure/feedback-mail';
import { captureFeedbackScreenshot } from '../infrastructure/feedback-screenshot';

jest.mock('../infrastructure/feedback-mail', () => ({
  composeFeedbackEmail: jest.fn(() => Promise.resolve()),
  FeedbackMailError: class FeedbackMailError extends Error {},
}));

jest.mock('../infrastructure/feedback-screenshot', () => ({
  captureFeedbackScreenshot: jest.fn(),
}));

const mockComposeFeedbackEmail = jest.mocked(composeFeedbackEmail);
const mockCaptureFeedbackScreenshot = jest.mocked(captureFeedbackScreenshot);
const screenshotUri = FeedbackScreenshotUri.make('file:///tmp/youmotion-feedback.png');

function startQuestionFlow() {
  const actor = createActor(feedbackMachine).start();
  actor.send({ type: FEEDBACK_EVENTS.OPENED });
  actor.send({ type: FEEDBACK_EVENTS.KIND_SELECTED, kind: FEEDBACK_KINDS.QUESTION });
  return actor;
}

describe('feedback flow model', () => {
  beforeEach(() => {
    mockComposeFeedbackEmail.mockReset();
    mockComposeFeedbackEmail.mockResolvedValue(undefined);
    mockCaptureFeedbackScreenshot.mockReset();
    mockCaptureFeedbackScreenshot.mockResolvedValue(screenshotUri);
  });

  it('opens a question email without capturing when the screenshot is skipped', async () => {
    const actor = startQuestionFlow();

    actor.send({ type: FEEDBACK_EVENTS.SCREENSHOT_SKIPPED });
    await waitFor(actor, (snapshot) => snapshot.matches(FEEDBACK_STATES.IDLE));

    expect(mockCaptureFeedbackScreenshot).not.toHaveBeenCalled();
    expect(mockComposeFeedbackEmail).toHaveBeenCalledWith({
      kind: FEEDBACK_KINDS.QUESTION,
      screenshotUri: null,
    });
    actor.stop();
  });

  it('captures only after consent and passes the temporary file to the composer', async () => {
    const actor = startQuestionFlow();

    actor.send({ type: FEEDBACK_EVENTS.SCREENSHOT_INCLUDED });
    await waitFor(actor, (snapshot) => snapshot.matches(FEEDBACK_STATES.IDLE));

    expect(mockCaptureFeedbackScreenshot).toHaveBeenCalledTimes(1);
    expect(mockComposeFeedbackEmail).toHaveBeenCalledWith({
      kind: FEEDBACK_KINDS.QUESTION,
      screenshotUri,
    });
    actor.stop();
  });

  it('does not open email after a failed capture and can retry the capture', async () => {
    mockCaptureFeedbackScreenshot.mockRejectedValueOnce(new Error('capture failed'));
    const actor = startQuestionFlow();

    actor.send({ type: FEEDBACK_EVENTS.SCREENSHOT_INCLUDED });
    await waitFor(actor, (snapshot) => snapshot.matches(FEEDBACK_STATES.FAILURE));

    expect(actor.getSnapshot().context).toMatchObject({
      failureReason: FEEDBACK_FAILURE_REASONS.SCREENSHOT,
    });
    expect(mockComposeFeedbackEmail).not.toHaveBeenCalled();

    actor.send({ type: FEEDBACK_EVENTS.RETRIED });
    await waitFor(actor, (snapshot) => snapshot.matches(FEEDBACK_STATES.IDLE));
    expect(mockCaptureFeedbackScreenshot).toHaveBeenCalledTimes(2);
    expect(mockComposeFeedbackEmail).toHaveBeenCalledWith({
      kind: FEEDBACK_KINDS.QUESTION,
      screenshotUri,
    });
    actor.stop();
  });

  it('retains a captured screenshot when retrying the email composer', async () => {
    mockComposeFeedbackEmail.mockRejectedValueOnce(new Error('composer failed'));
    const actor = startQuestionFlow();

    actor.send({ type: FEEDBACK_EVENTS.SCREENSHOT_INCLUDED });
    await waitFor(actor, (snapshot) => snapshot.matches(FEEDBACK_STATES.FAILURE));
    expect(actor.getSnapshot().context).toMatchObject({
      failureReason: FEEDBACK_FAILURE_REASONS.EMAIL_COMPOSE,
      screenshotUri,
    });

    actor.send({ type: FEEDBACK_EVENTS.RETRIED });
    await waitFor(actor, (snapshot) => snapshot.matches(FEEDBACK_STATES.IDLE));
    expect(mockCaptureFeedbackScreenshot).toHaveBeenCalledTimes(1);
    expect(mockComposeFeedbackEmail).toHaveBeenCalledTimes(2);
    actor.stop();
  });

  it('cancels from both user choice steps without starting runtime work', () => {
    const actor = createActor(feedbackMachine).start();

    actor.send({ type: FEEDBACK_EVENTS.OPENED });
    actor.send({ type: FEEDBACK_EVENTS.CANCELLED });
    expect(actor.getSnapshot().matches(FEEDBACK_STATES.IDLE)).toBe(true);

    actor.send({ type: FEEDBACK_EVENTS.OPENED });
    actor.send({ type: FEEDBACK_EVENTS.KIND_SELECTED, kind: FEEDBACK_KINDS.FEEDBACK });
    actor.send({ type: FEEDBACK_EVENTS.CANCELLED });
    expect(actor.getSnapshot().matches(FEEDBACK_STATES.IDLE)).toBe(true);
    expect(mockCaptureFeedbackScreenshot).not.toHaveBeenCalled();
    expect(mockComposeFeedbackEmail).not.toHaveBeenCalled();
    actor.stop();
  });
});
