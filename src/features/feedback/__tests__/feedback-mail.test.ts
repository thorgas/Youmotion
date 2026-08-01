import * as MailComposer from 'expo-mail-composer';

import { FEEDBACK_EMAIL_RECIPIENT, FEEDBACK_KINDS } from '@/constants';
import { FeedbackScreenshotUri } from '../domain/feedback-request';
import { composeFeedbackEmail, FeedbackMailError } from '../infrastructure/feedback-mail';

jest.mock('expo-mail-composer', () => ({
  isAvailableAsync: jest.fn(),
  composeAsync: jest.fn(),
  MailComposerStatus: { SENT: 'sent' },
}));

const mockIsAvailable = jest.mocked(MailComposer.isAvailableAsync);
const mockCompose = jest.mocked(MailComposer.composeAsync);

describe('feedback mail adapter', () => {
  beforeEach(() => {
    mockIsAvailable.mockReset();
    mockIsAvailable.mockResolvedValue(true);
    mockCompose.mockReset();
    mockCompose.mockResolvedValue({ status: MailComposer.MailComposerStatus.SENT });
  });

  it('addresses a question and includes only non-identifying release metadata', async () => {
    await composeFeedbackEmail({ kind: FEEDBACK_KINDS.QUESTION, screenshotUri: null });

    expect(mockCompose).toHaveBeenCalledWith(expect.objectContaining({
      recipients: [FEEDBACK_EMAIL_RECIPIENT],
      subject: 'Question about Youmotion',
      body: expect.stringContaining('App version:'),
    }));
    expect(mockCompose.mock.calls[0]?.[0].attachments).toBeUndefined();
    expect(mockCompose.mock.calls[0]?.[0].body).not.toContain('device ID');
  });

  it('attaches exactly the explicitly supplied temporary screenshot', async () => {
    const screenshotUri = FeedbackScreenshotUri.make('file:///tmp/feedback.png');

    await composeFeedbackEmail({ kind: FEEDBACK_KINDS.FEEDBACK, screenshotUri });

    expect(mockCompose).toHaveBeenCalledWith(expect.objectContaining({
      recipients: [FEEDBACK_EMAIL_RECIPIENT],
      subject: 'Feedback for Youmotion',
      attachments: [screenshotUri],
    }));
  });

  it('returns an expected unavailable failure without opening the composer', async () => {
    mockIsAvailable.mockResolvedValue(false);

    await expect(composeFeedbackEmail({
      kind: FEEDBACK_KINDS.FEEDBACK,
      screenshotUri: null,
    })).rejects.toMatchObject({
      _tag: 'FeedbackMailError',
      reason: 'unavailable',
    } satisfies Partial<FeedbackMailError>);
    expect(mockCompose).not.toHaveBeenCalled();
  });

  it('wraps availability and composition defects as expected failures', async () => {
    mockIsAvailable.mockRejectedValueOnce(new Error('availability defect'));
    await expect(composeFeedbackEmail({
      kind: FEEDBACK_KINDS.FEEDBACK,
      screenshotUri: null,
    })).rejects.toMatchObject({ reason: 'unavailable' });

    mockIsAvailable.mockResolvedValueOnce(true);
    mockCompose.mockRejectedValueOnce(new Error('compose defect'));
    await expect(composeFeedbackEmail({
      kind: FEEDBACK_KINDS.FEEDBACK,
      screenshotUri: null,
    })).rejects.toMatchObject({ reason: 'compose' });
  });
});
