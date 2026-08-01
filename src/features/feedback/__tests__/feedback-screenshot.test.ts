import { captureScreen } from 'react-native-view-shot';

import { captureFeedbackScreenshot, FeedbackScreenshotError } from '../infrastructure/feedback-screenshot';

jest.mock('react-native-view-shot', () => ({ captureScreen: jest.fn() }));

const mockCaptureScreen = jest.mocked(captureScreen);

describe('feedback screenshot adapter', () => {
  beforeEach(() => {
    mockCaptureScreen.mockReset();
    mockCaptureScreen.mockResolvedValue('/tmp/feedback.png');
    jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('waits for feedback UI removal and returns an internal temporary file URI', async () => {
    await expect(captureFeedbackScreenshot()).resolves.toBe('file:///tmp/feedback.png');
    expect(globalThis.requestAnimationFrame).toHaveBeenCalledTimes(2);
    expect(mockCaptureScreen).toHaveBeenCalledWith({ format: 'png', result: 'tmpfile' });
  });

  it('preserves a file URI returned by the native module', async () => {
    mockCaptureScreen.mockResolvedValue('file:///tmp/native-feedback.png');
    await expect(captureFeedbackScreenshot()).resolves.toBe('file:///tmp/native-feedback.png');
  });

  it('models capture and URI parsing failures as expected errors', async () => {
    mockCaptureScreen.mockRejectedValueOnce(new Error('capture defect'));
    await expect(captureFeedbackScreenshot()).rejects.toBeInstanceOf(FeedbackScreenshotError);

    mockCaptureScreen.mockResolvedValueOnce('https://example.com/not-internal.png');
    await expect(captureFeedbackScreenshot()).rejects.toBeInstanceOf(FeedbackScreenshotError);
  });
});
