import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { APP_LOCALES, FEEDBACK_KINDS } from '@/constants';
import { appSettingsStore } from '@/features/settings/application/app-settings.store';
import { AppLocaleProvider } from '@/localization/app-locale-provider';
import { FeedbackScreenshotUri } from '../domain/feedback-request';
import { composeFeedbackEmail } from '../infrastructure/feedback-mail';
import { captureFeedbackScreenshot } from '../infrastructure/feedback-screenshot';
import { FeedbackOverlay } from '../ui/feedback-screen';

jest.mock('../infrastructure/feedback-mail', () => ({
  composeFeedbackEmail: jest.fn(() => Promise.resolve()),
  FeedbackMailError: class FeedbackMailError extends Error {},
}));

jest.mock('../infrastructure/feedback-screenshot', () => ({
  captureFeedbackScreenshot: jest.fn(),
}));

const mockComposeFeedbackEmail = jest.mocked(composeFeedbackEmail);
const mockCaptureFeedbackScreenshot = jest.mocked(captureFeedbackScreenshot);
const screenshotUri = FeedbackScreenshotUri.make('file:///tmp/feedback-screen.png');
const _ignoreCapture = (_uri: typeof screenshotUri) => undefined;
let finishCapture: (uri: typeof screenshotUri) => void = _ignoreCapture;
const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

function renderFeedbackOverlay() {
  return render(
    <AppLocaleProvider>
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <FeedbackOverlay />
      </SafeAreaProvider>
    </AppLocaleProvider>,
  );
}

describe('global feedback UI', () => {
  beforeEach(() => {
    mockComposeFeedbackEmail.mockReset();
    mockComposeFeedbackEmail.mockResolvedValue(undefined);
    mockCaptureFeedbackScreenshot.mockReset();
    mockCaptureFeedbackScreenshot.mockResolvedValue(screenshotUri);
    finishCapture = _ignoreCapture;
    appSettingsStore.trigger.languageChanged({ locale: APP_LOCALES.ENGLISH });
  });

  it('explains that the user reviews the message before choosing a kind', async () => {
    const screen = await renderFeedbackOverlay();

    await fireEvent.press(screen.getByTestId('feedback-button'));
    expect(screen.getByText('How can we help?')).toBeTruthy();
    expect(screen.getByText(/review and send the message yourself/)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('feedback-cancel'));
    expect(screen.queryByTestId('feedback-dialog')).toBeNull();
    expect(screen.getByTestId('feedback-button')).toBeTruthy();
  });

  it('does not occupy the iOS native modal presentation slot', async () => {
    expect(Platform.OS).toBe('ios');
    const screen = await renderFeedbackOverlay();

    await fireEvent.press(screen.getByTestId('feedback-button'));

    expect(JSON.stringify(screen.toJSON())).not.toContain('RCTModalHostView');
    expect(screen.getByTestId('feedback-dialog')).toBeTruthy();
  });

  it('closes when the user presses outside the dialog', async () => {
    const screen = await renderFeedbackOverlay();

    await fireEvent.press(screen.getByTestId('feedback-button'));
    await fireEvent.press(screen.getByTestId('feedback-backdrop', { includeHiddenElements: true }));

    expect(screen.queryByTestId('feedback-dialog')).toBeNull();
    expect(screen.getByTestId('feedback-button')).toBeTruthy();
  });

  it('asks for separate screenshot consent and can continue without capture', async () => {
    const screen = await renderFeedbackOverlay();

    await fireEvent.press(screen.getByTestId('feedback-button'));
    await fireEvent.press(screen.getByTestId('feedback-question'));
    expect(screen.getByText('Attach this screen?')).toBeTruthy();
    expect(screen.getByText(/private feelings or reflections/)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('feedback-without-screenshot'));
    await waitFor(() => expect(mockComposeFeedbackEmail).toHaveBeenCalledWith({
      kind: FEEDBACK_KINDS.QUESTION,
      screenshotUri: null,
    }));
    expect(mockCaptureFeedbackScreenshot).not.toHaveBeenCalled();
  });

  it('hides its controls during an explicitly approved capture', async () => {
    mockCaptureFeedbackScreenshot.mockImplementation(() => new Promise((resolve) => {
      finishCapture = resolve;
    }));
    const screen = await renderFeedbackOverlay();

    await fireEvent.press(screen.getByTestId('feedback-button'));
    await fireEvent.press(screen.getByTestId('feedback-send'));
    await fireEvent.press(screen.getByTestId('feedback-attach-screenshot'));

    expect(screen.queryByTestId('feedback-dialog')).toBeNull();
    expect(screen.queryByTestId('feedback-button')).toBeNull();
    expect(screen.getByTestId('feedback-capturing')).toBeTruthy();

    finishCapture(screenshotUri);
    await waitFor(() => expect(mockComposeFeedbackEmail).toHaveBeenCalledWith({
      kind: FEEDBACK_KINDS.FEEDBACK,
      screenshotUri,
    }));
  });

  it('shows capture failure and supports cancellation', async () => {
    mockCaptureFeedbackScreenshot.mockRejectedValueOnce(new Error('capture failed'));
    const screen = await renderFeedbackOverlay();

    await fireEvent.press(screen.getByTestId('feedback-button'));
    await fireEvent.press(screen.getByTestId('feedback-send'));
    await fireEvent.press(screen.getByTestId('feedback-attach-screenshot'));

    await waitFor(() => expect(screen.getByText('That did not work.')).toBeTruthy());
    expect(screen.getByText('The screenshot could not be created.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('feedback-error-cancel'));
    expect(screen.getByTestId('feedback-button')).toBeTruthy();
  });

  it('renders the consent flow in German', async () => {
    await act(() => appSettingsStore.trigger.languageChanged({ locale: APP_LOCALES.GERMAN }));
    const screen = await renderFeedbackOverlay();

    await fireEvent.press(screen.getByTestId('feedback-button'));
    expect(screen.getByText('Wie können wir helfen?')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('feedback-question'));
    expect(screen.getByText('Diesen Bildschirm anhängen?')).toBeTruthy();
    expect(screen.getByText(/persönliche Gefühle oder Reflexionen/)).toBeTruthy();
  });
});
